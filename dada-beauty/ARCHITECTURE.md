# Architecture

## Vue d'ensemble

```
Navigateur (site public / admin)
   │  Server Components + Server Actions (Next.js 16, App Router)
   ▼
Next.js sur Vercel ── proxy.ts (session Supabase, protection /admin)
   │  supabase-js : clé anon + session de l'utilisateur → RLS
   │  clé service_role : uniquement webhooks de paiement, upload des devis, tâche planifiée, script propriétaire
   ▼
Supabase : PostgreSQL 16 (RLS, fonctions SECURITY DEFINER), Auth, Storage
```

**Principe :** les opérations sensibles se vérifient **dans PostgreSQL**. Cela couvre les prix, les créneaux,
le stock, les paiements, les permissions et les transitions de statut. Le frontend et les Server Actions ne font
que valider le format (Zod) et appeler des fonctions RPC. Aucune valeur financière transmise par le navigateur
n'est prise en compte.

## Stack

| Couche | Choix |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict |
| Style | Tailwind CSS 4 (design system dans `src/app/globals.css`), Lucide, police Cormorant Garamond + DM Sans |
| Données | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Validation | Zod 4 |
| Graphiques | Recharts (palette validée daltonisme/contraste, `src/components/admin/charts.tsx`) |
| Tests | Vitest (unitaires), tests SQL (`supabase/tests`), Playwright (E2E) |

Les bibliothèques shadcn/ui, Framer Motion, GSAP et React Hook Form n'ont pas été ajoutées volontairement. Des
composants maison, des animations CSS et `useActionState` (React 19) suffisent, avec moins de dépendances.

## Arborescence

```
src/
  app/
    (site)/            pages publiques : accueil, prestations, galerie, boutique, panier, reserver, suivi, evenements, avis/[token], légal
    admin/connexion/   connexion, réinitialisation, retour des liens email (confirmer/route.ts)
    admin/(app)/       espace équipe (layout = vérification dashboard.view + navigation filtrée)
      rendez-vous, devis, prestations, clientes, equipe, produits, stocks, commandes, caisse,
      paiements, depenses, statistiques (+ export CSV), fidelite, avis, galerie, notifications,
      parametres (+ configuration), journal
    api/paiements/initier         initiation d'un paiement en ligne (503 tant qu'aucun fournisseur n'est configuré)
    api/paiements/webhook/[provider]  webhooks signés des fournisseurs (Wave)
    api/cron/rappels               tâche quotidienne : rappels des rendez-vous du lendemain
    sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx
  components/  ui/ (design system), site/, booking/, shop/, admin/ (+ admin/system/)
  lib/         env, auth (contexte équipe + permissions), supabase/ (server, public, admin, browser),
               validation (Zod), errors (codes base → messages FR), format (FCFA, fuseau Dakar), phone,
               payments/ (abstraction fournisseurs), notifications/ (modèles, WhatsApp)
  server/      catalog.ts (lecture publique), public-actions.ts (réservation, commande, devis, avis),
               auth-actions.ts, admin/* (actions de l'espace équipe par domaine)
  proxy.ts     rafraîchissement de session + redirection /admin → /admin/connexion
supabase/
  migrations/  schéma versionné (ordre chronologique)
  seed.sql     données de référence sûres pour la production (rôles, permissions, catégories, prestations « à configurer »)
  demo/        données fictives, environnement de démonstration uniquement
  tests/       tests SQL + stub Supabase local
```

## Flux clés

**Réservation publique.** Le parcours appelle `fetchSlots` puis la RPC `get_available_slots`, qui croise les
horaires du salon, le planning de l'employée, ses congés, les fermetures et les rendez-vous existants. Ensuite
`submitBooking` appelle `create_public_booking`, qui recalcule prix et acompte, revérifie le créneau, applique
la limite anti-abus et insère le rendez-vous. La **contrainte d'exclusion GiST** garantit l'absence de
chevauchement, même avec des requêtes simultanées : le test `supabase/tests/concurrency.sh` lance 12 réservations
du même créneau et une seule réussit.

**Commande boutique.** `create_public_order` verrouille les variantes, lit les prix en base, réserve le stock
par mouvement `order_reserved` et calcule le total. Une annulation remet le stock une seule fois.

**Paiements :**
1. **Manuel** : l'équipe saisit un paiement réellement reçu via `record_payment`, avec idempotence. Une caisse ouverte est obligatoire pour les espèces.
2. **En ligne** : `/api/paiements/initier` vérifie la propriété (référence + téléphone ou code de suivi), puis `create_provider_payment` calcule le montant en base. Le fournisseur renvoie vers sa page de paiement. Ensuite `/api/paiements/webhook/wave` vérifie la signature et appelle `confirm_provider_payment` (idempotent, contrôle du montant).

Rien n'est marqué payé côté navigateur.

**Notifications :**
- **Internes** : la table `notifications` est alimentée par la base (réservation, commande, devis, avis, paiement en ligne).
- **Clientes** : envoi automatique via l'API WhatsApp si elle est configurée. Sinon, l'équipe utilise des liens wa.me pré-remplis depuis la fiche, et chaque ouverture est tracée dans `message_log`.
- **Rappels** : la tâche Vercel Cron `/api/cron/rappels` tourne chaque jour à 17:00 UTC, soit 17:00 à Dakar, et traite les rendez-vous du lendemain. Elle est protégée par `CRON_SECRET`. Sans API WhatsApp, elle journalise `not_configured` et crée une notification interne listant les rappels à envoyer à la main.

## Fuseau et monnaie

- **Fuseau :** `Africa/Dakar` (UTC+0, sans heure d'été). Les dates sont stockées en `timestamptz` et affichées avec `Intl` dans ce fuseau.
- **Monnaie :** montants en **FCFA (XOF) entiers** (`bigint`), jamais de flottants.

# Dada Beauty — plateforme de l'institut

Site public, réservation en ligne, boutique et outil de gestion de **Dada Beauty**, institut de beauté à
Guédiawaye (secteur Deux Boulangeries, Dakar, Sénégal). Conçu et développé par **TOUBA TECH**.

> Application autonome dans le dossier `dada-beauty/` du dépôt `toubatech`. Le site TOUBA TECH, à la racine du dépôt, n'est pas modifié.
> Sur Vercel, créez un **projet séparé** avec **Root Directory = `dada-beauty`**.

## Ce que fait la plateforme

| Espace | Fonctions |
|---|---|
| Site public (mobile-first) | Accueil, prestations, galerie, boutique, à propos, contact, mentions légales |
| Réservation | Parcours en 10 étapes, créneaux **réellement disponibles** calculés en base, prévention des doubles réservations par PostgreSQL, consultation et annulation par référence + téléphone |
| Événements | Demande de devis (mariage, baptême, anniversaire, cérémonie, domicile), photos d'inspiration |
| Boutique | Catalogue, variantes, panier, commande **sans compte**, retrait ou livraison, suivi de commande |
| Administration `/admin` | Tableau de bord, rendez-vous (jour, semaine, mois), clientes (CRM), équipe et plannings, prestations, produits et stocks, commandes, caisse, paiements, dépenses, statistiques, fidélité, avis, galerie, notifications, paramètres, journal d'audit |
| Sécurité | RLS sur toutes les tables, 5 rôles, permissions vérifiées **en base**, journal d'audit, limitation anti-abus |

## Démarrage local

```bash
cd dada-beauty
cp .env.example .env.local        # renseigner Supabase (voir ENVIRONMENT.md)
npm ci
npm run dev                       # http://localhost:3000
```

Sans variables Supabase, le site s'affiche en mode « configuration en cours » : aucune donnée n'est inventée.

## Qualité

```bash
npm run typecheck     # next typegen + tsc strict
npm run lint
npm test              # Vitest (tests unitaires)
npm run test:db       # migrations + tests SQL sur un PostgreSQL local jetable (PGHOST/PGUSER/PGPASSWORD)
npm run build
npm run test:e2e      # Playwright, après un build (360/390/430 px, tablette, desktop)
```

La CI GitHub Actions (`.github/workflows/dada-beauty-ci.yml`) exécute l'ensemble à chaque modification de `dada-beauty/**`.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) : organisation du code et flux principaux
- [DATABASE.md](./DATABASE.md) : modèle de données, fonctions et règles métier
- [SECURITY.md](./SECURITY.md) : rôles, permissions, RLS et règles de paiement
- [DEPLOYMENT.md](./DEPLOYMENT.md) : Supabase, Vercel, environnements, sauvegardes
- [ENVIRONMENT.md](./ENVIRONMENT.md) : variables d'environnement
- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) : guide de la responsable
- [CHANGELOG.md](./CHANGELOG.md)

## État honnête du projet (v0.1.0)

**Opérationnel dès que Supabase est configuré :** site, réservation avec disponibilités réelles, commandes,
administration, paiements **saisis par l'équipe** (espèces, Wave ou Orange Money reçus et vérifiés), caisse,
stocks, statistiques et rôles.

**Reste à fournir ou à activer :**

- **Données métier :** les tarifs, durées, horaires, l'équipe et les photos ne sont pas inventés. Les prestations sont au statut « à configurer » (affichées « Tarif sur demande »).
- **Wave (paiement en ligne) :** l'adaptateur `src/lib/payments/wave.ts` a été écrit d'après la documentation publique connue, **sans pouvoir la consulter** (docs.wave.com était inaccessible depuis l'environnement de développement). Il faut le valider avec un compte Wave Business en test avant toute ouverture aux clientes. Tant que les clés sont absentes, aucun paiement en ligne n'est proposé.
- **Orange Money en ligne :** pas encore implémenté. Il faut le contrat marchand et la documentation de l'API.
- **WhatsApp Business Platform :** l'adaptateur est prêt, mais il faut un compte Meta, un numéro vérifié et des modèles de messages approuvés. En attendant, l'équipe envoie les messages via des liens WhatsApp pré-remplis, tracés dans le journal des messages.
- **Codes promo sur la réservation en ligne :** les codes s'appliquent dans la boutique et en caisse, pas encore à l'acompte d'une réservation en ligne.
- **Mentions légales :** NINEA, RCCM, responsable de publication et durées de conservation sont à compléter (signalés « à compléter » sur le site).
- **Recette sur le projet Supabase (22/11/2026) :**
  - les 12 migrations sont appliquées ;
  - les 8 suites de tests SQL passent sur la vraie base, dans des transactions annulées ;
  - un parcours navigateur complet a été validé contre la vraie base : commande en ligne avec code promo, connexion équipe, vente d'une carte cadeau, vente en caisse avec code promo payée par carte cadeau, encaissement d'une commande par carte cadeau, registre Fidélité. Les données de test ont été supprimées ensuite ;
  - deuxième parcours validé contre la vraie base :
    - réservation en ligne complète (10 étapes, acompte de 30 %) ;
    - deux réservations simultanées du même créneau : une seule est acceptée ;
    - ouverture de caisse, acompte en espèces, démarrage puis fin du rendez-vous, solde par Wave ;
    - vente en espèces, retrait, clôture avec écart (27 500 attendus, 27 000 comptés, −500) ;
  - **restent à vérifier à la main :** l'envoi d'images (galerie, devis) et les invitations par email (SMTP).

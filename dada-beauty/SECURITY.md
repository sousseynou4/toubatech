# Sécurité

## Principes

1. **Tout est fermé par défaut.** RLS sur toutes les tables, privilèges révoqués puis accordés explicitement, `EXECUTE` sur les fonctions révoqué par défaut (y compris pour les futures fonctions).
2. **Les permissions sont vérifiées en base**, pas seulement masquées dans l'interface :
   - `has_permission()` est utilisée dans les politiques RLS ;
   - `require_permission()` est appelée dans chaque fonction sensible ;
   - les Server Actions revérifient avec `assertPermission()`, en défense en profondeur.
3. **Aucune valeur financière du navigateur n'est crue.** Prix, acomptes, totaux, frais de livraison et montants à payer sont recalculés en base.
4. **La clé `service_role`** (qui contourne la RLS) n'est utilisée que côté serveur :
   - webhooks de paiement ;
   - upload des photos d'inspiration des devis ;
   - tâche planifiée des rappels ;
   - script de création du compte propriétaire.

   Elle n'est jamais préfixée `NEXT_PUBLIC_`.

## Rôles et permissions

Source : `supabase/seed.sql`. ✓ = accordé.

| Permission | super_admin | owner | manager | sales | staff |
|---|:-:|:-:|:-:|:-:|:-:|
| dashboard.view | ✓ | ✓ | ✓ | ✓ | ✓ |
| appointments.view_all / appointments.manage | ✓ | ✓ | ✓ | | |
| appointments.update_own (démarrer/terminer ses RDV) | ✓ | ✓ | ✓ | | ✓ |
| services.manage | ✓ | ✓ | ✓ | | |
| customers.view / customers.manage | ✓ | ✓ | ✓ | ✓ | |
| customers.delete | ✓ | ✓ | | | |
| team.manage | ✓ | ✓ | ✓ | | |
| products.view / products.manage / inventory.manage | ✓ | ✓ | ✓ | ✓ | |
| orders.view / orders.manage | ✓ | ✓ | ✓ | ✓ | |
| pos.use | ✓ | ✓ | ✓ | ✓ | |
| pos.discount | ✓ | ✓ | ✓ | | |
| pos.override_price | ✓ | ✓ | | | |
| payments.view / payments.manage | ✓ | ✓ | ✓ | ✓ | |
| payments.refund | ✓ | ✓ | | | |
| cash.manage / expenses.manage | ✓ | ✓ | ✓ | | |
| analytics.view | ✓ | ✓ | ✓ | | |
| gallery.manage / quotes.manage / reviews.manage | ✓ | ✓ | ✓ | | |
| loyalty.manage | ✓ | ✓ | | | |
| notifications.view | ✓ | ✓ | ✓ | ✓ | ✓ |
| settings.manage / users.manage / audit.view | ✓ | ✓ | | | |

**Ce que voit une employée (staff) :**
- uniquement ses rendez-vous ;
- les clientes liées à ses rendez-vous ;
- son propre profil.

Elle n'a accès ni aux finances, ni aux autres clientes, ni aux paramètres.

**Garde-fous sur les rôles** (trigger `guard_profile_role`) :
- personne ne modifie son propre rôle ;
- seul un super_admin attribue ou retire le rôle super_admin ;
- seul owner ou super_admin gère le rôle owner.

Les changements de rôle sont audités.

## Comptes

- **Aucune inscription publique :** à désactiver dans Supabase Auth.
- **Compte propriétaire :** créé par `scripts/create-owner.mjs` (invitation ou lien à usage unique, **aucun mot de passe codé en dur**).
- **Membres de l'équipe :** invités depuis l'administration (Équipe → comptes) par un utilisateur ayant `users.manage`.
- **Mot de passe :** 12 caractères minimum lors de la définition. La réinitialisation est sans énumération des comptes.

## Données publiques et anti-abus

- **Ce que lit l'anonyme :** paramètres, horaires, catégories, prestations non inactives, produits actifs en ligne, médias publiés, avis approuvés.
- **Écritures publiques :** uniquement via des fonctions `SECURITY DEFINER` qui valident chaque champ :
  - réservation ;
  - commande ;
  - devis ;
  - avis par jeton ;
  - annulation par référence + téléphone.
- **Limitation de débit en base** (`check_rate_limit`) :
  - par téléphone ;
  - par empreinte client (IP hachée avec `RATE_LIMIT_SALT`, jamais stockée en clair) ;
  - nombre maximal de demandes en attente par téléphone.
- **Consultation d'une réservation ou d'une commande :** référence + téléphone (ou code de suivi aléatoire).
- **Uploads :**
  - devis : type MIME (JPEG, PNG, WEBP), 5 Mo maximum, 5 fichiers maximum, bucket privé, upload serveur ;
  - médias du site : bucket public limité à 8 Mo et aux types image, écriture réservée à `gallery.manage` / `products.manage`.
- **Export CSV :** les cellules commençant par `= + - @` sont neutralisées (injection de formules).

## Paiements

- Un paiement n'est « réussi » que s'il est :
  - **saisi par un membre autorisé** de l'équipe (argent réellement reçu et vérifié) ;
  - ou **confirmé par un webhook signé** : signature HMAC vérifiée, horodatage limité à 5 minutes, idempotence par identifiant d'événement, **contrôle du montant attendu**.
- Les paiements en ligne restent désactivés (503) tant que les clés du fournisseur ne sont pas configurées.
- Le remboursement est réservé à `payments.refund`, plafonné, avec motif obligatoire, et audité.

## Données personnelles et consentements

- `marketing_consent` et `photo_consent` sont horodatés automatiquement.
- Aucune photo de cliente ne doit être publiée sans `photo_consent`. Le média peut être lié à la fiche via `customer_consent_id`.
- Les messages commerciaux sont réservés aux clientes ayant consenti. Les messages de service (confirmation, rappel) restent autorisés.
- Cadre légal : loi sénégalaise n° 2008-12 sur les données personnelles. Les durées de conservation sont **à définir** par Dada Beauty (voir la politique de confidentialité).

## En-têtes et divers

- `X-Frame-Options: DENY`, `nosniff`, HSTS, `Referrer-Policy` et `Permissions-Policy` (`next.config.ts`).
- `noindex` et `no-store` sur `/admin` (`vercel.json`).
- Tâche planifiée protégée par `CRON_SECRET` (comparaison à temps constant).

## Signaler une faille

Contacter TOUBA TECH en privé. Ne pas ouvrir de ticket public.

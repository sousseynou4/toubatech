# Base de données

Les migrations versionnées sont dans `supabase/migrations/` et s'appliquent par ordre chronologique.
Les données de référence sont dans `supabase/seed.sql`. Ce fichier est idempotent et sans aucune donnée inventée.

## Conventions

- **Montants :** `bigint`, en **FCFA (XOF) entiers**. Le XOF n'a pas de subdivision et aucun flottant n'est utilisé. La devise est `business_settings.currency = 'XOF'`.
- **Dates :** `timestamptz`. Les jours se calculent dans `Africa/Dakar` (fonction `local_date()`).
- **Identifiants :** `uuid`. Les références lisibles suivent le format `RDV-AAMMJJ-XXXXX`, `CMD-…`, `PAY-…` ou `DEV-…` (fonction `gen_reference`).
- **Téléphones :** normalisés en E.164 par `normalize_phone()`, avec `+221` par défaut. Ils servent de clé d'unicité des clientes.
- **Statut de configuration :** `config_status` vaut `to_configure`, `active` ou `inactive`. Une prestation ne peut être `active` sans prix ni durée (contrainte `services_active_requires_config`).
- **RLS :** activée sur **toutes** les tables (voir SECURITY.md).

## Tables par domaine

| Domaine | Tables |
|---|---|
| Système | `business_settings` (ligne unique), `roles`, `permissions`, `role_permissions`, `profiles` (1:1 `auth.users`), `audit_logs`, `rate_limits` |
| Catalogue & équipe | `service_categories`, `services`, `employees`, `employee_services`, `business_hours`, `business_closures`, `employee_schedules` (plusieurs plages par jour, les trous sont les pauses), `employee_time_off` (`tstzrange`), `media_assets` |
| Clientes & rendez-vous | `customers` (consentements marketing/photo horodatés), `appointments`, `appointment_services` (instantané prix/durée), `appointment_events` (historique) |
| Boutique & stock | `suppliers`, `product_categories`, `products`, `product_images`, `product_variants` (porte le stock), `stock_movements` (immuables), `orders` (canal `online` ou `pos`), `order_items`, `order_events` |
| Finance | `payments`, `payment_events` (webhooks, unicité fournisseur + événement), `cash_sessions` (une seule ouverte à la fois), `cash_transactions` (immuables), `expenses` |
| Relation client | `reviews` (vérifiés via jeton de rendez-vous terminé), `loyalty_accounts`, `loyalty_transactions`, `promotions`, `gift_cards`, `gift_card_transactions`, `event_quotes` |
| Communication | `notifications`, `notification_reads`, `message_log` |

Le stockage (Supabase Storage) comprend deux espaces :
- `media` : public, photos du site.
- `quote-inspirations` : privé, photos des devis, envoyées uniquement par le serveur.

## Règles métier garanties par la base

1. **Pas de double réservation.** La contrainte d'exclusion `appointments_no_overlap` (GiST, extension `btree_gist`) porte sur `(employee_id, tstzrange(start_at, block_end_at))` pour les statuts `pending`, `confirmed`, `deposit_paid` et `in_progress`. `block_end_at` inclut le temps de préparation (`buffer_minutes`).
2. **Créneaux réels.** `get_available_slots(service, date, employée?)` croise :
   - les horaires du salon et le planning de chaque employée habilitée ;
   - les congés et fermetures exceptionnelles ;
   - les rendez-vous existants ;
   - le délai minimum et l'horizon de réservation ;
   - le pas des créneaux défini dans les paramètres.
3. **Machine à états des rendez-vous** (`set_appointment_status`) : seules les transitions autorisées passent. `deposit_paid` exige un acompte réellement encaissé. Une employée ne peut que démarrer ou terminer ses propres rendez-vous.
4. **Stock uniquement par mouvements.** `stock_quantity` ne peut pas être modifié directement (trigger). Chaque mouvement est historisé, immuable, et ne peut pas rendre le stock négatif. Un ajustement ou une perte exige une note. L'annulation d'une commande remet le stock une seule fois (`stock_released`).
5. **Paiements :**
   - `paid_amount` est recalculé : paiements réussis moins remboursements.
   - Pas de trop-perçu.
   - Idempotence par `idempotency_key`.
   - Espèces : une caisse ouverte est obligatoire, et chaque mouvement est inscrit en caisse.
   - Le remboursement est plafonné et exige un motif.
6. **Fidélité :** des points sont attribués une seule fois, uniquement à un rendez-vous **terminé et intégralement payé**, jamais à une absence (`award_appointment_loyalty`).
7. **Codes promo** (`evaluate_promotion`, `consume_promotion`) :
   - la remise est calculée en base sur les prix réels, en pourcentage (arrondi à l'inférieur) ou en montant fixe plafonné au montant éligible ;
   - les contrôles portent sur la période, le minimum d'achat (sur le montant éligible), le périmètre et le nombre maximum d'utilisations (ligne verrouillée) ;
   - l'annulation ou le remboursement d'une commande rend l'utilisation une seule fois (`promotion_released`) ;
   - en caisse, la remise manuelle s'ajoute au code et reste soumise à `pos.discount`.
8. **Cartes cadeaux :**
   - le solde ne change que par `gift_card_transactions` (émission, utilisation, remboursement), registre immuable ;
   - un trigger interdit toute autre modification du solde, du montant ou du code ;
   - à l'utilisation (`redeem_gift_card`), la carte est verrouillée, puis son état, son expiration et son solde sont vérifiés ;
   - un paiement `gift_card` référence toujours sa carte (`payments.gift_card_id`) ;
   - une vente en espèces entre en caisse (`gift_card_sale`).
9. **Audit :** des triggers `audit_trigger` journalisent les modifications de rendez-vous, paiements, commandes, produits, variantes, prestations, profils, rôles et permissions, paramètres, horaires, caisse, dépenses, cartes cadeaux et devis.

## Fonctions (RPC) principales

| Accès | Fonctions |
|---|---|
| Public (anon) | `get_available_slots`, `public_service_employees`, `create_public_booking`, `get_public_booking`, `cancel_public_booking`, `create_public_order`, `track_order`, `submit_review`, `create_event_quote` |
| Équipe (authenticated, permission vérifiée dans la fonction) | `staff_create_appointment`, `set_appointment_status`, `reschedule_appointment`, `update_appointment_notes`, `set_order_status`, `record_stock_movement`, `record_payment`, `refund_payment`, `open_cash_session`, `close_cash_session`, `cash_movement`, `record_expense`, `pos_checkout`, `adjust_loyalty`, `dashboard_overview`, `analytics_*`, `admin_search` |
| Serveur uniquement (service_role) | `create_provider_payment`, `attach_provider_checkout`, `confirm_provider_payment` |

## Définitions financières (statistiques)

| Indicateur | Définition |
|---|---|
| CA prestations | Rendez-vous **terminés**, à leur date de fin, plus les prestations vendues en caisse |
| CA produits | Lignes produit des commandes livrées et des ventes en caisse |
| Encaissements | Paiements réussis (hors remboursements), à leur date |
| Acomptes détenus | Acomptes encaissés sur des rendez-vous non terminés. **Ce n'est pas du CA.** |
| Résultat estimé | CA net − coût des marchandises vendues (instantané `unit_cost`) − dépenses |

## Tests

`npm run test:db` (`scripts/db-test.sh`) crée une base jetable, installe un stub minimal de Supabase (rôles
`anon`, `authenticated` et `service_role`, plus `auth.uid()`), puis applique migrations et seed. Il exécute
ensuite `supabase/tests/*.sql` et le test de concurrence. **Ne jamais le pointer vers une base réelle** : la base
de test est supprimée.

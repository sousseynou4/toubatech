# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Versionnage sémantique.

## [0.2.0] — 2026-11-22

### Ajouté
- **Codes promo appliqués automatiquement** dans la boutique en ligne (champ « Code promo » du panier) et en caisse.
  - La remise est recalculée par la base sur les prix réels. Elle respecte la période, le minimum d'achat, le périmètre (prestations ou produits) et le nombre maximum d'utilisations.
  - Une utilisation est rendue si la commande est annulée ou remboursée.
  - Les frais de livraison ne sont pas remisés.
- **Cartes cadeaux utilisables comme moyen de paiement**, en caisse (paiement fractionné possible) et à l'encaissement d'un rendez-vous ou d'une commande.
  - Le solde est vérifié et débité de façon atomique.
  - Un remboursement recrédite la carte.
- **Vente de cartes cadeaux** depuis la Caisse ou le menu Fidélité. Une carte vendue en espèces entre dans la caisse. Une carte offerte exige un motif et la permission Fidélité.
- Registre immuable des mouvements de carte cadeau (`gift_card_transactions`). Il est affiché dans le menu Fidélité.
- Migration `20261121001400_promotions_gift_cards.sql` et suite de tests SQL `25_promotions_gift_cards.sql`.

### Corrigé (trouvé pendant la recette sur Supabase)
- Réservation : quand le créneau était pris par une autre cliente au même moment, la cliente refusée revenait au choix de l'heure **sans message**, et le créneau restait affiché. Le message s'affiche maintenant, et les disponibilités sont rechargées.
- Caisse : après la clôture, le récapitulatif (attendu, compté, écart) disparaissait aussitôt. La page affiche désormais la dernière clôture et son écart.

### Sécurité
- Le solde d'une carte cadeau et le compteur d'utilisations d'un code ne sont plus modifiables directement : privilèges par colonne et trigger de garde.
- L'aperçu public d'un code promo est limité à 20 essais par heure et par client.

## [0.1.0] — 2026-11-21

### Ajouté
- **Base de données** (Supabase/PostgreSQL 16), avec 9 migrations versionnées :
  - paramètres, rôles et permissions, profils, audit ;
  - catalogue, équipe, horaires, congés ;
  - clientes et rendez-vous, avec contrainte d'exclusion anti-chevauchement ;
  - boutique et stocks par mouvements ;
  - paiements, caisse et dépenses ;
  - avis, fidélité, promotions, cartes cadeaux, devis, notifications ;
  - statistiques ;
  - RLS et privilèges, Storage.
- **Seeds :** seed de référence sans données inventées, et seed de démonstration protégé par un garde-fou.
- **Tests SQL :** réservations (créneaux, chevauchements, congés, fermetures, statuts, reports), 12 réservations simultanées, boutique et stock, paiements, caisse, remboursements, fidélité, webhooks, statistiques, contrôle d'accès.
- **Site public** mobile-first, au design rose poudré, nude, champagne et or :
  - accueil, prestations, galerie, boutique, à propos, contact, pages légales ;
  - SEO local (métadonnées, Open Graph, sitemap, robots, données structurées BeautySalon et Product), manifest PWA.
- **Réservation en ligne** en 10 étapes, sur disponibilités réelles. Consultation et annulation par référence + téléphone.
- **Devis événementiels** avec photos d'inspiration (bucket privé).
- **Boutique :** panier, commande sans compte, retrait ou livraison, suivi de commande.
- **Espace équipe `/admin` :**
  - connexion Supabase Auth, navigation filtrée par permissions, recherche globale, notifications ;
  - tableau de bord (KPI et graphiques sur données réelles) ;
  - rendez-vous (vues jour, semaine, mois et liste, fiche, statuts, report, encaissement, messages WhatsApp) ;
  - modules prestations, clientes, équipe, produits, stocks, commandes, caisse, paiements, dépenses ;
  - statistiques (exports CSV et impression PDF), fidélité, avis, galerie, devis ;
  - paramètres et configuration initiale, journal d'audit.
- **Paiements :** couche d'abstraction des fournisseurs, adaptateur Wave (à valider), initiation et webhook idempotents.
- **Tâche planifiée** de rappels de rendez-vous (WhatsApp Cloud API si configurée, sinon rappels manuels listés).
- **Outillage :** script de création du compte propriétaire, CI GitHub Actions, documentation.

### Limites connues
- Wave : l'adaptateur n'a pas été vérifié contre la documentation officielle (inaccessible pendant le développement). Il faut le tester en staging.
- Orange Money en ligne : non implémenté (contrat marchand requis).
- WhatsApp Cloud API : nécessite un compte Meta et des modèles approuvés.
- Codes promo et cartes cadeaux : non appliqués automatiquement en caisse ni en ligne (corrigé en 0.2.0).
- Photos, tarifs, durées, horaires et mentions légales (NINEA, RCCM) à fournir par Dada Beauty.

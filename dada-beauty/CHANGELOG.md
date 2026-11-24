# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Versionnage sémantique.

## [0.6.1] — 2026-11-24

### Amélioré
- **Vidéos TikTok plus fluides à l'ouverture.** Le lecteur de TikTok télécharge environ 1,6 Mo (scripts et polices) avant même la vidéo ; sur mobile, l'attente se voyait comme un cadre noir.
  - Un indicateur « Chargement depuis TikTok… » s'affiche jusqu'à ce que le lecteur soit prêt.
  - Une seule vidéo est ouverte à la fois : en lancer une ferme la précédente, qui cesse de se télécharger et de partager la connexion.

## [0.6.0] — 2026-11-24

### Ajouté
- **Profil TikTok du salon dans la galerie** (section « Sur TikTok », sous le filtre « Tout »).
  - Le site affiche le cadre officiel de TikTok : l'en-tête du compte et ses dernières vidéos, mis à jour par TikTok, sans coller les liens un par un.
  - Il s'active dès que le lien du profil est renseigné dans Paramètres → TikTok (par exemple https://www.tiktok.com/@aidasamb949).
  - Comme pour les vidéos, rien n'est chargé depuis TikTok avant le clic de la visiteuse.
  - La hauteur du cadre suit la mise en page de TikTok selon la largeur de l'écran.

### Vérifié
- Lecture réelle d'une vidéo du compte @aidasamb949 dans le lecteur du site : elle va jusqu'au bout.
- Affichage du profil (abonnés, vidéos) sur téléphone et sur ordinateur.
- Aucune requête vers TikTok avant le clic.

### Modifié
- Lecteurs TikTok : ajout de `allow-popups-to-escape-sandbox`, pour que « Ouvrir TikTok » ouvre une page normale.
- Le cadre de profil n'utilise pas le script `embed.js` de TikTok : sa bibliothèque a renvoyé une erreur 404 depuis un de ses serveurs lors des tests.

## [0.5.0] — 2026-11-24

### Corrigé (trouvé en recette sur le projet Supabase)
- **Envoi de photos.** Toute photo de plus de 1 Mo était refusée par le serveur (« Body exceeded 1 MB limit »), soit la plupart des photos de téléphone. Le bouton tournait puis une page d'erreur s'affichait. Cela touchait :
  - la galerie ;
  - les photos de prestation, de catégorie et de produit ;
  - les photos d'inspiration des devis.

  Désormais :
  - les photos sont allégées dans le navigateur avant l'envoi (2048 px au plus, WebP ou JPEG), ce qui retire aussi la position GPS du téléphone ;
  - la galerie envoie les grosses séries en plusieurs fois ;
  - la limite d'une requête passe à 4 Mo, sous le plafond de 4,5 Mo de Vercel ;
  - un envoi qui échoue affiche un message au lieu d'une page d'erreur.
- **Invitations de l'équipe.** Le lien reçu menait à « lien invalide » : Supabase place la session dans le fragment `#access_token`, que le serveur ne voit pas. La page de confirmation transmet maintenant ce fragment à la page « nouveau mot de passe ».

### Ajouté
- **Invitation par lien à transmettre** (menu Équipe → comptes) :
  - le lien, à usage unique et valable 1 heure, pointe vers le site ;
  - un bouton l'envoie sur WhatsApp, un autre le copie ;
  - cela marche sans service d'envoi d'emails ;
  - le script `create-owner.mjs --link` produit le même format de lien.
- Modèles d'emails en français (invitation, réinitialisation) dans `supabase/templates/`. Supabase n'accepte de les appliquer qu'une fois le SMTP configuré : voir DEPLOYMENT.md.
- Tests unitaires `image-prep.test.ts` et `auth-links.test.ts`.

## [0.4.0] — 2026-11-22

### Ajouté
- **Codes promo sur les réservations en ligne.** La cliente saisit son code au récapitulatif. Elle voit aussitôt le prix, la remise, le total et l'acompte, tous calculés en base.
  - L'acompte est recalculé sur le montant remisé : par exemple 15 000 − 20 % = 12 000, et un acompte de 30 % fait 3 600 au lieu de 4 500.
  - La remise et le code apparaissent sur la confirmation, sur le suivi « Suivre une réservation » et sur la fiche rendez-vous de l'admin.
  - Une annulation, par la cliente ou par l'équipe, rend l'utilisation du code, une seule fois.
  - Un code refusé (épuisé, expiré, minimum non atteint, réservé aux produits) bloque la réservation sans prendre le créneau.
  - Les statistiques déduisent ces remises du chiffre d'affaires net : les prestations restent comptées au prix catalogue.
- Migration `20261122000200_booking_promotions.sql`, tests SQL `27_booking_promotions.sql`.

## [0.3.0] — 2026-11-22

### Ajouté
- **Vidéos TikTok dans la galerie.**
  - Dans Admin → Galerie & médias → « Vidéos TikTok », l'équipe colle le lien d'une vidéo et choisit un titre, une catégorie, un ordre et la publication.
  - Le site affiche une section « En vidéo » qui suit les filtres de la galerie.
  - La lecture passe par le lecteur officiel TikTok, chargé seulement au clic : aucun script ni cookie TikTok avant que la visiteuse lance la vidéo.
  - Aucune vidéo n'est copiée ni hébergée.
- Les liens courts de l'application (vm.tiktok.com…) sont résolus côté serveur, sans jamais quitter les domaines TikTok.
- Migration `20261122000100_social_videos.sql`, tests SQL `26_social_videos.sql`, tests unitaires `tiktok.test.ts`.

### Corrigé
- **Admin → Galerie, Devis et Statistiques :** des constantes (catégories de médias, statuts de devis, couleurs des graphiques) étaient importées côté serveur depuis des modules client. La page Galerie plantait, et les libellés pouvaient être vides. Ces constantes sont déplacées dans `src/lib/media.ts` et `src/lib/chart-colors.ts`, et un test (`client-boundary.test.ts`) bloque toute récidive.

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

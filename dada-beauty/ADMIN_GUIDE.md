# Guide de la responsable — Dada Beauty

Ce guide explique, pas à pas, comment utiliser l'espace équipe : **https://<votre-domaine>/admin**.
Tout fonctionne aussi sur téléphone : le menu s'ouvre avec ☰, et la barre du bas donne accès à l'Accueil,
au Planning, à la Caisse et aux Clientes.

## 1. Première connexion

1. Vous recevez un email d'invitation (ou un lien remis par TOUBA TECH).
2. Cliquez sur le lien, puis choisissez un mot de passe d'au moins 12 caractères.
3. Connectez-vous sur `/admin/connexion`. En cas d'oubli : « Mot de passe oublié ? ».

## 2. Configuration initiale (indispensable)

Ouvrez **Paramètres → Configuration initiale**. La liste indique ce qui manque. Rien n'a été inventé : tant
qu'une prestation n'a pas de prix ni de durée, le site affiche « Tarif sur demande » et elle ne se réserve pas en
ligne.

1. **Horaires** (Paramètres → Horaires) : cochez les jours ouverts et indiquez les heures. Ajoutez les fermetures exceptionnelles (Tabaski, congés…).
2. **Prestations** (menu Prestations) : pour chaque prestation, saisissez le prix (FCFA), la durée et le temps de préparation. Passez-la ensuite en **Active**. Vous pouvez aussi définir un acompte propre et des conditions.
3. **Équipe** (menu Équipe) : créez chaque employée, cochez les prestations qu'elle réalise et saisissez son planning. Pour une pause, mettez deux plages, par exemple 09:00–13:00 et 14:00–19:00.
4. **Réservation** (Paramètres → Réservation) : choisissez le pas des créneaux, le délai minimum, la politique d'acompte et la politique d'annulation.
5. **Paiements** (Paramètres → Paiements) : cochez les moyens acceptés et indiquez vos numéros marchands Wave et Orange Money. Ils sont affichés aux clientes pour les acomptes.
6. **Photos** (menu Galerie) : importez vos photos. Les visuels « Photo à venir » disparaissent à mesure que vous les remplacez.
7. **Carte** (Paramètres → Identité) : collez le lien Google Maps « Intégrer une carte » du salon.
8. Cliquez sur **« Marquer la configuration comme terminée »**.

## 3. Gérer les rendez-vous

- Les nouvelles demandes du site arrivent **« En attente »**. Une notification apparaît (cloche).
- Ouvrez le rendez-vous, puis :
  1. Cliquez sur **Confirmer**.
  2. Ouvrez **Messages WhatsApp → Confirmation** : le message s'ouvre dans WhatsApp, prêt à envoyer.
- **Acompte :**
  1. Quand la cliente a payé, cliquez sur **Encaisser** et choisissez le type « Acompte » et le moyen (espèces, Wave, Orange Money avec la référence de transaction).
  2. Le statut passe automatiquement à « Acompte payé ».
- **Le jour J :**
  1. Cliquez sur **Démarrer**, puis **Terminer**.
  2. Encaissez le solde.
  3. Les points de fidélité sont attribués automatiquement si la prestation est entièrement payée.
- **Reporter :** choisissez une nouvelle date ou heure, et éventuellement une autre employée. Le système refuse tout chevauchement.
- **Annuler** (avec un motif) ou **Absente** : le créneau se libère immédiatement.
- **Nouveau rendez-vous** (téléphone, WhatsApp, sur place) : bouton « Nouveau rendez-vous ».
- **Planning :** vues Jour (par employée), Semaine, Mois et Liste, avec filtres par employée, prestation et statut, et recherche par nom ou téléphone.
- **Rappels :** chaque jour à 17 h, la plateforme prépare les rappels du lendemain. Sans connexion à l'API WhatsApp, une notification liste les clientes à prévenir : envoyez le rappel depuis la fiche (bouton « Rappel »).

## 4. Devis événementiels

Le menu **Devis** contient les demandes de mariages, baptêmes, etc., avec les photos d'inspiration. Passez la
demande à « Contactée », puis saisissez votre proposition (montant, détails) et suivez son acceptation.

## 5. Caisse

1. **Le matin :** Caisse → **Ouvrir la caisse** avec le fond de caisse.
2. **Vente :** ajoutez des produits ou des prestations, choisissez la cliente (facultatif), puis saisissez les paiements (espèces et/ou Wave, Orange Money). Le total doit correspondre exactement. Le stock se met à jour automatiquement.
3. **Sorties d'argent :** dépenses en espèces, retraits et apports sont enregistrés et apparaissent dans le calcul de la caisse.
4. **Le soir :** **Clôturer la caisse** en saisissant l'argent réellement compté. L'écart avec le montant attendu est calculé et conservé.

> Les acomptes reçus ne sont pas du chiffre d'affaires : ils deviennent du CA quand la prestation est terminée.
> Les statistiques les distinguent.

## 6. Paiements et remboursements

Le menu **Paiements** donne l'historique complet. Un remboursement est réservé à la propriétaire : il faut un
motif, et le montant est plafonné au paiement d'origine. Un remboursement en espèces nécessite une caisse ouverte.

## 7. Produits, stocks et commandes

- **Produits :**
  - informations, photo, catégorie, fournisseur ;
  - **variantes** (longueur, teinte…) avec prix d'achat, prix de vente et seuil d'alerte ;
  - visibilité en ligne.
- **Stocks :**
  - une réception fournisseur s'enregistre en « Entrée » ;
  - une casse en « Perte », avec une note ;
  - une erreur d'inventaire en « Ajustement », avec une note.

  On ne modifie jamais un chiffre de stock directement : tout est historisé. Les produits sous le seuil
  apparaissent dans le tableau de bord.
- **Commandes :**
  - Les commandes en ligne arrivent « En attente » et le stock est réservé.
  - Faites-les avancer : Confirmée, puis En préparation, puis Prête à retirer ou Expédiée, puis Livrée.
  - Encaissez depuis la commande. Une annulation remet le stock en place.
  - Prévenez la cliente via les messages WhatsApp pré-remplis.

## 8. Clientes

- **Fiche cliente :**
  - coordonnées et préférences, notes internes (jamais visibles par la cliente) ;
  - historique des rendez-vous, achats et paiements ;
  - points de fidélité.
- **Consentements :** cochez « accepte les offres » ou « accepte la publication de photos » **uniquement après
  accord explicite** de la cliente. Sans consentement photo, ne publiez aucune photo d'elle.

## 9. Équipe et accès

| Rôle | Accès |
|---|---|
| Propriétaire | Tout, y compris paramètres, comptes, remboursements et journal d'audit |
| Manager | Gestion du salon, de la caisse et des statistiques. Pas de comptes, pas de remboursements, pas de paramètres. |
| Ventes | Produits, stocks, commandes, caisse, paiements |
| Employée | Ses rendez-vous uniquement (démarrer et terminer) |

Pour inviter une personne, passez par le menu Équipe, à la gestion des comptes. Désactivez le compte d'une
personne qui quitte le salon.

## 10. Statistiques

Le menu **Statistiques** permet de choisir une période (7 j, 30 j, ce mois, mois dernier, 12 mois ou
personnalisée). On y trouve :
- CA prestations et CA produits, remises, encaissements, acomptes détenus ;
- dépenses, coût des marchandises, marge, résultat estimé ;
- taux d'annulation et d'absence ;
- prestations et produits les plus vendus, performance de l'équipe, rotation des stocks.

Pour exporter : boutons **CSV** (s'ouvrent dans Excel) ou **Imprimer / PDF**.

## 11. Fidélité, avis, galerie

- **Fidélité :**
  - les points s'activent dans Paramètres → Fidélité ;
  - **codes promo :**
    - ils se créent dans le menu Fidélité ;
    - la cliente les saisit dans son panier, et l'équipe les saisit en caisse (« Code promo » → Appliquer) ;
    - la remise est calculée automatiquement ;
    - si une commande est annulée, l'utilisation du code est rendue ;
  - **cartes cadeaux :**
    - pour les vendre : Caisse → « Vendre une carte cadeau », ou menu Fidélité. Le code est généré automatiquement ;
    - pour les utiliser : choisissez « Carte cadeau » comme moyen de paiement, en caisse ou dans « Encaisser », puis saisissez le code (bouton « Vérifier » pour voir le solde) ;
    - un remboursement recrédite la carte ;
    - l'historique des mouvements est dans le menu Fidélité.
- **Avis :**
  - après une prestation terminée, envoyez la « Demande d'avis » WhatsApp ;
  - les avis arrivent en modération et vous choisissez ceux qui sont publiés.
- **Galerie :** photos classées par univers. Choisissez celles du site (accueil, à propos, prestations).

## 12. Sécurité au quotidien

- Ne partagez jamais votre mot de passe. Chaque personne a son propre compte.
- Le **Journal d'audit** retrace les actions sensibles : paiements, rôles, prix, stocks…
- En cas de doute ou de besoin d'assistance : TOUBA TECH.

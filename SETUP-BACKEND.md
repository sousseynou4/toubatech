# Guide de mise en service — Backend du formulaire diagnostic

Ce guide t'accompagne pas-à-pas pour passer du prototype au formulaire 100% fonctionnel : enregistrement Supabase + email automatique au client + notification interne.

**Durée estimée : 25 minutes**

---

## ✅ Avant de commencer

Tu dois avoir :
- [ ] Le projet `toubatech` ouvert dans VS Code
- [ ] Node.js 18+ installé (`node -v` pour vérifier)
- [ ] Un compte GitHub (recommandé pour Supabase et Resend)

---

## 1️⃣ Installer les nouvelles dépendances

Dans le terminal VS Code, à la racine du projet :

```bash
npm install
```

Cela installera Supabase JS, Resend, React Email et Zod en plus du reste.

---

## 2️⃣ Créer le projet Supabase

1. Va sur **[supabase.com](https://supabase.com)** et connecte-toi avec GitHub.
2. **New project** :
   - Name : `toubatech`
   - Password : génère et **enregistre dans un gestionnaire** (1Password, Bitwarden…)
   - Region : **`West EU (Paris)`** ← important pour la latence et le RGPD
   - Plan : **Free**
3. Patiente 1-2 min pendant la création.

### Exécuter le schéma SQL

1. Dans ton projet Supabase → **SQL Editor** (icône terminal dans la sidebar)
2. **New query**
3. Ouvre `supabase/schema.sql` dans VS Code, **copie tout son contenu**
4. Colle dans le SQL Editor → **Run** (ou Ctrl/Cmd + Enter)

✓ Tu devrais voir `Success. No rows returned`. Vérifie via **Table Editor** que la table `diagnostics` existe.

### Récupérer les clés API

1. **Settings** (⚙️ en bas) → **API**
2. Copie ces 3 valeurs et garde-les côte à côte :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public** key : `eyJ...` (longue chaîne)
   - **service_role secret** key : `eyJ...` (autre longue chaîne) ⚠️ **TRÈS sensible**

---

## 3️⃣ Créer le compte Resend

1. **[resend.com](https://resend.com)** → connexion GitHub.
2. **API Keys** → **Create API Key**
   - Name : `toubatech-prod`
   - Permission : **Sending access** (suffisant)
3. Copie la clé `re_...` qui s'affiche **(elle ne sera plus jamais visible après)**.

> 💡 **Pour le dev** : Resend te laisse envoyer depuis `onboarding@resend.dev` mais SEULEMENT vers ton propre email de compte. Parfait pour tester. La configuration du domaine `toubatech.com` se fera plus tard quand tu auras le nom de domaine.

---

## 4️⃣ Configurer `.env.local` dans VS Code

1. À la racine du projet, **crée un fichier** `.env.local` (avec le point devant)
2. Copie le contenu de `.env.local.example`
3. Remplace chaque valeur :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co       # ← ta Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                     # ← ta clé anon
SUPABASE_SERVICE_ROLE_KEY=eyJ...                         # ← ta clé service_role

RESEND_API_KEY=re_...                                     # ← ta clé Resend
RESEND_FROM_EMAIL=onboarding@resend.dev                  # ← ne change pas en dev
RESEND_TEAM_NOTIFICATION_EMAIL=ton-email-perso@gmail.com # ← ton email perso
```

> ⚠️ **Important** : Resend en mode test ne peut envoyer **qu'à l'email associé à ton compte Resend**. Mets le **même email** pour `RESEND_TEAM_NOTIFICATION_EMAIL` ET pour le test côté formulaire (champ Email à l'étape 5).

---

## 5️⃣ Lancer et tester

```bash
npm run dev
```

→ Ouvre [http://localhost:3000/diagnostic](http://localhost:3000/diagnostic)

**Test complet** :
1. Remplis les 6 étapes (utilise **ton email Resend** au champ Email)
2. Soumets
3. Vérifie 3 choses :
   - ✓ L'écran de succès s'affiche avec un numéro `TT-YYMMDD-XXXX`
   - ✓ L'email arrive dans ta boîte (vérifie aussi les spams au début)
   - ✓ La ligne apparaît dans Supabase : **Table Editor → diagnostics**

Si tu reçois 2 emails (confirmation + notification interne), c'est que tout fonctionne 🎉

---

## 🛟 Dépannage rapide

| Symptôme | Cause probable | Solution |
|---|---|---|
| "Missing environment variable" | `.env.local` non lu | Redémarre le serveur dev (`Ctrl+C` puis `npm run dev`) |
| Erreur 500 à la soumission | Clé service_role mauvaise OU schéma SQL non exécuté | Vérifie les deux |
| Pas d'email reçu | Resend en test ne peut pas envoyer à n'importe qui | Utilise l'email associé à ton compte Resend |
| Email dans les spams | Normal en mode `onboarding@resend.dev` | Ce sera réglé avec le domaine `toubatech.com` |
| `validation_failed` 400 | Le payload ne respecte pas le schéma | Vérifie tous les champs requis sont remplis |

---

## 📊 Vérifier dans Supabase

**Table Editor → diagnostics** : tu vois chaque demande avec tous les détails.

**Vue d'aperçu** : exécute dans SQL Editor :
```sql
select * from diagnostics_overview;
```

Tu obtiens une vue lisible (référence, statut, appareil, contact, problèmes) pour le suivi.

---

## ➡️ Et après ?

Une fois validé, on passera à :
- **Webhook agent IA** : envoi automatique du payload à un service Python pour pré-rapport technique
- **Notifications de suivi** : "Reçu", "Diagnostic en cours", "Devis disponible", etc.
- **Domaine `toubatech.com`** : configuration DNS pour envoyer depuis `contact@toubatech.com`
- **Mini back-office** : page admin pour visualiser et faire avancer les statuts

# Variables d'environnement

Le modèle est `.env.example` : il ne contient aucune vraie clé. En local, copiez-le en `.env.local`, qui est
ignoré par Git. Sur Vercel, renseignez les variables par environnement (Production, Preview, Development).

| Variable | Secrète ? | Obligatoire | Rôle |
|---|:-:|:-:|---|
| `NEXT_PUBLIC_SITE_URL` | non | oui | URL publique sans `/` final. Sert au SEO, au sitemap, aux liens d'avis et aux redirections email. |
| `NEXT_PUBLIC_SUPABASE_URL` | non | oui | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | non (publique, protégée par la RLS) | oui | Clé anonyme Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **OUI** | oui en production | Contourne la RLS. Utilisée **uniquement côté serveur** : webhooks, upload des devis, rappels, script propriétaire. Ne jamais la préfixer `NEXT_PUBLIC_`. |
| `RATE_LIMIT_SALT` | **OUI** | recommandé | Sel de hachage des IP pour la limitation anti-abus. Chaîne aléatoire longue. |
| `CRON_SECRET` | **OUI** | oui si cron | Protège `/api/cron/rappels`. Vercel l'envoie dans `Authorization: Bearer …`. |
| `NEXT_PUBLIC_DEMO_MODE` | non | non | `true` affiche le bandeau « démonstration ». À utiliser uniquement sur l'environnement de démo. |
| `WAVE_API_KEY` | **OUI** | non | Clé API Wave Business (Checkout). Sans elle, aucun paiement Wave en ligne. |
| `WAVE_WEBHOOK_SECRET` | **OUI** | avec Wave | Secret de signature des webhooks (`wave_sn_WHS_…`). Déclarer chez Wave l'URL `https://<domaine>/api/paiements/webhook/wave` avec la stratégie **« Signing Secret »** et l'événement `checkout.session.completed` (et `checkout.session.payment_failed`, ignoré sans risque). |
| `WAVE_API_SIGNING_SECRET` | **OUI** | non (recommandé) | Si la clé API Wave est créée avec « request signing » (recommandé par Wave contre le vol de clé) : son secret de signature (`wave_sn_AKS_…`). Chaque appel à Wave est alors signé. |
| `ORANGE_MONEY_CLIENT_ID` / `_CLIENT_SECRET` / `_MERCHANT_KEY` / `_WEBHOOK_SECRET` | **OUI** | non | Réservées à la future intégration Orange Money. **Non utilisées à ce jour.** |
| `WHATSAPP_ACCESS_TOKEN` | **OUI** | non | Jeton WhatsApp Cloud API (Meta) |
| `WHATSAPP_PHONE_NUMBER_ID` | non | avec WhatsApp | Identifiant du numéro WhatsApp Business |
| `WHATSAPP_TEMPLATE_LANGUAGE` | non | non | Langue des modèles (`fr`) |

Générer un secret : `openssl rand -hex 32`.

**Ce qui dépend de chaque variable :**
- Sans variables Supabase, le site s'affiche avec les informations de base et la réservation est remplacée par un lien WhatsApp.
- Sans `SUPABASE_SERVICE_ROLE_KEY`, l'envoi de photos d'inspiration des devis est refusé (la demande peut être envoyée sans photo), les webhooks et les rappels automatiques sont inactifs.
- Le script propriétaire lit les variables via `node --env-file=.env.local …`.

## Routes serveur liées aux variables

| Route | Variables | Comportement |
|---|---|---|
| `POST /api/paiements/initier` | `SUPABASE_SERVICE_ROLE_KEY`, clés du fournisseur | 503 tant qu'aucun fournisseur n'est configuré |
| `POST /api/paiements/webhook/wave` | `WAVE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` | 401 si la signature est invalide, idempotent |
| `GET /api/cron/rappels` | `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, (WhatsApp) | Planifiée chaque jour à 17:00 UTC (= Dakar) via `vercel.json` |

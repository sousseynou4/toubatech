# Déploiement

## Environnements

| Environnement | Supabase | Vercel | Données |
|---|---|---|---|
| Development | projet local (CLI) ou projet « dev » | `npm run dev` | données de test |
| Staging / démo | projet Supabase **séparé** | Preview (branche `staging`) | seed de démonstration autorisé, `NEXT_PUBLIC_DEMO_MODE=true` |
| Production | projet Supabase **dédié** | Production (branche `main`) | **jamais de données de démonstration** |

**Règle :** aucune modification ne part en production sans avoir passé la CI (typecheck, lint, tests unitaires,
tests SQL, build, E2E) **et** sans validation en staging.

## 1. Supabase

1. Créez un projet. Choisissez de préférence la région la plus proche (Europe de l'Ouest) et notez le mot de passe de la base dans un gestionnaire de mots de passe.
2. Appliquez les migrations **dans l'ordre**, de l'une de ces deux façons :
   - **CLI :**
     ```bash
     cd dada-beauty
     supabase link --project-ref <ref>
     supabase db push
     ```
     Puis exécutez `supabase/seed.sql`.
   - **Éditeur SQL :** exécutez chaque fichier de `supabase/migrations/` par ordre de nom, puis `supabase/seed.sql`.
3. Vérifiez que les extensions `btree_gist` et `pgcrypto` sont actives (elles sont créées par la première migration).
4. Réglez Authentication :
   - **Désactivez les inscriptions publiques** (Allow new users to sign up = off).
   - Site URL : `https://<domaine>`.
   - Redirect URLs : `https://<domaine>/admin/connexion/confirmer`, plus l'URL de preview si besoin.
   - Mot de passe : 12 caractères minimum.
   - SMTP personnalisé recommandé (l'expéditeur par défaut de Supabase est limité).
   - Traduisez en français les modèles d'emails (invitation, réinitialisation).
5. Storage : les buckets `media` (public) et `quote-inspirations` (privé) et leurs politiques sont créés par la migration `…000900_storage.sql`.
6. Créez le compte propriétaire depuis un poste de confiance :
   ```bash
   node --env-file=.env.local scripts/create-owner.mjs --email proprietaire@exemple.sn --name "Prénom Nom"
   # ou --link pour obtenir un lien à usage unique au lieu d'un email
   ```
7. **Démo uniquement** (jamais en production) :
   ```bash
   psql "$DEMO_DB_URL" -c "select set_config('dada.allow_demo','on',false)" -f supabase/demo/seed_demo.sql
   ```

## 2. Vercel

1. Nouveau projet depuis le dépôt GitHub `toubatech`, avec **Root Directory = `dada-beauty`**. Le framework Next.js est détecté et `vercel.json` est fourni.
2. Renseignez les variables (voir ENVIRONMENT.md) **par environnement**. La clé service_role de production ne doit être que dans Production.
3. Domaine : ajoutez le domaine, puis mettez à jour `NEXT_PUBLIC_SITE_URL` et les URLs d'Auth Supabase.
4. **Tâche planifiée :**
   - `vercel.json` déclare `GET /api/cron/rappels` chaque jour à 17:00 UTC (17:00 à Dakar).
   - Définissez `CRON_SECRET` : Vercel l'envoie automatiquement en `Authorization: Bearer`.
   - Sans WhatsApp API, la tâche crée une notification interne listant les rappels à envoyer manuellement.
5. **Paiement Wave (quand le compte marchand est ouvert) :**
   - Renseignez `WAVE_API_KEY` et `WAVE_WEBHOOK_SECRET`.
   - Déclarez le webhook `https://<domaine>/api/paiements/webhook/wave`.
   - **Testez d'abord en staging** avec de petits montants. L'adaptateur n'a pas pu être vérifié contre la documentation officielle pendant le développement.
6. Vérifiez après chaque déploiement :
   - pages publiques ;
   - `/reserver` (créneaux affichés si au moins une prestation est active et une employée a un planning) ;
   - connexion `/admin` ;
   - en-têtes de sécurité.

## 3. CI/CD

`.github/workflows/dada-beauty-ci.yml` se déclenche sur chaque push ou pull request touchant `dada-beauty/**`.
Il exécute npm ci, typecheck, lint, Vitest et le build, puis Playwright. Les migrations et tests SQL tournent sur
un conteneur PostgreSQL 16, avec un essai du seed de démonstration sur une base jetable.

Workflow conseillé :
1. Branche de fonctionnalité → PR → CI verte → preview Vercel.
2. Fusion sur `staging`, puis recette.
3. Fusion sur `main`, qui déploie la production.
4. Migrations : appliquez-les **d'abord en staging**, puis en production **avant** de déployer le code qui en dépend.

## 4. Sauvegardes et restauration

- **Automatique :** Supabase fait des sauvegardes quotidiennes (selon l'offre). Activez le **PITR** (restauration à un instant donné) si le plan le permet.
- **Export manuel régulier** (hebdomadaire conseillé, conservé hors de Supabase et chiffré) :
  ```bash
  pg_dump "$PROD_DB_URL" --format=custom --no-owner --no-privileges --file=dada-beauty-$(date +%F).dump
  ```
  Les photos (Storage) se sauvegardent à part, via l'API Storage ou la CLI.
- **Restauration** (d'abord sur un projet de test, jamais directement sur la production sans vérification) :
  ```bash
  pg_restore --clean --if-exists --no-owner --dbname "$TARGET_DB_URL" dada-beauty-AAAA-MM-JJ.dump
  ```
  Ensuite :
  1. Vérifiez les comptages (clientes, rendez-vous, paiements) et la connexion admin.
  2. Basculez si nécessaire.
- **Test de restauration** : une fois par trimestre.

## 5. Supervision

- Logs Vercel : fonctions, webhooks (codes 401/503 anormaux), cron.
- Supabase : rapports de la base, logs Auth, utilisation du Storage.
- Dans l'application : `/admin/notifications` (activité et messages non envoyés) et `/admin/journal` (audit).
- Recommandé : une alerte de disponibilité (UptimeRobot ou équivalent) sur `/` et `/reserver`.

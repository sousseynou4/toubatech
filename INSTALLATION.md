# Pièces détachées + Webhook Agent IA — Installation

Ce paquet ajoute à TOUBA TECH :
- **Page `/pieces-detachees`** : catalogue public avec recherche puissante + filtres
- **API `/api/ai-sync-parts`** : webhook ultra-sécurisé pour ton agent IA
- **Table `spare_parts`** + recherche full-text + calcul de marge automatique
- **Table `sync_logs`** pour l'audit
- **Réutilisation du panier existant** (un client peut mettre dans le même panier un reconditionné + un écran)

**Durée estimée : 10 minutes**

---

## 📁 Étape 1 — Copier les fichiers dans ton projet

```
ZIP ────────────────────────────────────►  Dans ton projet
─────                                       ───────────────
app/(public)/pieces-detachees/page.tsx      ▼ REMPLACE le stub
app/api/ai-sync-parts/route.ts              ▼ nouveau
app/sitemap.ts                              ▼ REMPLACE l'existant
components/pieces/StockBadge.tsx            ▼ nouveau
components/pieces/PartsFilters.tsx          ▼ nouveau
components/pieces/SparePartCard.tsx         ▼ nouveau
lib/webhookAuth.ts                          ▼ nouveau
supabase/schema-spare-parts.sql             ▼ à exécuter dans Supabase
```

Aucune nouvelle dépendance npm — tout fonctionne avec ta stack actuelle (Next.js, Supabase, Zod).

---

## 🗄️ Étape 2 — Créer la table dans Supabase

1. Va sur ton projet Supabase → **SQL Editor** → **New query**
2. Copie tout le contenu de `supabase/schema-spare-parts.sql`
3. Colle dans l'éditeur → **Run**

Vérifie via **Table Editor** :
- La table `spare_parts` existe avec **8 pièces de démo** déjà insérées
- La table `sync_logs` existe (vide)

> 💡 Les 8 pièces de démo sont là pour que la page affiche quelque chose avant ta première sync agent. Tu peux les supprimer en SQL une fois que l'agent commence à pousser ses vrais produits :
> ```sql
> delete from spare_parts where supplier = 'Démo';
> ```

---

## 🔐 Étape 3 — Générer et configurer le token de l'agent IA

### A. Générer un token long et aléatoire

Dans PowerShell, à la racine du projet :

```powershell
-join ((1..48) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
```

Tu obtiens une chaîne hex de 48 caractères. **Garde-la** — tu vas la copier 2 fois.

### B. L'ajouter à `.env.local`

```env
# Token pour l'agent IA externe (webhook /api/ai-sync-parts)
AI_SYNC_API_TOKEN=<colle-ici-le-token-généré>
```

### C. Communiquer le token à ton agent IA

Le développeur/prompt-engineer qui configure l'agent IA externe doit recevoir ce token de manière **sécurisée** :
- Pas par email en clair
- Idéalement via un gestionnaire de mots de passe partagé (1Password, Bitwarden), ou en chiffré
- Le document `AI-AGENT-SPEC.md` lui sera utile

⚠️ **Si le token fuite, change-le immédiatement** : régénère, mets à jour `.env.local`, redéploie, et redonne au développeur de l'agent.

---

## 🚀 Étape 4 — Tester en local

**Redémarrer le serveur** (les variables d'env nécessitent un restart) :

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
npm run dev
```

### Test 1 — La page publique

[http://localhost:3000/pieces-detachees](http://localhost:3000/pieces-detachees)

Tu dois voir :
- Hero avec gradient mesh
- Barre de recherche au centre
- Filtres catégorie + marque + "En stock uniquement"
- Les 8 pièces de démo affichées en grille
- Section pro avec fond bleu profond
- CTA "Pièce spécifique introuvable ?"

**Teste la recherche** : tape "iPhone" → tu dois voir uniquement les pièces iPhone. Tape "batterie" → uniquement les batteries. Tape "S22 écran" → l'écran Galaxy S22.

**Teste les filtres** : clique sur "Apple" → les pièces Samsung disparaissent. Combine avec "Écrans" → uniquement les écrans Apple.

### Test 2 — Le healthcheck du webhook (vérifie le token)

Dans un autre terminal PowerShell :

```powershell
$token = "<colle-ton-token-ici>"
curl.exe -i http://localhost:3000/api/ai-sync-parts -H "Authorization: Bearer $token"
```

Tu dois recevoir :
```json
{ "ok": true, "service": "ai-sync-parts", "version": "1.0", "timestamp": "..." }
```

Si tu reçois `401 unauthorized` → vérifie que `AI_SYNC_API_TOKEN` est bien dans `.env.local` ET que tu as redémarré le serveur.

### Test 3 — Sync d'une pièce factice

```powershell
$token = "<colle-ton-token-ici>"
$body = '{
  "source": "manual-test",
  "parts": [
    {
      "external_id": "TEST-IP15-SCREEN-001",
      "supplier": "Test",
      "name": "Écran iPhone 15 Test",
      "category": "ecran",
      "brand": "Apple",
      "device_model": "iPhone 15",
      "quality_grade": "OEM",
      "compatibility": ["iPhone 15"],
      "supplier_price_cents": 9500,
      "margin_rate": 1.75,
      "stock_status": "in_stock",
      "stock_quantity": 6
    }
  ]
}'

curl.exe -i -X POST http://localhost:3000/api/ai-sync-parts `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d $body
```

Réponse attendue :
```json
{
  "ok": true,
  "summary": { "received": 1, "created": 1, "updated": 0, "failed": 0, "affected": 1 },
  "duration_ms": 95
}
```

**Vérifications** :
1. Va sur [http://localhost:3000/pieces-detachees](http://localhost:3000/pieces-detachees) → tu vois "Écran iPhone 15 Test" dans la grille
2. Dans Supabase → Table Editor → `spare_parts` → tu vois la nouvelle ligne avec `retail_price_cents = 16625` (calculé auto : 9500 × 1.75)
3. Dans Supabase → Table Editor → `sync_logs` → tu vois 1 ligne avec `parts_created: 1`

**Re-test (idempotence)** : ré-exécute exactement la même commande curl. Tu dois voir `"created": 0, "updated": 1` — la pièce est mise à jour, pas dupliquée.

---

## 📋 Étape 5 — Donner la spec à ton dev d'agent

Envoie-lui :
1. Le fichier **`AI-AGENT-SPEC.md`** (spec complète, exemples Python, cURL)
2. Le **token** via canal sécurisé (gestionnaire de mots de passe)
3. L'URL de production une fois déployé : `https://toubatech.com/api/ai-sync-parts`

Il a tout ce qu'il faut pour coder l'agent côté Utopya / Pièces2Mobile / autres fournisseurs.

---

## 🛡️ Sécurité — résumé des protections en place

| Protection | Mécanisme |
|---|---|
| **Authentification** | Bearer token (48 chars hex) en header `Authorization` |
| **Anti-timing attack** | Comparaison du token en temps constant |
| **Rate limiting** | 30 requêtes/min par IP (en mémoire) |
| **Validation stricte** | Zod schema rejette tout payload malformé |
| **Idempotence** | UPSERT sur `external_id` — pas de doublons possibles |
| **Marge protégée** | `retail_price` calculé côté DB par trigger, pas par l'agent |
| **Prix fournisseur invisible** | RLS bloque la lecture publique + API filtre explicitement |
| **Audit complet** | Chaque sync loggée dans `sync_logs` |
| **Pas de delete dur** | Soft-delete via `active: false` |
| **Limite batch** | Max 500 pièces par requête |

---

## 🛟 Dépannage rapide

| Symptôme | Cause | Solution |
|---|---|---|
| `401 unauthorized` au healthcheck | Token absent ou mauvais | Vérifier `.env.local` + redémarrer `npm run dev` |
| `AI_SYNC_API_TOKEN is missing or too short` | Token < 24 chars | Régénérer avec la commande PowerShell de l'étape 3 |
| Page `/pieces-detachees` vide | Schéma SQL pas exécuté | Re-run `schema-spare-parts.sql` dans Supabase |
| Recherche ne marche pas | Extension `unaccent` manque | Re-run le SQL (l'extension est créée automatiquement) |
| Sync échoue avec `validation_failed` | Payload ne respecte pas le schéma | Lire le tableau `issues` dans la réponse — il liste les champs problématiques |
| `429 rate_limited` | Plus de 30 req/min | Espacer les batchs, ou augmenter `RATE_LIMIT_MAX` dans `lib/webhookAuth.ts` |
| Le `retail_price` n'est pas calculé | Trigger non créé | Re-run le SQL — la fonction `compute_retail_price` doit exister |

---

## 📊 Surveiller les synchronisations

Dans Supabase → SQL Editor :

```sql
-- Dernières 20 synchronisations
select
  created_at,
  source,
  parts_received,
  parts_created,
  parts_updated,
  parts_failed,
  duration_ms,
  ip_address
from sync_logs
order by created_at desc
limit 20;

-- Pièces les plus récemment mises à jour
select external_id, name, brand, retail_price_cents / 100.0 as prix_eur, stock_status, last_synced_at
from spare_parts
order by last_synced_at desc
limit 50;

-- Combien de pièces par marque et catégorie
select brand, category, count(*), sum(stock_quantity) as stock_total
from spare_parts
where active = true
group by brand, category
order by brand, category;
```

---

## ➡️ Suite logique

- **Mini back-office pour superviser les pièces** (filtre par sync, ajustement de marge à la main, désactivation rapide d'une pièce)
- **Page détail d'une pièce** (`/pieces-detachees/[id]`) pour SEO et fiches plus complètes
- **Alertes Slack/email** quand une sync échoue ou quand un stock devient critique
- **Marge par catégorie dynamique** : table `margin_rules` avec règles métier (catégorie + fournisseur → coefficient)
- **Déploiement Vercel** (le système est prêt — il suffit de copier les env vars)

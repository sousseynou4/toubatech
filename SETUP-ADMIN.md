# Console admin — Guide de mise en service

La Tour de Contrôle TOUBA TECH : tableau de bord pour suivre et piloter chaque demande de diagnostic.

**Durée estimée : 5 minutes**

---

## 🆕 Ce qui a été ajouté

- Route `/admin` protégée par mot de passe maître
- Cookie de session signé HMAC-SHA256 (7 jours)
- Middleware Next.js qui intercepte tous les accès `/admin/*` avant le rendu
- Dashboard avec stats live (total, nouvelles, en cours, terminées ce mois)
- Vue détail par ticket avec dropdown de statut (mise à jour instantanée)
- Éditeur de notes technicien avec auto-save (1,2s après arrêt de frappe)
- Espace `Rapport IA` déjà affiché (vide pour l'instant) — prêt pour l'agent

---

## 1️⃣ Ajouter les variables d'environnement

Ouvre `.env.local` dans VS Code et ajoute ces deux lignes en bas :

```env
# Console admin
ADMIN_PASSWORD=MonMotDePasseUltraRobuste2026!
ADMIN_SESSION_SECRET=
```

### Générer un `ADMIN_SESSION_SECRET`

C'est la clé qui signe les cookies de session. **Il faut une chaîne aléatoire d'au moins 32 caractères**. Trois options :

**Option A — PowerShell (Windows)** :
```powershell
-join ((1..64) | ForEach-Object { '{0:X}' -f (Get-Random -Max 16) })
```
Copie le résultat dans `ADMIN_SESSION_SECRET=`.

**Option B — Site en ligne** :
[generate-random.org/api-key-generator](https://generate-random.org/api-key-generator) → Length 64 → Hex.

**Option C — Node** :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Choisir un `ADMIN_PASSWORD`

C'est le mot de passe que TU vas taper pour te connecter. **Recommandé** :
- 16 caractères minimum
- Mélange majuscules / minuscules / chiffres / symboles
- À stocker dans ton gestionnaire de mots de passe (1Password, Bitwarden…)

⚠️ **Ne le commit jamais sur Git.** `.env.local` est dans `.gitignore`, donc tu es protégé tant que tu ne le copies pas ailleurs.

---

## 2️⃣ Installer les nouvelles dépendances

```bash
npm install
```

(Pas de nouvelle dépendance pour cette étape — tout est en natif Next.js + Web Crypto API.)

---

## 3️⃣ Redémarrer le serveur dev

```bash
# Ctrl+C dans le terminal qui tourne, puis :
npm run dev
```

⚠️ **Indispensable** — Next.js ne recharge pas les env vars à chaud.

---

## 4️⃣ Tester

1. Ouvre [http://localhost:3000/admin](http://localhost:3000/admin)
2. Tu es **redirigé vers `/admin/login`** ← preuve que la protection marche
3. Saisis ton `ADMIN_PASSWORD`
4. Tu arrives sur le dashboard avec tes diagnostics
5. Clique sur une référence pour ouvrir le ticket
6. Change le statut via le dropdown — la badge se met à jour instantanément
7. Tape dans la zone "Notes du technicien" — auto-save sous 1.2s
8. Vérifie dans Supabase → Table Editor → diagnostics : `status` et `technician_notes` sont à jour

---

## 🛟 Dépannage

| Symptôme | Cause | Solution |
|---|---|---|
| Redirige toujours vers login après login OK | Cookie pas posé (HTTPS strict en dev ?) | Vérifie `NODE_ENV !== 'production'` → cookie en `secure: false` en dev |
| "Configuration serveur incomplète" sur la page login | `ADMIN_PASSWORD` ou `ADMIN_SESSION_SECRET` manquant | Vérifie `.env.local` et redémarre le serveur |
| `ADMIN_SESSION_SECRET must be at least 32 characters` | Secret trop court | Génère-en un nouveau (voir Option A/B/C ci-dessus) |
| Statut ne se met pas à jour | Service role Supabase manquant | Vérifie `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local` |
| 404 sur `/admin/[reference]` | La référence n'existe pas dans Supabase | Vérifie l'orthographe exacte (sensible à la casse) |

---

## 🔐 Pourquoi ce niveau de sécurité ?

- **Cookie HMAC signé** : un attaquant ne peut pas forger un cookie sans connaître `ADMIN_SESSION_SECRET`
- **Cookie HttpOnly** : JavaScript côté navigateur ne peut pas lire le cookie (protège du XSS)
- **Comparaison constant-time** sur le mot de passe : impossible de deviner caractère par caractère via timing
- **Middleware Edge** : la vérification s'exécute AVANT le rendu — aucune fuite de contenu admin
- **Delay aléatoire (200-500ms) sur login échoué** : décourage le brute force automatisé
- **Cookies bloqués en cross-site (`SameSite=Lax`)** : protège du CSRF

C'est largement suffisant pour un back-office mono-utilisateur. Quand vous serez plusieurs admins, on basculera vers Supabase Auth + rôles.

---

## 🔮 Préparation IA — où ça se passe

Dans la vue détail d'un ticket, tu verras une **section "Rapport IA"** avec un message "En attente d'analyse IA". Le champ `ai_report` (JSONB) de la table `diagnostics` est déjà prêt à recevoir le rapport généré par ton futur service IA. Quand on connectera l'agent, il faudra simplement :

1. Le service IA reçoit un webhook à chaque nouvelle demande
2. Il génère un rapport structuré (pièces probables, complexité, durée estimée, alertes)
3. Il fait un `PATCH /api/admin/diagnostics/[id]` avec `ai_report: {...}`, `estimated_cost_min/max`, `ai_processed_at`
4. La section affiche automatiquement le rapport JSON formaté

Tout est déjà câblé visuellement — il ne manque que le service IA.

---

## ➡️ Et après ?

- Connecter l'agent IA (FastAPI) au webhook
- Notifications automatiques au client à chaque changement de statut
- Page Réparation publique (gros impact SEO)
- Mini back-office pour la boutique reconditionné (gestion produits)

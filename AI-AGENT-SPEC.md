# Spécification d'intégration — Agent IA → TOUBA TECH

Ce document est destiné au **développeur ou prompt-engineer qui configure l'agent IA externe**. Il décrit l'API à appeler pour synchroniser le catalogue de pièces détachées.

---

## 🔐 Endpoint

```
POST https://toubatech.com/api/ai-sync-parts
```

(En dev local : `http://localhost:3000/api/ai-sync-parts`)

### Authentification

Header **obligatoire** :
```
Authorization: Bearer <AI_SYNC_API_TOKEN>
```

Le token est fourni hors-bande par l'administrateur TOUBA TECH. Il doit être stocké comme secret par l'agent (variable d'environnement, vault, etc.).

---

## 📥 Format du payload

```json
{
  "source": "ai-agent-v1",
  "parts": [
    {
      "external_id": "UTOPYA-IP13-SCREEN-OEM",
      "supplier": "Utopya",
      "name": "Écran iPhone 13 OEM Noir",
      "description": "Écran OLED qualité OEM avec châssis complet et nappe tactile.",
      "category": "ecran",
      "brand": "Apple",
      "device_model": "iPhone 13",
      "quality_grade": "OEM",
      "compatibility": ["iPhone 13"],
      "supplier_price_cents": 5500,
      "margin_rate": 1.80,
      "stock_status": "in_stock",
      "stock_quantity": 12,
      "image_url": "https://cdn.fournisseur.com/img/ip13-screen.jpg",
      "active": true
    },
    {
      "external_id": "P2M-S22-BATTERY",
      "supplier": "Pièces2Mobile",
      "name": "Batterie Samsung Galaxy S22",
      "category": "batterie",
      "brand": "Samsung",
      "device_model": "Galaxy S22",
      "quality_grade": "Compatible Premium",
      "compatibility": ["Galaxy S22"],
      "supplier_price_cents": 1900,
      "margin_rate": 2.20,
      "stock_status": "low_stock",
      "stock_quantity": 3
    }
  ]
}
```

---

## ✅ Champs

| Champ | Type | Obligatoire | Notes |
|---|---|---|---|
| `external_id` | string | **OUI** | Référence unique du fournisseur. Clé d'idempotence. Max 200 chars. |
| `supplier` | string | non | Nom du fournisseur source. |
| `name` | string | **OUI** | Nom commercial de la pièce. |
| `description` | string | non | Description longue. |
| `category` | string | **OUI** | Slug court : `ecran`, `batterie`, `connecteur-charge`, `carte-mere`, `vitre`, `camera`, `haut-parleur`, `bouton`, `coque`, `nappe`, `outils`. |
| `brand` | string | **OUI** | `Apple`, `Samsung`, `Google`, `Xiaomi`, `Universal`, etc. |
| `device_model` | string | non | Modèle compatible principal. |
| `quality_grade` | string | non | `OEM`, `Service Pack`, `Compatible Premium`, `Compatible Standard`. |
| `compatibility` | string[] | non | Liste des modèles compatibles. |
| `supplier_price_cents` | int | **OUI** | Prix d'achat brut en **centimes** (5500 = 55€). Max 10 000 000. |
| `margin_rate` | float | **OUI** | Coefficient multiplicateur. `1.50` = +50%. Min 1.0, max 10.0. |
| `stock_status` | enum | non | `in_stock` / `low_stock` / `out_of_stock` / `on_order`. Défaut : `in_stock`. |
| `stock_quantity` | int | non | Quantité en stock. |
| `image_url` | string | non | URL HTTPS de l'image principale. |
| `active` | boolean | non | `false` pour soft-delete. Défaut : `true`. |

### ⚠️ Champs interdits

L'agent **ne doit JAMAIS envoyer** :
- `retail_price_cents` → calculé automatiquement côté DB
- `id` → généré par Supabase
- `created_at`, `updated_at`, `last_synced_at` → gérés par le serveur

---

## 📤 Réponse de succès

```json
{
  "ok": true,
  "summary": {
    "received": 12,
    "created": 4,
    "updated": 8,
    "failed": 0,
    "affected": 12
  },
  "duration_ms": 234
}
```

## ⚠️ Réponses d'erreur

| Code HTTP | Code applicatif | Cause |
|---|---|---|
| `401` | `unauthorized` | Token invalide ou absent |
| `429` | `rate_limited` | > 30 requêtes/min (header `Retry-After` fourni) |
| `400` | `invalid_json` | Body non parsable |
| `400` | `validation_failed` | Schéma invalide (issues détaillées dans la réponse) |
| `500` | `sync_failed` | Erreur DB côté serveur |

---

## 🔢 Limites

- **Max 500 pièces par batch** (un seul appel POST)
- **Max 30 requêtes/minute par IP**
- **Recommandation** : pour les gros catalogues, faire des batchs de 100-200 pièces toutes les minutes
- L'API met à jour **toutes les pièces du payload de manière atomique** — si une erreur survient, aucune pièce n'est modifiée

---

## 🧪 Exemple cURL — test rapide

### Healthcheck (vérifier que le token marche)

```bash
curl -i https://toubatech.com/api/ai-sync-parts \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI"
```

Réponse attendue :
```json
{ "ok": true, "service": "ai-sync-parts", "version": "1.0", "timestamp": "..." }
```

### Sync de 2 pièces test

```bash
curl -i -X POST https://toubatech.com/api/ai-sync-parts \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "manual-test",
    "parts": [
      {
        "external_id": "TEST-IP13-SCREEN-001",
        "name": "Écran iPhone 13 Test",
        "category": "ecran",
        "brand": "Apple",
        "device_model": "iPhone 13",
        "quality_grade": "OEM",
        "compatibility": ["iPhone 13"],
        "supplier_price_cents": 5500,
        "margin_rate": 1.80,
        "stock_status": "in_stock",
        "stock_quantity": 5
      }
    ]
  }'
```

### Marquer une pièce comme indisponible (soft-delete)

```bash
curl -i -X POST https://toubatech.com/api/ai-sync-parts \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -H "Content-Type: application/json" \
  -d '{
    "parts": [
      {
        "external_id": "UTOPYA-IP13-SCREEN-OEM",
        "name": "Écran iPhone 13 OEM Noir",
        "category": "ecran",
        "brand": "Apple",
        "supplier_price_cents": 5500,
        "margin_rate": 1.80,
        "active": false
      }
    ]
  }'
```

---

## 🤖 Pseudo-code pour l'agent IA

```python
import os
import requests

API_URL = "https://toubatech.com/api/ai-sync-parts"
TOKEN = os.environ["TOUBA_TECH_API_TOKEN"]
MARGIN_RATES = {
    "ecran": 1.80,
    "batterie": 2.20,
    "connecteur-charge": 2.50,
    "carte-mere": 1.50,
}

def sync_parts_from_supplier(supplier_name: str, catalog: list[dict]):
    """
    catalog: [{
        "ref": "...", "name": "...", "category": "...", "brand": "...",
        "price_ht_eur": 55.00, "stock": 12, ...
    }]
    """
    parts = []
    for item in catalog:
        category = item["category"]
        margin = MARGIN_RATES.get(category, 1.80)

        parts.append({
            "external_id": f"{supplier_name.upper()}-{item['ref']}",
            "supplier": supplier_name,
            "name": item["name"],
            "category": category,
            "brand": item["brand"],
            "device_model": item.get("device_model"),
            "quality_grade": item.get("quality"),
            "compatibility": item.get("compatibility", []),
            "supplier_price_cents": int(item["price_ht_eur"] * 100),
            "margin_rate": margin,
            "stock_status": "in_stock" if item["stock"] > 0 else "out_of_stock",
            "stock_quantity": item["stock"],
            "image_url": item.get("image"),
        })

    # Batch en chunks de 200 pour éviter le rate limit
    for i in range(0, len(parts), 200):
        chunk = parts[i:i+200]
        response = requests.post(
            API_URL,
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "Content-Type": "application/json",
            },
            json={"source": f"agent-{supplier_name}", "parts": chunk},
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()
        print(f"Synced: {result['summary']}")
```

---

## 📊 Suivi côté TOUBA TECH

Toutes les synchronisations sont loggées dans la table `sync_logs` :
```sql
select created_at, source, parts_received, parts_created, parts_updated, duration_ms
from sync_logs
order by created_at desc
limit 20;
```

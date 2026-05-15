# TOUBA TECH — Site officiel

Réparation, reconditionné et économie circulaire à Lorient & Morbihan.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** avec palette de marque (`ink` bleu profond / `emerald` vert / `bone` blanc cassé)
- **Framer Motion** pour les transitions du formulaire diagnostic
- **Geist Sans / Mono** pour la typographie (cohérent avec l'esthétique Vercel/Linear visée)
- **Lucide React** pour les icônes

## Démarrage

```bash
# Depuis ce dossier
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Structure

```
app/
  layout.tsx              # Layout racine + métadonnées SEO + JSON-LD
  page.tsx                # Page d'accueil
  globals.css             # Variables CSS, noise, gradient mesh
  diagnostic/page.tsx     # Page dédiée au formulaire
  reparation/             # Stub à étoffer
  reconditionne/          # Stub à étoffer
  pieces-detachees/       # Stub à étoffer
  ecologie/               # Stub à étoffer
  api/diagnostic/route.ts # API endpoint (réception soumissions)
  robots.ts, sitemap.ts   # SEO

components/
  layout/Header.tsx       # Header sticky avec mobile menu
  layout/Footer.tsx       # Footer 4 colonnes
  ui/Button.tsx           # Variantes : primary / secondary / ghost / emerald
  ui/Section.tsx          # Wrapper + Eyebrow
  diagnostic/
    types.ts              # Types, données, options
    Steps.tsx             # Étapes 1 à 5
    Summary.tsx           # Étape 6 (récap)
    DiagnosticForm.tsx    # Orchestrateur principal

lib/utils.ts              # cn() utility
```

## Le formulaire diagnostic

6 étapes :
1. **Type d'appareil** — sélection visuelle (smartphone/tablette/PC/console/autre)
2. **Marque & modèle** — catalogue dynamique selon le type
3. **Problème** — multi-sélection (écran, batterie, charge, oxydation, micro-soudure, logiciel, autre)
4. **Historique** — événement déclencheur (chute, eau, réparation antérieure, aucun)
5. **Coordonnées** — contact + mode de prise en charge (siège / point relais / domicile)
6. **Récapitulatif** — relecture avant envoi

Validation à chaque étape, navigation arrière permise, animations entrée/sortie via Framer Motion, écran de succès avec numéro de référence.

## Prochaines étapes (à brancher dans `app/api/diagnostic/route.ts`)

- [ ] Persistance Supabase (`diagnostics` table)
- [ ] Email de confirmation (Resend ou Postmark)
- [ ] Webhook vers le service IA (FastAPI) pour génération du rapport technique pré-rempli
- [ ] Notifications SMS via Twilio pour le suivi de réparation
- [ ] Intégration Stripe pour la boutique reconditionné
- [ ] Catalogue produits Supabase + filtres

## Variables d'environnement (à créer en `.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RESEND_API_KEY=
AI_AGENT_WEBHOOK_URL=
STRIPE_SECRET_KEY=
```

## Déploiement

Recommandé : **Vercel** (one-click depuis le repo GitHub).
DNS : **Cloudflare** pour `toubatech.com`.

## Charte graphique

- **Bleu profond** `#003366` (`ink`) — confiance, professionnalisme
- **Vert émeraude** `#339966` (`emerald`) — écologie, économie circulaire
- **Blanc cassé** `#FAFAF7` (`bone`) — légèreté, propreté
- **Gris clair** `#F0F0F0` (`mist`) — surfaces secondaires
- **Geist Sans** — UI & headings (variable, distinctive)
- **Geist Mono** — eyebrows, labels techniques, références

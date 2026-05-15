import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase';
import { verifyBearerToken, checkRateLimit } from '@/lib/webhookAuth';

export const runtime = 'nodejs';

/**
 * POST /api/ai-sync-parts
 *
 * Endpoint sécurisé permettant à un agent IA externe de synchroniser
 * le catalogue de pièces détachées.
 *
 * Authentification : header `Authorization: Bearer <AI_SYNC_API_TOKEN>`
 *
 * Format payload :
 * {
 *   "source": "ai-agent-v1",                  // optionnel — pour logs
 *   "parts": [
 *     {
 *       "external_id": "UTOPYA-IP13-SCR-OEM", // requis — clé d'idempotence
 *       "supplier": "Utopya",                  // optionnel
 *       "name": "Écran iPhone 13 OEM Noir",
 *       "description": "...",                   // optionnel
 *       "category": "ecran",
 *       "brand": "Apple",
 *       "device_model": "iPhone 13",            // optionnel
 *       "quality_grade": "OEM",                 // optionnel
 *       "compatibility": ["iPhone 13"],         // optionnel
 *       "supplier_price_cents": 5500,           // requis — prix brut en CENTIMES
 *       "margin_rate": 1.80,                    // requis — coefficient (1.5 = +50%)
 *       "stock_status": "in_stock",             // optionnel — défaut "in_stock"
 *       "stock_quantity": 12,                   // optionnel
 *       "image_url": "https://...",             // optionnel
 *       "active": true                          // optionnel — défaut true
 *     },
 *     ...
 *   ]
 * }
 *
 * IMPORTANT : retail_price_cents est calculé AUTOMATIQUEMENT côté DB
 * via le trigger compute_retail_price. L'agent n'a JAMAIS besoin de
 * l'envoyer — c'est même rejeté pour éviter toute manipulation.
 *
 * Réponse en cas de succès :
 * {
 *   "ok": true,
 *   "summary": {
 *     "received": 12,
 *     "created": 4,
 *     "updated": 8,
 *     "failed": 0
 *   },
 *   "duration_ms": 234
 * }
 */

const partSchema = z.object({
  external_id: z.string().trim().min(1).max(200),
  supplier: z.string().trim().max(120).optional().nullable(),
  name: z.string().trim().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
  category: z.string().trim().min(1).max(80),
  brand: z.string().trim().min(1).max(80),
  device_model: z.string().trim().max(120).optional().nullable(),
  quality_grade: z.string().trim().max(80).optional().nullable(),
  compatibility: z.array(z.string().min(1).max(120)).max(50).optional(),
  supplier_price_cents: z.number().int().nonnegative().max(10_000_000), // ≤ 100 000 €
  margin_rate: z.number().min(1.0).max(10.0),
  stock_status: z
    .enum(['in_stock', 'low_stock', 'out_of_stock', 'on_order'])
    .optional()
    .default('in_stock'),
  stock_quantity: z.number().int().nonnegative().max(100_000).optional(),
  image_url: z.string().url().max(2000).optional().nullable(),
  active: z.boolean().optional().default(true),
});

const payloadSchema = z.object({
  source: z.string().max(80).optional().default('ai-agent'),
  parts: z.array(partSchema).min(1).max(500), // Max 500 pièces par batch
});

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  // ── 1. Auth check ────────────────────────────────────────────
  if (!verifyBearerToken(request.headers.get('authorization'))) {
    // Slow down brute-force a tiny bit
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
    return NextResponse.json(
      { ok: false, error: { code: 'unauthorized', message: 'Invalid or missing API token.' } },
      { status: 401 }
    );
  }

  // ── 2. Rate limit ────────────────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'rate_limited',
          message: `Too many requests. Retry in ${Math.ceil(rate.resetIn / 1000)}s.`,
        },
      },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(rate.resetIn / 1000)) },
      }
    );
  }

  // ── 3. Parse & validate payload ──────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'invalid_json' } },
      { status: 400 }
    );
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'validation_failed',
          message: 'Payload schema invalide.',
          issues: parsed.error.issues.slice(0, 10), // Limit to first 10
        },
      },
      { status: 400 }
    );
  }

  const { source, parts } = parsed.data;
  const supabase = getServerSupabase();

  // ── 4. UPSERT en batch — efficace même sur 500 produits ──────
  // On utilise external_id comme clé de conflit. Le trigger DB
  // calcule automatiquement retail_price_cents.
  const rows = parts.map((p) => ({
    external_id: p.external_id,
    supplier: p.supplier || null,
    name: p.name,
    description: p.description || null,
    category: p.category.toLowerCase(),
    brand: p.brand,
    device_model: p.device_model || null,
    quality_grade: p.quality_grade || null,
    compatibility: p.compatibility || [],
    supplier_price_cents: p.supplier_price_cents,
    margin_rate: p.margin_rate,
    // retail_price_cents OMIS volontairement — calculé par le trigger
    // Mais NOT NULL en DB, donc on met une valeur initiale qui sera écrasée
    retail_price_cents: Math.round(p.supplier_price_cents * p.margin_rate),
    stock_status: p.stock_status ?? 'in_stock',
    stock_quantity: p.stock_quantity ?? 0,
    image_url: p.image_url || null,
    active: p.active ?? true,
    last_synced_at: new Date().toISOString(),
    sync_source: source,
  }));

  // Pré-fetch des external_ids existants pour distinguer created vs updated
  const externalIds = rows.map((r) => r.external_id);
  const { data: existing } = await supabase
    .from('spare_parts')
    .select('external_id')
    .in('external_id', externalIds);

  const existingSet = new Set((existing ?? []).map((row) => row.external_id));
  const expectedCreated = rows.filter((r) => !existingSet.has(r.external_id)).length;
  const expectedUpdated = rows.length - expectedCreated;

  const { error: upsertError, count } = await supabase
    .from('spare_parts')
    .upsert(rows, { onConflict: 'external_id', count: 'exact' });

  let failed = 0;
  const errors: unknown[] = [];

  if (upsertError) {
    console.error('[ai-sync] upsert error:', upsertError);
    failed = rows.length;
    errors.push({ message: upsertError.message, details: upsertError.details });
  }

  const duration = Date.now() - startedAt;

  // ── 5. Log de synchronisation (audit) ────────────────────────
  await supabase.from('sync_logs').insert({
    source,
    parts_received: parts.length,
    parts_created: failed ? 0 : expectedCreated,
    parts_updated: failed ? 0 : expectedUpdated,
    parts_failed: failed,
    errors: errors.length ? errors : null,
    duration_ms: duration,
    ip_address: ip,
  });

  // ── 6. Réponse ───────────────────────────────────────────────
  if (failed > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'sync_failed', message: 'Synchronisation partiellement échouée.' },
        summary: {
          received: parts.length,
          created: 0,
          updated: 0,
          failed,
        },
        duration_ms: duration,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    summary: {
      received: parts.length,
      created: expectedCreated,
      updated: expectedUpdated,
      failed: 0,
      affected: count ?? parts.length,
    },
    duration_ms: duration,
  });
}

/**
 * GET /api/ai-sync-parts
 * Healthcheck — permet à l'agent de vérifier que l'endpoint est joignable
 * et que son token est valide avant de tenter une vraie sync.
 */
export async function GET(request: NextRequest) {
  if (!verifyBearerToken(request.headers.get('authorization'))) {
    return NextResponse.json(
      { ok: false, error: { code: 'unauthorized' } },
      { status: 401 }
    );
  }
  return NextResponse.json({
    ok: true,
    service: 'ai-sync-parts',
    version: '1.0',
    timestamp: new Date().toISOString(),
  });
}

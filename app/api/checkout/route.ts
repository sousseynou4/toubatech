import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe';
import { getServerSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * POST /api/checkout
 *
 * Receives the user's cart, validates each line server-side
 * (we NEVER trust client-supplied prices), creates a Stripe Checkout
 * session, and returns the redirect URL.
 *
 * A pending Order row is also created in Supabase, linked to the
 * Stripe session. The webhook (/api/stripe/webhook) will later
 * update its status to "paid" upon confirmation.
 */
const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive().max(10),
      })
    )
    .min(1)
    .max(20),
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(120).optional(),
});

function generateOrderReference(): string {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ORD-${yy}${mm}${dd}-${suffix}`;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_json', message: 'Corps de requête invalide.' } },
      { status: 400 }
    );
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'validation_failed',
          message: 'Panier ou email invalide.',
          issues: parsed.error.issues,
        },
      },
      { status: 400 }
    );
  }

  const { items, email, name } = parsed.data;
  const supabase = getServerSupabase();

  // ── Re-fetch products from DB to get authoritative prices & stock ──
  const productIds = items.map((i) => i.productId);
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, slug, brand, model, storage, color, grade, price_cents, stock, images, active')
    .in('id', productIds);

  if (productsError) {
    console.error('[checkout] product fetch error:', productsError);
    return NextResponse.json(
      { error: { code: 'product_fetch_failed', message: 'Erreur catalogue.' } },
      { status: 500 }
    );
  }

  // ── Validate stock & build authoritative line items ──
  const lineItems = [];
  const orderItems = [];
  let subtotalCents = 0;

  for (const cartItem of items) {
    const product = products?.find((p) => p.id === cartItem.productId);
    if (!product) {
      return NextResponse.json(
        {
          error: {
            code: 'product_not_found',
            message: `Produit introuvable.`,
          },
        },
        { status: 400 }
      );
    }
    if (!product.active) {
      return NextResponse.json(
        {
          error: {
            code: 'product_inactive',
            message: `Le produit ${product.brand} ${product.model} n'est plus disponible.`,
          },
        },
        { status: 400 }
      );
    }
    if (product.stock < cartItem.quantity) {
      return NextResponse.json(
        {
          error: {
            code: 'insufficient_stock',
            message: `Stock insuffisant pour ${product.brand} ${product.model} (disponible: ${product.stock}).`,
          },
        },
        { status: 400 }
      );
    }

    const productName = [product.brand, product.model, product.storage, product.color]
      .filter(Boolean)
      .join(' · ');

    lineItems.push({
      price_data: {
        currency: 'eur',
        unit_amount: product.price_cents,
        product_data: {
          name: productName,
          description: `Reconditionné Grade ${product.grade} · Garantie 12 mois TOUBA TECH`,
          images: product.images?.length ? [product.images[0]] : undefined,
          metadata: {
            product_id: product.id,
            grade: product.grade,
          },
        },
      },
      quantity: cartItem.quantity,
    });

    orderItems.push({
      product_id: product.id,
      slug: product.slug,
      name: productName,
      grade: product.grade,
      price_cents: product.price_cents,
      quantity: cartItem.quantity,
    });

    subtotalCents += product.price_cents * cartItem.quantity;
  }

  // ── Generate reference & create pending order ──
  const reference = generateOrderReference();
  const origin =
    request.headers.get('origin') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000';

  // Create Stripe session FIRST so we have its ID
  let stripeSession;
  try {
    const stripe = getStripe();
    stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: email,
      success_url: `${origin}/boutique/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/panier?cancelled=1`,
      metadata: {
        reference,
        customer_name: name || '',
      },
      // Collect shipping address inside Stripe (no extra dev work)
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'CH', 'LU', 'MC'],
      },
      // Free shipping in metropolitan France for now
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'eur' },
            display_name: 'Livraison France métropolitaine offerte',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 5 },
            },
          },
        },
      ],
      locale: 'fr',
    });
  } catch (err) {
    console.error('[checkout] Stripe error:', err);
    return NextResponse.json(
      {
        error: {
          code: 'stripe_session_failed',
          message: 'Impossible de créer la session de paiement.',
        },
      },
      { status: 500 }
    );
  }

  // ── Persist pending order ──
  const { error: orderError } = await supabase.from('orders').insert({
    reference,
    status: 'pending',
    stripe_session_id: stripeSession.id,
    customer_email: email,
    customer_name: name,
    subtotal_cents: subtotalCents,
    shipping_cents: 0,
    total_cents: subtotalCents,
    currency: 'eur',
    items: orderItems,
  });

  if (orderError) {
    console.error('[checkout] order insert error:', orderError);
    // Continue anyway — Stripe session is live, we can recover via webhook
  }

  return NextResponse.json({
    url: stripeSession.url,
    sessionId: stripeSession.id,
    reference,
  });
}

import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe';
import { getServerSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe events. Verifies the signature using the
 * STRIPE_WEBHOOK_SECRET — this is critical: without it, anyone could
 * POST fake events to mark orders as paid.
 *
 * Handled events:
 *   - checkout.session.completed → order → paid + decrement stock
 *   - checkout.session.expired   → order → cancelled
 *   - charge.refunded            → order → refunded
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  // Need the raw body for signature verification
  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[stripe/webhook] signature verification failed:', msg);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const supabase = getServerSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Update order status
        const { data: order, error: fetchError } = await supabase
          .from('orders')
          .select('id, items, status')
          .eq('stripe_session_id', session.id)
          .single();

        if (fetchError || !order) {
          console.error('[webhook] order not found for session', session.id);
          break;
        }

        // Don't double-process
        if (order.status === 'paid') {
          break;
        }

        // Extract shipping address from Stripe (only present after successful payment)
        const shippingAddress = session.shipping_details
          ? {
              name: session.shipping_details.name,
              address: session.shipping_details.address,
            }
          : null;

        await supabase
          .from('orders')
          .update({
            status: 'paid',
            stripe_payment_intent: typeof session.payment_intent === 'string'
              ? session.payment_intent
              : null,
            shipping_address: shippingAddress,
            paid_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        // Decrement stock for each item
        const items = order.items as Array<{ product_id: string; quantity: number }>;
        for (const item of items) {
          // Use atomic decrement via RPC would be cleaner, but a simple read-then-write
          // is acceptable here given low concurrency on individual products
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          if (product) {
            const newStock = Math.max(0, product.stock - item.quantity);
            await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', item.product_id);
          }
        }

        console.log(`[webhook] order paid: session ${session.id}`);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('stripe_session_id', session.id)
          .eq('status', 'pending');
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntent =
          typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
        if (paymentIntent) {
          await supabase
            .from('orders')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent', paymentIntent);
        }
        break;
      }

      default:
      // Other events are acknowledged but not processed
    }
  } catch (err) {
    console.error('[webhook] handler error:', err);
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

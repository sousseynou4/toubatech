import Stripe from 'stripe';

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;
  stripeInstance = new Stripe(getEnv('STRIPE_SECRET_KEY'), {
    apiVersion: '2024-06-20',
    typescript: true,
  });
  return stripeInstance;
}

export function getStripeWebhookSecret(): string {
  return getEnv('STRIPE_WEBHOOK_SECRET');
}

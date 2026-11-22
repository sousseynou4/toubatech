/**
 * Couche d'abstraction des fournisseurs de paiement.
 * Règle d'or : un paiement n'est JAMAIS marqué réussi côté client. Seul un
 * webhook signé et vérifié (ou une saisie manuelle autorisée) le confirme.
 */
export type ProviderId = 'wave' | 'orange_money';

export interface CheckoutRequest {
  paymentId: string;
  reference: string;
  amount: number;          // FCFA, calculé par la base
  currency: 'XOF';
  successUrl: string;
  errorUrl: string;
  description: string;
}

export interface CheckoutSession { providerReference: string; checkoutUrl: string }

export interface WebhookEvent {
  eventId: string;
  providerReference: string;
  status: 'succeeded' | 'failed' | 'cancelled' | 'pending';
  amount: number | null;
  raw: unknown;
}

export interface PaymentProvider {
  id: ProviderId;
  label: string;
  isConfigured(): boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /** Vérifie la signature et extrait l'événement. Lève une erreur si invalide. */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`PROVIDER_NOT_CONFIGURED: ${provider}`);
  }
}
export class InvalidSignatureError extends Error {
  constructor() {
    super('INVALID_SIGNATURE');
  }
}

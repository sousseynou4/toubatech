import { orangeMoneyProvider } from './orange-money';
import { waveProvider } from './wave';
import type { PaymentProvider, ProviderId } from './types';

export const providers: Record<ProviderId, PaymentProvider> = {
  wave: waveProvider,
  orange_money: orangeMoneyProvider,
};

export function getProvider(id: string): PaymentProvider | null {
  return id in providers ? providers[id as ProviderId] : null;
}

/** Fournisseurs réellement utilisables en ligne (clés présentes). */
export function onlineProviders(): PaymentProvider[] {
  return Object.values(providers).filter((p) => p.isConfigured());
}

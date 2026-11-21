import { ProviderNotConfiguredError, type PaymentProvider } from './types';

/**
 * Orange Money Sénégal — adaptateur préparé, NON ACTIF.
 * L'API Web Payment d'Orange (Orange Developer / Sonatel) nécessite un
 * contrat marchand, des identifiants OAuth et la documentation fournie lors
 * de l'onboarding marchand (format exact des notifications, signature).
 * Tant que ces éléments ne sont pas fournis, cet adaptateur refuse toute
 * opération : aucun paiement Orange Money en ligne n'est proposé aux clientes.
 * Les paiements Orange Money reçus sur le numéro marchand restent
 * enregistrables manuellement par l'équipe (caisse / fiche rendez-vous).
 */
export const orangeMoneyProvider: PaymentProvider = {
  id: 'orange_money',
  label: 'Orange Money',
  isConfigured: () => false,
  async createCheckout() {
    throw new ProviderNotConfiguredError('orange_money');
  },
  async parseWebhook() {
    throw new ProviderNotConfiguredError('orange_money');
  },
};

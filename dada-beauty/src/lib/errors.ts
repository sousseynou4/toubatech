/** Traduit les codes d'erreur métier renvoyés par PostgreSQL en messages clairs. */
const MESSAGES: Record<string, string> = {
  SLOT_UNAVAILABLE: 'Ce créneau vient d\'être réservé ou n\'est plus disponible. Merci d\'en choisir un autre.',
  SERVICE_NOT_BOOKABLE: 'Cette prestation ne se réserve pas encore en ligne. Contactez-nous sur WhatsApp.',
  BOOKING_DISABLED: 'La réservation en ligne est momentanément fermée. Contactez-nous sur WhatsApp.',
  TOO_MANY_PENDING: 'Vous avez déjà plusieurs demandes en attente. Nous revenons vers vous très vite.',
  RATE_LIMITED: 'Trop de tentatives. Merci de réessayer dans quelques minutes ou de nous écrire sur WhatsApp.',
  INVALID_PHONE: 'Numéro de téléphone invalide.',
  INVALID_NAME: 'Merci d\'indiquer votre nom.',
  NOT_FOUND: 'Élément introuvable. Vérifiez la référence et le numéro de téléphone.',
  NOT_CANCELLABLE: 'Ce rendez-vous ne peut plus être annulé en ligne.',
  TOO_LATE_TO_CANCEL: 'Le délai d\'annulation en ligne est dépassé. Contactez-nous directement.',
  INSUFFICIENT_STOCK: 'Stock insuffisant pour l\'un des produits.',
  PRODUCT_UNAVAILABLE: 'Un produit de votre panier n\'est plus disponible.',
  INVALID_QUANTITY: 'Quantité invalide.',
  SHOP_DISABLED: 'La boutique en ligne est momentanément fermée.',
  DELIVERY_DISABLED: 'La livraison n\'est pas disponible pour le moment. Choisissez le retrait au salon.',
  PICKUP_DISABLED: 'Le retrait au salon n\'est pas disponible.',
  ADDRESS_REQUIRED: 'Merci d\'indiquer une adresse de livraison complète.',
  PERMISSION_DENIED: 'Vous n\'avez pas l\'autorisation d\'effectuer cette action.',
  INVALID_TRANSITION: 'Ce changement de statut n\'est pas autorisé.',
  DEPOSIT_NOT_RECORDED: 'Enregistrez d\'abord le paiement de l\'acompte.',
  CASH_SESSION_CLOSED: 'La caisse est fermée : ouvrez-la avant d\'enregistrer des espèces.',
  CASH_SESSION_ALREADY_OPEN: 'Une caisse est déjà ouverte.',
  AMOUNT_EXCEEDS_BALANCE: 'Le montant dépasse le reste dû.',
  INVALID_AMOUNT: 'Montant invalide.',
  INVALID_REFUND_AMOUNT: 'Montant de remboursement invalide.',
  NOT_REFUNDABLE: 'Ce paiement ne peut pas être remboursé.',
  PAYMENT_MISMATCH: 'La somme des paiements ne correspond pas au total.',
  DISCOUNT_TOO_HIGH: 'La remise dépasse le total.',
  SERVICE_PRICE_REQUIRED: 'Indiquez le prix de la prestation.',
  SERVICE_NOT_CONFIGURED: 'Cette prestation n\'a pas encore de prix ou de durée.',
  EMPLOYEE_ON_LEAVE: 'L\'employée est absente sur ce créneau.',
  NOT_RESCHEDULABLE: 'Ce rendez-vous ne peut plus être reporté.',
  STOCK_DIRECT_UPDATE_FORBIDDEN: 'Le stock se modifie uniquement par un mouvement de stock.',
  stock_adjustment_needs_note: 'Une note est obligatoire pour un ajustement ou une perte.',
  NOTE_REQUIRED: 'Une note est obligatoire.',
  REASON_REQUIRED: 'Un motif est obligatoire.',
  DATE_IN_PAST: 'La date doit être dans le futur.',
  INVALID_TOKEN: 'Ce lien d\'avis n\'est pas valide.',
  ALREADY_REVIEWED: 'Merci ! Vous avez déjà laissé un avis pour ce rendez-vous.',
  services_active_requires_config: 'Une prestation active doit avoir un prix et une durée.',
  INSUFFICIENT_POINTS: 'Solde de points insuffisant.',
  APPOINTMENT_CLOSED: 'Ce rendez-vous est clos.',
  ORDER_CLOSED: 'Cette commande est close.',
  PROMO_INVALID: 'Ce code promo n\'existe pas ou n\'est plus actif.',
  PROMO_NOT_STARTED: 'Ce code promo n\'est pas encore valable.',
  PROMO_EXPIRED: 'Ce code promo a expiré.',
  PROMO_EXHAUSTED: 'Ce code promo a atteint son nombre maximum d\'utilisations.',
  PROMO_MIN_AMOUNT: 'Le montant minimum pour ce code promo n\'est pas atteint.',
  PROMO_NOT_APPLICABLE: 'Ce code promo ne s\'applique pas à ces articles.',
  GIFT_CARD_NOT_FOUND: 'Carte cadeau introuvable : vérifiez le code.',
  GIFT_CARD_INACTIVE: 'Cette carte cadeau est désactivée.',
  GIFT_CARD_EXPIRED: 'Cette carte cadeau a expiré.',
  GIFT_CARD_INSUFFICIENT_BALANCE: 'Solde de la carte cadeau insuffisant.',
  GIFT_CARD_CODE_REQUIRED: 'Indiquez le code de la carte cadeau.',
  GIFT_CARD_DIRECT_UPDATE_FORBIDDEN: 'Le solde d\'une carte cadeau ne se modifie pas à la main.',
  INVALID_PAYMENT_METHOD: 'Moyen de paiement invalide.',
};

export function dbErrorMessage(err: unknown, fallback = 'Une erreur est survenue. Merci de réessayer.'): string {
  const raw = typeof err === 'string' ? err : (err as { message?: string } | null)?.message ?? '';
  for (const [code, msg] of Object.entries(MESSAGES)) {
    if (raw.includes(code)) return msg;
  }
  if (raw.includes('duplicate key')) return 'Cet élément existe déjà (doublon).';
  if (raw.includes('violates foreign key')) return 'Cet élément est utilisé ailleurs et ne peut pas être supprimé.';
  return fallback;
}

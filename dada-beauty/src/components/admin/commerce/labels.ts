export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  stock: 'Achat de stock', rent: 'Loyer', salaries: 'Salaires', utilities: 'Eau / électricité / internet', marketing: 'Marketing',
  equipment: 'Matériel', consumables: 'Consommables', transport: 'Transport', taxes: 'Impôts & taxes', other: 'Autre',
};
export const STOCK_REASON_LABEL: Record<string, string> = {
  initial: 'Stock initial', purchase: 'Réception fournisseur', sale: 'Vente en caisse', order_reserved: 'Commande en ligne',
  order_released: 'Annulation de commande', return: 'Retour', adjustment: 'Ajustement inventaire', loss: 'Perte / casse',
};
export const CASH_CATEGORY_LABEL: Record<string, string> = {
  sale: 'Vente', deposit: 'Acompte', balance: 'Solde', refund: 'Remboursement', expense: 'Dépense', withdrawal: 'Retrait', top_up: 'Apport', gift_card_sale: 'Vente carte cadeau',
};
export const MANUAL_METHODS = [
  ['cash', 'Espèces'], ['wave', 'Wave'], ['orange_money', 'Orange Money'], ['card', 'Carte'], ['bank_transfer', 'Virement'], ['other', 'Autre'],
] as const;
/** Moyens acceptés en caisse : les moyens manuels + la carte cadeau (débitée en base). */
export const POS_METHODS = [
  ['cash', 'Espèces'], ['wave', 'Wave'], ['orange_money', 'Orange Money'], ['card', 'Carte'], ['bank_transfer', 'Virement'],
  ['gift_card', 'Carte cadeau'], ['other', 'Autre'],
] as const;

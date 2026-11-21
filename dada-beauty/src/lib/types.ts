/** Types applicatifs (sous-ensemble des tables, alignés sur les migrations). */
export type AppRole = 'super_admin' | 'owner' | 'manager' | 'staff' | 'sales';
export type ConfigStatus = 'to_configure' | 'active' | 'inactive';
export type AppointmentStatus = 'pending' | 'confirmed' | 'deposit_paid' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'ready_for_pickup' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
export type PaymentMethod = 'cash' | 'wave' | 'orange_money' | 'card' | 'bank_transfer' | 'gift_card' | 'other';
export type PaymentKind = 'deposit' | 'balance' | 'full' | 'refund';

export interface BusinessSettings {
  business_name: string;
  tagline: string | null;
  description: string | null;
  phone: string;
  whatsapp_phone: string;
  email: string | null;
  address_line: string;
  city: string;
  country: string;
  map_embed_url: string | null;
  logo_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  snapchat_url: string | null;
  online_booking_enabled: boolean;
  slot_interval_minutes: number;
  booking_min_lead_minutes: number;
  booking_max_days_ahead: number;
  max_pending_bookings_per_phone: number;
  deposit_policy: 'none' | 'percent' | 'fixed';
  deposit_value: number;
  cancellation_policy: string | null;
  booking_terms: string | null;
  shop_enabled: boolean;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  delivery_fee: number | null;
  delivery_zones_note: string | null;
  accepted_payment_methods: PaymentMethod[];
  wave_merchant_display: string | null;
  orange_money_merchant_display: string | null;
  loyalty_enabled: boolean;
  loyalty_points_per_1000_xof: number;
  onboarding_completed: boolean;
}

export interface BusinessHour { weekday: number; is_closed: boolean; open_time: string | null; close_time: string | null }

export interface MediaAsset { id: string; public_url: string | null; alt: string; caption?: string | null; category?: string | null; slot?: string | null; is_placeholder?: boolean }

export interface ServiceCategory { id: string; slug: string; name: string; tagline: string | null; description: string | null; sort_order: number; is_active: boolean; image?: MediaAsset | null }

export interface Service {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  price: number | null;
  price_is_from: boolean;
  duration_minutes: number | null;
  buffer_minutes: number;
  deposit_amount: number | null;
  is_bookable: boolean;
  is_featured: boolean;
  requires_quote: boolean;
  conditions: string | null;
  status: ConfigStatus;
  sort_order: number;
  image?: MediaAsset | null;
  category?: Pick<ServiceCategory, 'slug' | 'name'> | null;
}

export interface ProductVariant { id: string; product_id: string; name: string; sku: string | null; sale_price: number | null; cost_price?: number | null; stock_quantity: number; alert_threshold: number; is_default: boolean; is_active: boolean }
export interface Product {
  id: string; slug: string; name: string; brand: string | null; short_description: string | null; description: string | null;
  status: ConfigStatus; is_online: boolean; is_featured: boolean; category_id: string;
  category?: { slug: string; name: string } | null; image?: MediaAsset | null; variants?: ProductVariant[];
}

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  deposit_paid: 'Acompte payé',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absente',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  processing: 'En préparation',
  ready_for_pickup: 'Prête à retirer',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  completed: 'Finalisée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  wave: 'Wave',
  orange_money: 'Orange Money',
  card: 'Carte bancaire',
  bank_transfer: 'Virement',
  gift_card: 'Carte cadeau',
  other: 'Autre',
};

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  deposit: 'Acompte', balance: 'Solde', full: 'Paiement', refund: 'Remboursement',
};

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: 'Super admin', owner: 'Propriétaire', manager: 'Manager', staff: 'Employée', sales: 'Ventes',
};

import type { ServerSupabase } from '@/lib/supabase/server';
import type { AppointmentStatus } from '@/lib/types';

export interface AppointmentRow {
  id: string; reference: string; start_at: string; end_at: string; status: AppointmentStatus; total_amount: number; paid_amount: number;
  deposit_required: number; source: string; created_at: string;
  customer: { id: string; full_name: string; phone: string } | null;
  employee: { id: string; display_name: string; color: string } | null;
  services: { service_name: string; service_id: string }[];
}

export const APPOINTMENT_SELECT =
  'id, reference, start_at, end_at, status, total_amount, paid_amount, deposit_required, source, created_at, customer:customers(id, full_name, phone), employee:employees(id, display_name, color), services:appointment_services(service_name, service_id)';

export async function listAppointments(sb: ServerSupabase, opts: { from?: string; to?: string; employeeId?: string; serviceId?: string; status?: string; q?: string; order?: 'start' | 'created'; limit?: number }) {
  let q = sb.from('appointments').select(APPOINTMENT_SELECT);
  if (opts.from) q = q.gte('start_at', opts.from);
  if (opts.to) q = q.lt('start_at', opts.to);
  if (opts.employeeId) q = q.eq('employee_id', opts.employeeId);
  if (opts.status) q = q.eq('status', opts.status);
  q = opts.order === 'created' ? q.order('created_at', { ascending: false }) : q.order('start_at');
  q = q.limit(opts.limit ?? 500);
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as unknown as AppointmentRow[];
  if (opts.serviceId) rows = rows.filter((r) => r.services.some((s) => s.service_id === opts.serviceId));
  if (opts.q) {
    const needle = opts.q.toLowerCase();
    const digits = opts.q.replace(/\D/g, '');
    rows = rows.filter((r) => r.customer?.full_name.toLowerCase().includes(needle) || (digits.length >= 3 && r.customer?.phone.includes(digits)) || r.reference.toLowerCase().includes(needle));
  }
  return rows;
}

export async function lowStock(sb: ServerSupabase, limit = 8) {
  const { data } = await sb.from('product_variants')
    .select('id, name, stock_quantity, alert_threshold, product:products(id, name, status)')
    .eq('is_active', true).order('stock_quantity').limit(300);
  type Row = { id: string; name: string; stock_quantity: number; alert_threshold: number; product: { id: string; name: string; status: string } | null };
  return ((data ?? []) as unknown as Row[])
    .filter((v) => v.product && v.product.status !== 'inactive' && v.stock_quantity <= v.alert_threshold)
    .slice(0, limit);
}

export async function listEmployees(sb: ServerSupabase) {
  const { data } = await sb.from('employees').select('id, display_name, color, is_active').order('sort_order').order('display_name');
  return (data ?? []) as { id: string; display_name: string; color: string; is_active: boolean }[];
}

export async function listServicesLite(sb: ServerSupabase) {
  const { data } = await sb.from('services').select('id, name, price, duration_minutes, status, category:service_categories(name)').neq('status', 'inactive').order('sort_order');
  return (data ?? []) as unknown as { id: string; name: string; price: number | null; duration_minutes: number | null; status: string; category: { name: string } | null }[];
}

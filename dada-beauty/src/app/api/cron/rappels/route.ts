import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/admin';
import { isWhatsAppConfigured, sendWhatsAppTemplate } from '@/lib/notifications/whatsapp';
import { addDays, formatTime, todayInDakar } from '@/lib/format';

/**
 * Tâche planifiée (Vercel Cron, quotidienne) : rappels des rendez-vous du lendemain.
 * - API WhatsApp configurée + modèle « rappel_rdv » approuvé : envoi automatique.
 * - Sinon : statut « not_configured » journalisé et notification interne listant
 *   les rappels à envoyer manuellement. Rien n'est prétendu envoyé.
 * Protégée par CRON_SECRET (en-tête Authorization: Bearer).
 */
function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get('authorization') ?? '';
  if (!secret) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: 'not configured' }, { status: 503 });
  const tomorrow = addDays(todayInDakar(), 1);
  const { data: appts } = await admin.from('appointments')
    .select('id, reference, start_at, customer:customers(id, full_name, phone), services:appointment_services(service_name)')
    .gte('start_at', `${tomorrow}T00:00:00Z`).lt('start_at', `${addDays(tomorrow, 1)}T00:00:00Z`)
    .in('status', ['confirmed', 'deposit_paid']);
  type Row = { id: string; reference: string; start_at: string; customer: { id: string; full_name: string; phone: string }; services: { service_name: string }[] };
  const rows = (appts ?? []) as unknown as Row[];
  let sent = 0;
  const manual: string[] = [];
  for (const a of rows) {
    const { data: already } = await admin.from('message_log').select('id').eq('appointment_id', a.id).eq('template', 'booking_reminder').limit(1);
    if (already?.length) continue;
    const name = a.customer.full_name.split(' ')[0] ?? '';
    const result = await sendWhatsAppTemplate({
      to: a.customer.phone, template: 'rappel_rdv',
      variables: [name, a.services.map((s) => s.service_name).join(', '), formatTime(a.start_at)],
    });
    await admin.from('message_log').insert({
      channel: 'whatsapp', template: 'booking_reminder', recipient: a.customer.phone, customer_id: a.customer.id, appointment_id: a.id,
      status: result.status, provider_message_id: result.providerMessageId ?? null, error: result.error ?? null,
    });
    if (result.status === 'sent') sent++; else manual.push(`${formatTime(a.start_at)} ${a.customer.full_name} (${a.reference})`);
  }
  if (manual.length) {
    await admin.from('notifications').insert({
      type: 'reminders.manual', title: `${manual.length} rappel(s) à envoyer pour demain`,
      body: (isWhatsAppConfigured() ? 'Échec d\'envoi automatique : ' : 'Envoi manuel via la fiche rendez-vous : ') + manual.join(' · ').slice(0, 1500),
      link: `/admin/rendez-vous?vue=jour&date=${tomorrow}`, audience_permission: 'appointments.view_all',
    });
  }
  return NextResponse.json({ date: tomorrow, total: rows.length, sent, manual: manual.length });
}

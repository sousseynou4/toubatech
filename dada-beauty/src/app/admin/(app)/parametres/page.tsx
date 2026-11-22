import Link from 'next/link';
import { CheckCircle2, CircleDashed, ListChecks } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Panel } from '@/components/admin/ui';
import { BookingSettingsForm, ClosuresManager, HoursForm, IdentityForm, LoyaltySettingsForm, PaymentSettingsForm, ShopSettingsForm } from '@/components/admin/system/settings-forms';
import { ButtonLink } from '@/components/ui/button';
import { todayInDakar } from '@/lib/format';
import { isWhatsAppConfigured } from '@/lib/notifications/whatsapp';
import { waveProvider } from '@/lib/payments/wave';
import type { BusinessHour, BusinessSettings } from '@/lib/types';

export const metadata = { title: 'Paramètres' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireStaff('settings.manage');
  const sb = (await createClient())!;
  const [{ data: s }, { data: hours }, { data: closures }] = await Promise.all([
    sb.from('business_settings').select('*').eq('id', 1).single(),
    sb.from('business_hours').select('weekday, is_closed, open_time, close_time').order('weekday'),
    sb.from('business_closures').select('id, start_date, end_date, reason').gte('end_date', todayInDakar()).order('start_date'),
  ]);
  const settings = s as BusinessSettings;
  const integrations = [
    { label: 'Wave (paiement en ligne)', ok: waveProvider.isConfigured(), detail: waveProvider.isConfigured() ? 'Clés présentes — à valider en test avant ouverture aux clientes.' : 'Non configuré (WAVE_API_KEY / WAVE_WEBHOOK_SECRET). Les paiements Wave reçus s\'enregistrent manuellement.' },
    { label: 'Orange Money (paiement en ligne)', ok: false, detail: 'Non actif : nécessite un contrat marchand et la documentation API Orange/Sonatel.' },
    { label: 'WhatsApp Business API', ok: isWhatsAppConfigured(), detail: isWhatsAppConfigured() ? 'Configurée — les modèles de messages doivent être approuvés par Meta.' : 'Non configurée : les messages s\'envoient manuellement via des liens WhatsApp pré-remplis.' },
  ];
  return (
    <>
      <PageHeader title="Paramètres" description="Informations de l'institut, réservation, boutique, paiements et fidélité."
        actions={<ButtonLink href="/admin/parametres/configuration" size="sm" variant="outline"><ListChecks className="size-4" /> Configuration initiale</ButtonLink>} />
      <nav className="mb-6 flex flex-wrap gap-2 text-sm" aria-label="Sections">
        {[['identite', 'Identité'], ['horaires', 'Horaires'], ['reservation', 'Réservation'], ['boutique', 'Boutique'], ['paiements', 'Paiements'], ['fidelite', 'Fidélité']].map(([id, l]) => (
          <Link key={id} href={`#${id}`} className="rounded-full border border-line bg-white px-3 py-1.5 hover:border-rosewood">{l}</Link>
        ))}
      </nav>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Identité & contact" className="scroll-mt-24 xl:col-span-2"><div id="identite" /><IdentityForm s={settings} /></Panel>
        <Panel title="Horaires d'ouverture" className="scroll-mt-24"><div id="horaires" /><HoursForm hours={(hours ?? []) as BusinessHour[]} /></Panel>
        <Panel title="Fermetures exceptionnelles"><ClosuresManager closures={closures ?? []} /></Panel>
        <Panel title="Réservation en ligne" className="scroll-mt-24 xl:col-span-2"><div id="reservation" /><BookingSettingsForm s={settings} /></Panel>
        <Panel title="Boutique" className="scroll-mt-24"><div id="boutique" /><ShopSettingsForm s={settings} /></Panel>
        <Panel title="Fidélité" className="scroll-mt-24"><div id="fidelite" /><LoyaltySettingsForm s={settings} /></Panel>
        <Panel title="Paiements" className="scroll-mt-24 xl:col-span-2">
          <div id="paiements" />
          <PaymentSettingsForm s={settings} />
          <h3 className="mt-6 text-sm font-semibold">État des intégrations</h3>
          <ul className="mt-2 grid gap-2 text-sm">
            {integrations.map((i) => (
              <li key={i.label} className="flex gap-2">{i.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted" />}
                <span><span className="font-medium">{i.label}</span><span className="block text-xs text-muted">{i.detail}</span></span></li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

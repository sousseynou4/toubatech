import Link from 'next/link';
import { CheckCircle2, CircleDashed, Info } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Panel } from '@/components/admin/ui';
import { CompleteOnboardingButton } from '@/components/admin/system/settings-forms';
import { Alert } from '@/components/ui/field';
import type { BusinessSettings } from '@/lib/types';

export const metadata = { title: 'Configuration initiale' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  await requireStaff('settings.manage');
  const sb = (await createClient())!;
  const [{ data: s }, hours, employees, schedules, empServices, services, media] = await Promise.all([
    sb.from('business_settings').select('*').eq('id', 1).single(),
    sb.from('business_hours').select('weekday', { count: 'exact', head: true }).eq('is_closed', false),
    sb.from('employees').select('id', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('employee_schedules').select('employee_id'),
    sb.from('employee_services').select('employee_id, service_id'),
    sb.from('services').select('id, status, price, duration_minutes'),
    sb.from('media_assets').select('id', { count: 'exact', head: true }).eq('is_published', true),
  ]);
  const settings = s as BusinessSettings;
  const svc = (services.data ?? []) as { id: string; status: string; price: number | null; duration_minutes: number | null }[];
  const active = svc.filter((x) => x.status === 'active' && x.price !== null && x.duration_minutes !== null);
  const toConfigure = svc.filter((x) => x.status === 'to_configure').length;
  const withSchedule = new Set((schedules.data ?? []).map((r) => r.employee_id));
  const withServices = new Set((empServices.data ?? []).map((r) => r.employee_id));
  const bookableEmployees = [...withSchedule].filter((id) => withServices.has(id)).length;
  const activeIds = new Set(active.map((a) => a.id));
  const servicesWithStaff = new Set((empServices.data ?? []).filter((r) => activeIds.has(r.service_id)).map((r) => r.service_id)).size;

  const steps = [
    { done: (hours.count ?? 0) > 0, essential: true, title: 'Horaires d\'ouverture', detail: `${hours.count ?? 0} jour(s) ouvert(s) renseigné(s).`, href: '/admin/parametres#horaires' },
    { done: (employees.count ?? 0) > 0 && bookableEmployees > 0, essential: true, title: 'Équipe : planning et prestations autorisées', detail: `${employees.count ?? 0} employée(s) active(s), ${bookableEmployees} avec planning et prestations.`, href: '/admin/equipe' },
    { done: active.length > 0, essential: true, title: 'Prestations : prix et durées', detail: `${active.length} prestation(s) active(s), ${toConfigure} encore « à configurer ».`, href: '/admin/prestations' },
    { done: servicesWithStaff > 0, essential: true, title: 'Au moins une prestation active réalisable par une employée', detail: `${servicesWithStaff} prestation(s) active(s) avec employée habilitée.`, href: '/admin/equipe' },
    { done: settings.accepted_payment_methods.length > 0, essential: true, title: 'Moyens de paiement', detail: settings.accepted_payment_methods.join(', '), href: '/admin/parametres#paiements' },
    { done: settings.deposit_policy !== 'none' || Boolean(settings.cancellation_policy), essential: false, title: 'Politique d\'acompte et d\'annulation', detail: settings.cancellation_policy ? 'Politique d\'annulation renseignée.' : 'Aucune politique d\'annulation saisie.', href: '/admin/parametres#reservation' },
    { done: Boolean(settings.logo_url) || (media.count ?? 0) > 0, essential: false, title: 'Logo et photos', detail: `${media.count ?? 0} média(s) publié(s). Les visuels « Photo à venir » sont remplacés automatiquement.`, href: '/admin/galerie' },
    { done: Boolean(settings.map_embed_url), essential: false, title: 'Carte de localisation', detail: 'Lien Google Maps « intégrer » avec la position exacte du salon.', href: '/admin/parametres#identite' },
    { done: Boolean(settings.wave_merchant_display || settings.orange_money_merchant_display), essential: false, title: 'Coordonnées Wave / Orange Money', detail: 'Numéros marchands communiqués aux clientes pour les acomptes.', href: '/admin/parametres#paiements' },
    { done: false, essential: false, title: 'Informations légales (NINEA, RCCM, responsable de publication)', detail: 'À transmettre à TOUBA TECH pour compléter les mentions légales.', href: '/mentions-legales' },
  ];
  const essentialDone = steps.filter((x) => x.essential).every((x) => x.done);

  return (
    <>
      <PageHeader back={{ href: '/admin/parametres', label: 'Paramètres' }} title="Configuration initiale" description="Complétez ces étapes pour ouvrir la réservation en ligne et la boutique." />
      {settings.onboarding_completed && <Alert tone="success" className="mb-6">La configuration initiale a été marquée comme terminée.</Alert>}
      <Panel>
        <ol className="grid gap-3">
          {steps.map((x, i) => (
            <li key={i}>
              <Link href={x.href} className="flex items-start gap-3 rounded-xl border border-line p-4 hover:border-blush">
                {x.done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /> : <CircleDashed className="mt-0.5 size-5 shrink-0 text-muted" />}
                <span className="flex-1"><span className="font-medium">{x.title}</span>{x.essential && <span className="ml-2 rounded-full bg-powder-100 px-2 py-0.5 text-[0.65rem] text-rosewood-dark">essentiel</span>}
                  <span className="block text-sm text-muted">{x.detail}</span></span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-5 flex gap-2 text-xs text-muted"><Info className="size-4 shrink-0" /> Aucun prix, horaire ou durée n&apos;est inventé : tant qu&apos;une prestation est « à configurer », elle s&apos;affiche « Tarif sur demande » et ne se réserve pas en ligne.</p>
        <div className="mt-6 max-w-sm"><CompleteOnboardingButton disabled={!essentialDone || settings.onboarding_completed} /></div>
      </Panel>
    </>
  );
}

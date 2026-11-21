import type { Metadata } from 'next';
import { LegalPage, ToComplete } from '@/components/site/legal';
import { getSettings } from '@/server/catalog';
import { formatPhone } from '@/lib/phone';

export const metadata: Metadata = { title: 'Mentions légales', alternates: { canonical: '/mentions-legales' } };

export default async function LegalNotice() {
  const { settings } = await getSettings();
  return (
    <LegalPage title="Mentions légales" updated="21 novembre 2026">
      <section>
        <h2>Éditeur du site</h2>
        <p>{settings.business_name} — {settings.address_line}, {settings.city}, {settings.country}.<br />
          Téléphone / WhatsApp : {formatPhone(settings.phone)}.<br />
          Forme juridique, NINEA et RCCM : <ToComplete>à compléter</ToComplete>.<br />
          Responsable de la publication : <ToComplete>à compléter</ToComplete>.</p>
      </section>
      <section>
        <h2>Conception et développement</h2>
        <p>TOUBA TECH.</p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>Site hébergé par Vercel Inc. (États-Unis). Base de données et fichiers hébergés par Supabase Inc. Région d&apos;hébergement des données : <ToComplete>à préciser lors de la création du projet</ToComplete>.</p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>Les textes, photographies et éléments graphiques du site sont la propriété de {settings.business_name} ou utilisés avec autorisation. Toute reproduction sans accord préalable est interdite. Les photos de clientes ne sont publiées qu&apos;avec leur consentement explicite.</p>
      </section>
    </LegalPage>
  );
}

import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { MediationNotice } from '@/components/legal/MediationNotice';
import { BUSINESS, FULL_ADDRESS, LEGAL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Mentions légales — TOUBA TECH Lorient',
  description:
    'Mentions légales de TOUBA TECH, atelier de réparation de smartphones, tablettes et électronique, micro-soudure et reconditionné à Lorient (Morbihan).',
  robots: { index: true, follow: true },
  alternates: { canonical: '/mentions-legales' },
};

export default function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales" lastUpdated={LEGAL.lastUpdated}>
      <h2>1. Éditeur du site</h2>
      <p>
        Le site <strong>toubatech.eu</strong> est édité par :
      </p>
      <ul>
        <li><strong>Exploitant :</strong> {LEGAL.ownerWithStatus}, exerçant sous le nom commercial TOUBA TECH</li>
        <li><strong>Statut :</strong> {LEGAL.status}</li>
        <li><strong>Adresse :</strong> {FULL_ADDRESS}, France</li>
        <li><strong>SIREN :</strong> {LEGAL.siren} — <strong>SIRET :</strong> {LEGAL.siret}</li>
        <li><strong>Immatriculation :</strong> {LEGAL.registry}</li>
        <li><strong>TVA :</strong> {LEGAL.vat}</li>
        <li><strong>Téléphone :</strong> {BUSINESS.telephoneDisplay}</li>
        <li><strong>E-mail :</strong> <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></li>
      </ul>

      <h2>2. Directeur de la publication</h2>
      <p>
        Le directeur de la publication est <strong>{LEGAL.owner}</strong>, exploitant de TOUBA TECH.
      </p>

      <h2>3. Hébergement</h2>
      <p>Le site est hébergé par :</p>
      <ul>
        <li><strong>{LEGAL.host.name}</strong>, {LEGAL.host.address}</li>
        <li>
          Site web :{' '}
          <a href={LEGAL.host.website} target="_blank" rel="noopener noreferrer">
            vercel.com
          </a>
        </li>
      </ul>
      <p>
        Les autres prestataires techniques qui traitent des données pour le compte de TOUBA TECH
        (base de données, envoi des e-mails, paiement) sont listés dans la{' '}
        <a href="/politique-confidentialite">politique de confidentialité</a>.
      </p>

      <h2>4. Activité</h2>
      <p>TOUBA TECH exerce les activités suivantes :</p>
      <ul>
        <li>Réparation de smartphones, tablettes et appareils électroniques</li>
        <li>Micro-soudure et réparation de cartes mères</li>
        <li>Réparation de trottinettes électriques</li>
        <li>Vente d'appareils reconditionnés</li>
        <li>Vente de pièces détachées</li>
      </ul>

      <h2>5. Propriété intellectuelle</h2>
      <p>
        L'ensemble des éléments composant le site toubatech.eu (textes, graphismes, logos,
        icônes, photographies, vidéos, structure, charte graphique) est la propriété exclusive de
        TOUBA TECH, sauf mention contraire, et est protégé par le droit de la propriété
        intellectuelle.
      </p>
      <p>
        Toute reproduction, représentation, modification ou adaptation de tout ou partie de ces
        éléments, quel que soit le procédé utilisé, est interdite sans l'autorisation écrite
        préalable de TOUBA TECH.
      </p>
      <p>
        Les marques citées sur ce site (Apple, Samsung, Xiaomi, etc.) appartiennent à leurs
        détenteurs respectifs. TOUBA TECH n'est ni affilié, ni partenaire, ni agréé par ces
        marques, sauf mention contraire explicite.
      </p>

      <h2>6. Responsabilité</h2>
      <p>
        TOUBA TECH s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées
        sur le site, sans pouvoir en garantir l'exhaustivité. TOUBA TECH ne saurait être tenu
        responsable des dommages résultant d'une indisponibilité du site ou de l'utilisation
        d'informations qui y figurent.
      </p>

      <h2>7. Liens hypertextes</h2>
      <p>
        Le site peut contenir des liens vers d'autres sites. TOUBA TECH n'exerce aucun contrôle sur
        ces sites et décline toute responsabilité quant à leur contenu.
      </p>

      <h2>8. Données personnelles et cookies</h2>
      <p>
        Le traitement de vos données personnelles est décrit dans la{' '}
        <a href="/politique-confidentialite">politique de confidentialité</a>, et l'usage des
        cookies dans la <a href="/cookies">politique de gestion des cookies</a>.
      </p>

      <h2>9. Réclamations et médiation de la consommation</h2>
      <MediationNotice />

      <h2>10. Droit applicable</h2>
      <p>
        Les présentes mentions légales sont régies par le droit français.
      </p>

      <h2>11. Contact</h2>
      <p>
        Pour toute question : <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> ·{' '}
        {BUSINESS.telephoneDisplay} · {FULL_ADDRESS}.
      </p>
    </LegalLayout>
  );
}

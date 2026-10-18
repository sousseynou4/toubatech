import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { BUSINESS, FULL_ADDRESS, LEGAL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — TOUBA TECH',
  description:
    'Politique de confidentialité et de protection des données personnelles (RGPD) de TOUBA TECH à Lorient.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/politique-confidentialite' },
};

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité" lastUpdated={LEGAL.lastUpdated}>
      <p>
        Cette politique explique quelles données personnelles TOUBA TECH collecte, pourquoi, avec
        qui elles sont partagées et comment exercer vos droits, conformément au Règlement général
        sur la protection des données (RGPD, règlement UE 2016/679) et à la loi « Informatique et
        Libertés ».
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        <strong>{LEGAL.ownerWithStatus}</strong>, exerçant sous le nom commercial TOUBA TECH,{' '}
        {FULL_ADDRESS}. Contact : <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> ·{' '}
        {BUSINESS.telephoneDisplay}.
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li>
          <strong>Demande de diagnostic :</strong> nom, adresse e-mail, téléphone, type d'appareil,
          marque, modèle, description de la panne, mode de prise en charge et créneau souhaité.
          Nous enregistrons aussi l'adresse IP et le type de navigateur utilisés pour envoyer la
          demande, afin de prévenir les abus.
        </li>
        <li>
          <strong>Commande en ligne :</strong> nom, adresse e-mail, téléphone, adresse de
          livraison, produits commandés et montants.
        </li>
        <li>
          <strong>Échanges :</strong> les messages que vous nous adressez par e-mail ou téléphone.
        </li>
      </ul>
      <p>
        Nous ne recevons et ne conservons <strong>aucune donnée de carte bancaire</strong> : le
        paiement est traité directement par Stripe, prestataire certifié PCI-DSS.
      </p>

      <h2>3. Finalités et bases légales</h2>
      <ul>
        <li>
          Traiter votre demande de diagnostic, établir un devis et réaliser la réparation —{' '}
          <em>mesures précontractuelles et exécution du contrat</em>.
        </li>
        <li>Traiter et livrer vos commandes, assurer le service après-vente et les garanties — <em>exécution du contrat</em>.</li>
        <li>Conserver les factures et pièces comptables — <em>obligation légale</em>.</li>
        <li>Assurer la sécurité du site et prévenir les abus — <em>intérêt légitime</em>.</li>
      </ul>
      <p>Nous n'envoyons pas de prospection commerciale sans votre accord préalable.</p>

      <h2>4. Destinataires et prestataires</h2>
      <p>
        Vos données sont traitées par TOUBA TECH et, uniquement pour les besoins décrits ci-dessus,
        par les prestataires techniques suivants :
      </p>
      <ul>
        <li><strong>Vercel</strong> — hébergement du site ;</li>
        <li><strong>Supabase</strong> — hébergement de la base de données (demandes et commandes) ;</li>
        <li><strong>Resend</strong> — envoi des e-mails de confirmation et de suivi ;</li>
        <li><strong>Stripe</strong> — paiement en ligne.</li>
      </ul>
      <p>
        Certains de ces prestataires sont établis aux États-Unis ou peuvent y traiter des données.
        Ces transferts sont encadrés par des garanties appropriées au sens du RGPD : décision
        d'adéquation de la Commission européenne (EU-US Data Privacy Framework) pour les
        entreprises certifiées, ou clauses contractuelles types de la Commission européenne.
      </p>
      <p>Nous ne vendons ni ne louons jamais vos données personnelles.</p>

      <h2>5. Durées de conservation</h2>
      <ul>
        <li><strong>Demandes de diagnostic et dossiers de réparation :</strong> 3 ans après le dernier contact ;</li>
        <li><strong>Factures et données de commande :</strong> 10 ans (obligation comptable) ;</li>
        <li><strong>Données de garantie :</strong> pendant la durée de la garantie applicable ;</li>
        <li><strong>Échanges par e-mail :</strong> 3 ans après le dernier contact.</li>
      </ul>

      <h2>6. Vos droits</h2>
      <p>
        Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, de
        portabilité et d'opposition, ainsi que du droit de retirer votre consentement à tout
        moment lorsque le traitement repose sur celui-ci, et de définir des directives relatives
        au sort de vos données après votre décès.
      </p>
      <p>
        Pour les exercer, écrivez à <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> ou à
        l'adresse de l'atelier. Nous répondons dans un délai d'un mois.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
        réclamation auprès de la CNIL :{' '}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Les échanges avec le site sont chiffrés (HTTPS), l'accès aux données est limité à TOUBA
        TECH au moyen d'une authentification sécurisée, et nos prestataires mettent en œuvre leurs
        propres mesures de sécurité.
      </p>

      <h2>8. Cookies</h2>
      <p>
        L'usage des cookies et autres traceurs est décrit dans la{' '}
        <a href="/cookies">politique de gestion des cookies</a>.
      </p>

      <h2>9. Modifications</h2>
      <p>
        Cette politique peut être mise à jour ; la date de dernière mise à jour figure en haut de
        la page.
      </p>
    </LegalLayout>
  );
}

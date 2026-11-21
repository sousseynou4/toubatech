import type { Metadata } from 'next';
import { LegalPage, ToComplete } from '@/components/site/legal';
import { getSettings } from '@/server/catalog';
import { formatPhone } from '@/lib/phone';

export const metadata: Metadata = { title: 'Politique de confidentialité', alternates: { canonical: '/confidentialite' } };

export default async function Privacy() {
  const { settings } = await getSettings();
  return (
    <LegalPage title="Politique de confidentialité" updated="21 novembre 2026">
      <section>
        <h2>Responsable du traitement</h2>
        <p>{settings.business_name}, {settings.address_line}, {settings.city}. Contact : {formatPhone(settings.phone)}.</p>
      </section>
      <section>
        <h2>Données collectées et finalités</h2>
        <ul>
          <li>Réservation : nom, téléphone, email facultatif, prestation, date, remarques — pour gérer votre rendez-vous.</li>
          <li>Commande : nom, téléphone, adresse de livraison le cas échéant — pour préparer et remettre votre commande.</li>
          <li>Devis événementiel : informations sur l&apos;événement et photos d&apos;inspiration — pour établir le devis.</li>
          <li>Historique des prestations et achats, préférences — pour personnaliser votre accueil et gérer la fidélité.</li>
        </ul>
      </section>
      <section>
        <h2>Communications</h2>
        <p>Les messages liés à votre rendez-vous ou à votre commande (confirmation, rappel) vous sont envoyés car ils sont nécessaires au service. Les offres commerciales ne vous sont adressées que si vous les avez acceptées, et vous pouvez vous y opposer à tout moment par simple message.</p>
      </section>
      <section>
        <h2>Photos</h2>
        <p>Aucune photo de cliente n&apos;est publiée (galerie, réseaux sociaux) sans son consentement explicite, enregistré dans sa fiche et révocable à tout moment.</p>
      </section>
      <section>
        <h2>Accès et sécurité</h2>
        <p>Les données sont accessibles uniquement aux membres de l&apos;équipe habilités, selon leur rôle. Les accès sensibles sont journalisés.</p>
      </section>
      <section>
        <h2>Durée de conservation</h2>
        <p><ToComplete>Durées à définir par Dada Beauty</ToComplete> (par exemple : 3 ans après la dernière visite pour les fiches clientes ; durée légale pour les pièces comptables).</p>
      </section>
      <section>
        <h2>Vos droits</h2>
        <p>Conformément à la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;opposition et de suppression. Pour l&apos;exercer, contactez-nous au {formatPhone(settings.phone)}. Vous pouvez également saisir la Commission de Protection des Données Personnelles (CDP).</p>
      </section>
    </LegalPage>
  );
}

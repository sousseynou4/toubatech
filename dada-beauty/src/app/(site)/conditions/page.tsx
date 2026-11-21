import type { Metadata } from 'next';
import { LegalPage, ToComplete } from '@/components/site/legal';
import { getSettings } from '@/server/catalog';
import { formatXOF } from '@/lib/format';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Conditions de réservation et de vente', alternates: { canonical: '/conditions' } };

export default async function Terms() {
  const { settings } = await getSettings();
  const deposit = settings.deposit_policy === 'percent' ? `${settings.deposit_value} % du prix de la prestation`
    : settings.deposit_policy === 'fixed' ? formatXOF(settings.deposit_value) : null;
  return (
    <LegalPage title="Conditions de réservation et de vente" updated="21 novembre 2026">
      <section>
        <h2>Réservation en ligne</h2>
        <p>Toute réservation effectuée sur le site est une <strong>demande</strong> : elle est confirmée par le salon (message ou appel). Les créneaux proposés tiennent compte des disponibilités réelles de l&apos;équipe au moment de la demande.</p>
        {settings.booking_terms && <p className="mt-2 whitespace-pre-line">{settings.booking_terms}</p>}
      </section>
      <section>
        <h2>Acompte</h2>
        <p>{deposit ? `Un acompte de ${deposit} peut être demandé pour confirmer certaines prestations. Il est déduit du montant final.` : 'Aucun acompte n\'est exigé par défaut. Certaines prestations (mariées, événements) peuvent faire l\'objet d\'un acompte précisé dans le devis.'}</p>
      </section>
      <section>
        <h2>Annulation et retard</h2>
        <p className="whitespace-pre-line">{settings.cancellation_policy ?? <ToComplete>Politique d&apos;annulation à définir par Dada Beauty (délai, sort de l&apos;acompte, retards).</ToComplete>}</p>
        <p className="mt-2">Vous pouvez annuler en ligne jusqu&apos;à {Math.round(settings.booking_min_lead_minutes / 60)} h avant votre rendez-vous, depuis la page « Suivre une réservation ».</p>
      </section>
      <section>
        <h2>Boutique</h2>
        <p>Les prix sont indiqués en francs CFA (FCFA), toutes taxes comprises le cas échéant. Une commande est confirmée par le salon après vérification de la disponibilité. Retrait au salon{settings.delivery_enabled ? ' ou livraison' : ''} selon les options proposées lors de la commande. {settings.delivery_zones_note}</p>
        <p className="mt-2">Retours, échanges et produits d&apos;hygiène (perruques portées, produits ouverts) : <ToComplete>conditions à définir</ToComplete>.</p>
      </section>
      <section>
        <h2>Paiement</h2>
        <p>Moyens acceptés : espèces au salon et, selon les options affichées, Wave ou Orange Money. Un paiement n&apos;est considéré comme reçu qu&apos;après vérification par le salon ou confirmation du prestataire de paiement.</p>
      </section>
    </LegalPage>
  );
}

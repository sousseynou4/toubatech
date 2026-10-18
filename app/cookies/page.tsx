import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { BUSINESS, LEGAL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Politique de gestion des cookies — TOUBA TECH',
  description:
    'Politique de gestion des cookies de TOUBA TECH : traceurs utilisés sur toubatech.eu et comment les gérer.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <LegalLayout title="Politique de gestion des cookies" lastUpdated={LEGAL.lastUpdated}>
      <h2>1. Qu'est-ce qu'un cookie ?</h2>
      <p>
        Un cookie, ou plus largement un traceur, est une petite information enregistrée par votre
        navigateur lorsque vous consultez un site. Elle permet par exemple de mémoriser le contenu
        de votre panier.
      </p>

      <h2>2. Les traceurs utilisés sur toubatech.eu</h2>
      <p>
        À ce jour, le site n'utilise <strong>que des traceurs strictement nécessaires</strong> à
        son fonctionnement. Ils sont exemptés de consentement :
      </p>
      <ul>
        <li>
          <strong>Panier :</strong> les produits ajoutés au panier sont mémorisés dans votre
          navigateur (stockage local), jusqu'à la commande ou à leur suppression.
        </li>
        <li>
          <strong>Session d'administration :</strong> un cookie sécurisé maintient la connexion à
          l'espace réservé à TOUBA TECH. Il n'est jamais déposé chez les visiteurs.
        </li>
      </ul>
      <p>
        Le site n'utilise actuellement <strong>aucun cookie de mesure d'audience ni de
        publicité</strong>. Si nous en ajoutons, ils ne seront déposés qu'avec votre consentement,
        recueilli au moyen d'un bandeau vous permettant d'accepter ou de refuser aussi simplement,
        et cette page sera mise à jour.
      </p>

      <h2>3. Paiement</h2>
      <p>
        Le paiement s'effectue sur la page sécurisée de notre prestataire Stripe, qui peut déposer
        ses propres cookies pour sécuriser la transaction et prévenir la fraude. Voir la{' '}
        <a href="https://stripe.com/fr/privacy" target="_blank" rel="noopener noreferrer">
          politique de confidentialité de Stripe
        </a>
        .
      </p>

      <h2>4. Gérer les cookies dans votre navigateur</h2>
      <p>Vous pouvez à tout moment supprimer ou bloquer les cookies depuis votre navigateur :</p>
      <ul>
        <li><strong>Chrome :</strong> Paramètres → Confidentialité et sécurité → Cookies</li>
        <li><strong>Firefox :</strong> Paramètres → Vie privée et sécurité → Cookies</li>
        <li><strong>Safari :</strong> Réglages → Confidentialité</li>
        <li><strong>Edge :</strong> Paramètres → Cookies et autorisations de site</li>
      </ul>
      <p>
        Supprimer les données du site efface aussi le contenu de votre panier.
      </p>

      <h2>5. Contact</h2>
      <p>
        Pour toute question : <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
      </p>
    </LegalLayout>
  );
}

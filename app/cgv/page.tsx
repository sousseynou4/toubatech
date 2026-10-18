import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { MediationNotice } from '@/components/legal/MediationNotice';
import { BUSINESS, FULL_ADDRESS, LEGAL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente — TOUBA TECH',
  description:
    'Conditions Générales de Vente de TOUBA TECH : réparation, micro-soudure, appareils reconditionnés et pièces détachées à Lorient (Morbihan).',
  robots: { index: true, follow: true },
  alternates: { canonical: '/cgv' },
};

export default function CGVPage() {
  return (
    <LegalLayout title="Conditions Générales de Vente" lastUpdated={LEGAL.lastUpdated}>
      <h2>Article 1 — Vendeur et champ d'application</h2>
      <p>
        Les présentes Conditions Générales de Vente (« CGV ») régissent les ventes de biens et les
        prestations de services conclues entre <strong>{LEGAL.ownerWithStatus}</strong>, exerçant
        sous le nom commercial TOUBA TECH ({LEGAL.status}, SIRET {LEGAL.siret}, {FULL_ADDRESS},{' '}
        {BUSINESS.telephoneDisplay}, {BUSINESS.email}), ci-après « TOUBA TECH », et toute personne
        physique ou morale, ci-après « le Client », passant commande sur le site toubatech.eu ou à
        l'atelier.
      </p>
      <p>
        Toute commande ou demande de prestation implique l'acceptation des présentes CGV, mises à
        la disposition du Client avant la commande.
      </p>

      <h2>Article 2 — Produits et prestations</h2>
      <p>TOUBA TECH propose :</p>
      <ul>
        <li>la réparation de smartphones, tablettes et appareils électroniques ;</li>
        <li>la micro-soudure et la réparation de cartes mères ;</li>
        <li>la réparation de trottinettes électriques ;</li>
        <li>la vente d'appareils reconditionnés ;</li>
        <li>la vente de pièces détachées.</li>
      </ul>
      <p>
        Les caractéristiques essentielles des produits sont présentées sur leur fiche. L'état
        esthétique des appareils reconditionnés est indiqué par un grade (A, B ou C) ; les
        photographies sont fournies à titre illustratif.
      </p>

      <h2>Article 3 — Prix</h2>
      <p>
        Les prix sont indiqués en euros. TOUBA TECH relève de la franchise en base de TVA :{' '}
        <strong>{LEGAL.vat}</strong>. Les prix affichés sont donc des prix nets, sans TVA. Les
        éventuels frais de livraison sont indiqués avant la validation de la commande.
      </p>
      <p>
        Le pré-diagnostic en ligne est gratuit et sans engagement. Toute réparation fait l'objet
        d'un devis préalable : aucune intervention payante n'est réalisée sans l'accord du Client.
      </p>

      <h2>Article 4 — Commande et paiement</h2>
      <p>
        Les commandes en ligne sont payées lors de leur validation, par carte bancaire, Apple Pay
        ou Google Pay, via le prestataire de paiement sécurisé <strong>Stripe</strong>. TOUBA TECH
        n'a jamais accès aux données de carte bancaire. La commande est ferme à réception de la
        confirmation de paiement, envoyée par e-mail.
      </p>

      <h2>Article 5 — Retrait, livraison et transfert des risques</h2>
      <p>
        Les produits peuvent être retirés à l'atelier ({FULL_ADDRESS}). Lorsque l'expédition est
        proposée, son délai est indiqué avant la validation de la commande ; à défaut, le bien est
        livré au plus tard 30 jours après la conclusion du contrat (article L.216-1 du Code de la
        consommation).
      </p>
      <p>
        En cas de retard, le Client consommateur peut, après avoir enjoint TOUBA TECH d'effectuer
        la livraison dans un délai supplémentaire raisonnable, résoudre le contrat si la livraison
        n'intervient pas dans ce délai, et obtenir le remboursement des sommes versées (articles
        L.216-6 et L.216-7 du Code de la consommation).
      </p>
      <p>
        Les risques de perte ou d'endommagement du bien sont transférés au Client consommateur au
        moment où il en prend physiquement possession.
      </p>

      <h2>Article 6 — Droit de rétractation (achats en ligne)</h2>
      <p>
        Pour les contrats conclus à distance, le Client consommateur dispose d'un délai de{' '}
        <strong>14 jours</strong> pour se rétracter, sans avoir à motiver sa décision (articles
        L.221-18 et suivants du Code de la consommation). Ce délai court à compter de la réception
        du bien, ou de la conclusion du contrat pour une prestation de service.
      </p>
      <p>
        Pour l'exercer, le Client informe TOUBA TECH de sa décision par une déclaration dénuée
        d'ambiguïté (e-mail à <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> ou courrier
        à l'adresse de l'atelier), par exemple au moyen du formulaire ci-dessous. Il renvoie ou
        rapporte le bien au plus tard 14 jours après avoir communiqué sa décision ; les frais de
        retour sont à sa charge.
      </p>
      <p>
        TOUBA TECH rembourse la totalité des sommes versées, y compris les frais de livraison
        initiaux (hors surcoût d'un mode de livraison plus coûteux choisi par le Client), au plus
        tard 14 jours après avoir été informé de la décision, par le même moyen de paiement. Le
        remboursement peut être différé jusqu'à la récupération du bien ou la preuve de son
        expédition. La responsabilité du Client peut être engagée en cas de dépréciation du bien
        résultant de manipulations autres que celles nécessaires pour en établir la nature, les
        caractéristiques et le bon fonctionnement.
      </p>
      <p>Le droit de rétractation ne s'applique pas notamment :</p>
      <ul>
        <li>
          aux prestations de réparation pleinement exécutées avant la fin du délai de rétractation,
          lorsque leur exécution a commencé après accord préalable exprès du Client et
          renoncement exprès à son droit de rétractation ;
        </li>
        <li>aux biens confectionnés selon les spécifications du Client ou nettement personnalisés ;</li>
        <li>aux contrats conclus à l'atelier, en présence du Client (le droit de rétractation est propre à la vente à distance).</li>
      </ul>
      <h3>Formulaire de rétractation</h3>
      <div className="highlight-box">
        <p>
          (Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous
          rétracter du contrat.)
        </p>
        <p>
          À l'attention de {LEGAL.ownerWithStatus} — TOUBA TECH, {FULL_ADDRESS},{' '}
          {BUSINESS.email} :
        </p>
        <p>
          Je/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du
          contrat portant sur la vente du bien (*)/pour la prestation de services (*) ci-dessous :
        </p>
        <p>
          Commandé le (*)/reçu le (*) :<br />
          Nom du (des) consommateur(s) :<br />
          Adresse du (des) consommateur(s) :<br />
          Signature du (des) consommateur(s) (uniquement en cas de notification du présent
          formulaire sur papier) :<br />
          Date :
        </p>
        <p>(*) Rayez la mention inutile.</p>
      </div>

      <h2>Article 7 — Garanties</h2>
      <h3>7.1 Garantie légale de conformité et garantie des vices cachés</h3>
      <p>
        Les biens vendus par TOUBA TECH bénéficient des garanties légales suivantes, dans les
        conditions reproduites ci-dessous.
      </p>
      <div className="highlight-box">
        <p>
          Le consommateur dispose d'un délai de deux ans à compter de la délivrance du bien pour
          obtenir la mise en œuvre de la garantie légale de conformité en cas d'apparition d'un
          défaut de conformité. Durant ce délai, le consommateur n'est tenu d'établir que
          l'existence du défaut de conformité et non la date d'apparition de celui-ci.
        </p>
        <p>
          Lorsque le contrat de vente du bien prévoit la fourniture d'un contenu numérique ou d'un
          service numérique de manière continue pendant une durée supérieure à deux ans, la
          garantie légale est applicable à ce contenu numérique ou ce service numérique tout au
          long de la période de fourniture prévue. Durant ce délai, le consommateur n'est tenu
          d'établir que l'existence du défaut de conformité affectant le contenu numérique ou le
          service numérique et non la date d'apparition de celui-ci.
        </p>
        <p>
          La garantie légale de conformité emporte obligation pour le professionnel, le cas
          échéant, de fournir toutes les mises à jour nécessaires au maintien de la conformité du
          bien.
        </p>
        <p>
          La garantie légale de conformité donne au consommateur droit à la réparation ou au
          remplacement du bien dans un délai de trente jours suivant sa demande, sans frais et
          sans inconvénient majeur pour lui.
        </p>
        <p>
          Si le bien est réparé dans le cadre de la garantie légale de conformité, le consommateur
          bénéficie d'une extension de six mois de la garantie initiale.
        </p>
        <p>
          Si le consommateur demande la réparation du bien, mais que le vendeur impose le
          remplacement, la garantie légale de conformité est renouvelée pour une période de deux
          ans à compter de la date de remplacement du bien.
        </p>
        <p>
          Le consommateur peut obtenir une réduction du prix d'achat en conservant le bien ou
          mettre fin au contrat en se faisant rembourser intégralement contre restitution du bien,
          si :
        </p>
        <p>
          1° Le professionnel refuse de réparer ou de remplacer le bien ;<br />
          2° La réparation ou le remplacement du bien intervient après un délai de trente jours ;
          <br />
          3° La réparation ou le remplacement du bien occasionne un inconvénient majeur pour le
          consommateur, notamment lorsque le consommateur supporte définitivement les frais de
          reprise ou d'enlèvement du bien non conforme, ou s'il supporte les frais d'installation
          du bien réparé ou de remplacement ;<br />
          4° La non-conformité du bien persiste en dépit de la tentative de mise en conformité du
          vendeur restée infructueuse.
        </p>
        <p>
          Le consommateur a également droit à une réduction du prix du bien ou à la résolution du
          contrat lorsque le défaut de conformité est si grave qu'il justifie que la réduction du
          prix ou la résolution du contrat soit immédiate. Le consommateur n'est alors pas tenu de
          demander la réparation ou le remplacement du bien au préalable.
        </p>
        <p>Le consommateur n'a pas droit à la résolution de la vente si le défaut de conformité est mineur.</p>
        <p>
          Toute période d'immobilisation du bien en vue de sa réparation ou de son remplacement
          suspend la garantie qui restait à courir jusqu'à la délivrance du bien remis en état.
        </p>
        <p>
          Les droits mentionnés ci-dessus résultent de l'application des articles L. 217-1 à L.
          217-32 du code de la consommation.
        </p>
        <p>
          Le vendeur qui fait obstacle de mauvaise foi à la mise en œuvre de la garantie légale de
          conformité encourt une amende civile d'un montant maximal de 300 000 euros, qui peut
          être porté jusqu'à 10 % du chiffre d'affaires moyen annuel (article L. 241-5 du code de
          la consommation).
        </p>
        <p>
          Le consommateur bénéficie également de la garantie légale des vices cachés en
          application des articles 1641 à 1649 du code civil, pour une durée de deux ans à compter
          de la découverte du défaut. Cette garantie donne droit à une réduction de prix si le bien
          est conservé ou à un remboursement intégral contre restitution du bien.
        </p>
      </div>
      <p>
        Pour les biens d'occasion, dont les appareils reconditionnés, les défauts de conformité
        qui apparaissent dans un délai de douze mois à compter de la délivrance du bien sont
        présumés exister au moment de la délivrance (article L.217-7 du Code de la consommation).
      </p>

      <h3>7.2 Garantie commerciale TOUBA TECH</h3>
      <p>
        En complément des garanties légales, et sans les remplacer, TOUBA TECH accorde une{' '}
        <strong>garantie commerciale de 12 mois</strong>, pièces et main-d'œuvre, sur les
        réparations effectuées et sur les appareils reconditionnés, à compter de la restitution de
        l'appareil réparé ou de la délivrance de l'appareil acheté.
      </p>
      <ul>
        <li><strong>Garant :</strong> {LEGAL.ownerWithStatus} — TOUBA TECH, {FULL_ADDRESS}.</li>
        <li><strong>Étendue territoriale :</strong> France.</li>
        <li>
          <strong>Mise en œuvre :</strong> sur présentation de la facture, à l'atelier ou par
          e-mail à <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
        </li>
        <li>
          <strong>Exclusions :</strong> dommages résultant d'une mauvaise utilisation, d'une chute
          ou d'un contact avec un liquide postérieurs à l'intervention ; intervention d'un tiers
          après notre prestation ; usure normale, notamment des batteries.
        </li>
      </ul>
      <p>
        La garantie commerciale ne prive pas le Client des garanties légales de conformité et des
        vices cachés, qui s'appliquent dans tous les cas.
      </p>

      <h2>Article 8 — Réparations : données et appareils oxydés</h2>
      <p>
        Toute intervention sur un appareil endommagé comporte un risque, notamment de perte de
        données. Le Client est invité à sauvegarder ses données avant de confier son appareil.
      </p>
      <p>
        Pour les appareils ayant subi un dégât des eaux ou une oxydation, aucun résultat ne peut
        être garanti : le diagnostic peut conclure à l'impossibilité de réparer. Le Client en est
        informé avant toute intervention payante.
      </p>

      <h2>Article 9 — Appareils non récupérés</h2>
      <p>
        Le Client est informé de la fin de l'intervention par e-mail, SMS ou téléphone.
        Conformément à la loi du 31 décembre 1903 relative à la vente de certains objets
        abandonnés, un appareil confié pour réparation et non retiré dans un délai d'un an peut
        être vendu, sur autorisation du juge et dans les conditions prévues par cette loi.
      </p>

      <h2>Article 10 — Réclamations, médiation et litiges</h2>
      <MediationNotice />
      <p>
        Les présentes CGV sont soumises au droit français. À défaut de résolution amiable, le
        litige est porté devant la juridiction compétente selon les règles de droit commun.
      </p>

      <h2>Article 11 — Données personnelles</h2>
      <p>
        Les données collectées lors d'une commande ou d'une demande de diagnostic sont traitées
        conformément à la <a href="/politique-confidentialite">politique de confidentialité</a>.
      </p>
    </LegalLayout>
  );
}

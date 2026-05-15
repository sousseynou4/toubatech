/**
 * Single source of truth for the /reparation page.
 * Edit prices and content here — JSX stays untouched.
 *
 * Pricing rule: always "à partir de" (starting from), never a fixed price,
 * because actual cost depends on diagnostic. This protects from legal
 * issues with the "prix barré" article L.121-2 of the Consumer Code.
 */

export interface RepairService {
  slug: string;
  title: string;
  level: 'Standard' | 'Avancé' | 'Expert';
  shortDescription: string;
  longDescription: string;
  features: string[];
  averageDuration: string;
}

export const SERVICES: RepairService[] = [
  {
    slug: 'remplacement-standard',
    title: 'Remplacement écran & batterie',
    level: 'Standard',
    shortDescription:
      'Les réparations les plus courantes, traitées en express dans notre atelier de Lorient.',
    longDescription:
      "Remplacement de vitre tactile, dalle LCD ou OLED, batterie défaillante, connecteur de charge usé, haut-parleur, microphone, caméra. Nous travaillons avec des pièces certifiées d'origine ou de qualité équivalente, jamais de pièces compatibles bas de gamme.",
    features: [
      'Écrans OEM ou qualité incell premium',
      'Batteries grade A — cycles garantis',
      'Pose en moins de 60 minutes pour les modèles courants',
      'Test fonctionnel complet avant restitution',
    ],
    averageDuration: '30 min — 2h',
  },
  {
    slug: 'micro-soudure',
    title: 'Micro-soudure avancée',
    level: 'Expert',
    shortDescription:
      "Là où d'autres déclarent un appareil irréparable, nous intervenons au composant près.",
    longDescription:
      "Reballing de processeur, remplacement de puce de charge IC, réparation de tracé de carte mère, déshabillage et soudure de composants en BGA. Nos techniciens sont formés aux techniques utilisées dans l'industrie aéronautique et médicale.",
    features: [
      'Station de soudure à air chaud précision 0,1°C',
      'Microscope binoculaire 40x',
      'Remplacement de composants 0201 (les plus fins du marché)',
      'Récupération possible après chute violente ou court-circuit',
    ],
    averageDuration: '24 — 72h',
  },
  {
    slug: 'desoxydation',
    title: 'Désoxydation en salle blanche',
    level: 'Avancé',
    shortDescription:
      "Votre appareil a pris l'eau ? Plus chaque heure passe, plus la corrosion gagne du terrain.",
    longDescription:
      "Démontage complet, nettoyage des cartes mères en bain ultrasons avec solvants de qualité électronique, séchage contrôlé, remplacement des composants oxydés. Intervention dans un environnement filtré pour éviter toute contamination supplémentaire.",
    features: [
      'Bain ultrasons 40 kHz spécialisé électronique',
      'Solvants non conducteurs grade laboratoire',
      'Diagnostic post-désoxydation systématique',
      'Taux de réussite : 85 % sur intervention dans les 48h',
    ],
    averageDuration: '48 — 96h',
  },
  {
    slug: 'recuperation-donnees',
    title: 'Récupération de données',
    level: 'Expert',
    shortDescription:
      "Appareil HS, mais vos photos, contacts et documents sont irremplaçables.",
    longDescription:
      "Quand votre smartphone ou tablette refuse de démarrer, nous pouvons souvent récupérer les données stockées sur la mémoire interne. Lecture directe sur puce NAND, contournement de contrôleur défaillant, extraction sécurisée vers support externe.",
    features: [
      'Lecture directe puce eMMC / UFS',
      'Contournement panneau de contrôle défectueux',
      'Confidentialité absolue — engagement écrit',
      'Diagnostic et devis avant toute intervention',
    ],
    averageDuration: '72h — 1 semaine',
  },
];

export interface PriceItem {
  service: string;
  price: number; // EUR, "starting from"
  note?: string;
}

export interface PriceCatalog {
  brand: string;
  popular: string;
  items: PriceItem[];
}

/**
 * Indicative prices — always "à partir de".
 * Final price always confirmed by diagnostic.
 */
export const PRICING: PriceCatalog[] = [
  {
    brand: 'Apple iPhone',
    popular: 'Du SE au 15 Pro Max',
    items: [
      { service: 'Remplacement écran', price: 79, note: 'Selon modèle' },
      { service: 'Remplacement batterie', price: 49 },
      { service: 'Connecteur de charge', price: 59 },
      { service: 'Désoxydation', price: 89 },
      { service: 'Micro-soudure', price: 120, note: 'Devis personnalisé' },
    ],
  },
  {
    brand: 'Samsung Galaxy',
    popular: 'Série S, A, Note, Z Flip / Fold',
    items: [
      { service: 'Remplacement écran AMOLED', price: 99, note: 'Selon modèle' },
      { service: 'Remplacement batterie', price: 49 },
      { service: 'Vitre arrière', price: 45 },
      { service: 'Désoxydation', price: 89 },
      { service: 'Micro-soudure', price: 130, note: 'Devis personnalisé' },
    ],
  },
];

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

export const PROCESS_STEPS: ProcessStep[] = [
  {
    number: '01',
    title: 'Diagnostic en ligne',
    description:
      "Remplissez notre formulaire en 2 minutes. Décrivez la panne, choisissez votre mode de prise en charge — siège Lorient, point relais Morbihan ou déplacement à domicile.",
  },
  {
    number: '02',
    title: 'Devis transparent',
    description:
      'Sous 24h ouvrées, vous recevez un pré-diagnostic et un devis détaillé. Pas de surprise : le tarif annoncé est le tarif facturé. Aucune intervention sans votre accord.',
  },
  {
    number: '03',
    title: 'Réparation certifiée',
    description:
      'Nos techniciens interviennent avec des pièces certifiées et un outillage professionnel. Photos avant/après pour les interventions complexes. Suivi en temps réel.',
  },
  {
    number: '04',
    title: 'Garantie 12 mois',
    description:
      'Tous nos travaux sont garantis 12 mois pièces et main-d\'œuvre. Restitution avec rapport technique. Service après-vente joignable à Lorient sans déplacement supplémentaire.',
  },
];

export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ: FAQItem[] = [
  {
    question: 'Combien de temps pour réparer mon smartphone ?',
    answer:
      "Pour les réparations courantes (écran, batterie, connecteur de charge), comptez entre 30 minutes et 2 heures dans notre atelier de Lorient. Les interventions de micro-soudure ou désoxydation nécessitent 48 à 72 heures pour garantir un séchage et des tests rigoureux.",
  },
  {
    question: 'Intervenez-vous à domicile dans le Morbihan ?',
    answer:
      "Oui, nous proposons un service de déplacement à domicile dans tout le Morbihan. Une participation aux frais de déplacement s'applique selon la distance depuis Lorient. Idéal pour les particuliers qui ne peuvent pas se déplacer ou les professionnels qui souhaitent éviter une coupure d'activité.",
  },
  {
    question: 'Quelle est la différence entre une pièce OEM et compatible ?',
    answer:
      'OEM signifie "Original Equipment Manufacturer" — pièce fabriquée par le fournisseur d\'origine, qualité identique au neuf. Les pièces compatibles peuvent être de qualité variable. Chez TOUBA TECH, nous privilégions les pièces OEM ou équivalent premium — jamais de compatible bas de gamme.',
  },
  {
    question: 'Mes données sont-elles en sécurité pendant la réparation ?',
    answer:
      "Absolument. Nous signons un engagement de confidentialité écrit pour toute intervention. Nos techniciens n'accèdent à vos données que si c'est strictement nécessaire à la réparation. Pour les interventions sensibles, vous pouvez assister à l'intervention.",
  },
  {
    question: 'La garantie couvre quoi exactement ?',
    answer:
      "Notre garantie de 12 mois couvre la pièce remplacée et la main-d'œuvre. Si la même panne réapparaît dans l'année, l'intervention est entièrement gratuite. Sont exclus les nouveaux dommages (chute, contact avec un liquide) postérieurs à la réparation.",
  },
  {
    question: 'Pourquoi choisir un réparateur local plutôt que la marque ?',
    answer:
      "Réparer localement, c'est soutenir l'économie de proximité bretonne, réduire l'empreinte carbone de votre appareil, et bénéficier d'un interlocuteur direct à Lorient. Nos tarifs sont en moyenne 30 à 50 % inférieurs aux services constructeur, pour une qualité équivalente.",
  },
];

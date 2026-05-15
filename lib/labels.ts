/**
 * Server-safe label dictionary.
 * Used to render French labels in emails and back-office views,
 * without coupling to client-only React components.
 */
export const DEVICE_LABELS: Record<string, string> = {
  smartphone: 'Smartphone',
  tablette: 'Tablette',
  'pc-portable': 'PC portable',
  console: 'Console de jeu',
  autre: 'Autre appareil',
};

export const PROBLEM_LABELS: Record<string, string> = {
  ecran: 'Écran cassé',
  batterie: 'Batterie faible',
  charge: 'Connecteur de charge',
  oxydation: 'Oxydation / contact eau',
  'micro-soudure': 'Micro-soudure requise',
  logiciel: 'Problème logiciel',
  autre: 'Autre problème',
};

export const INCIDENT_LABELS: Record<string, string> = {
  chute: 'Chute',
  eau: 'Contact avec un liquide',
  'reparation-anterieure': 'Tentative de réparation précédente',
  aucun: 'Aucun événement particulier',
};

export const PICKUP_LABELS: Record<string, string> = {
  siege: 'Au siège à Lorient',
  'point-relais': 'Point relais Morbihan',
  domicile: 'Déplacement à domicile',
};

export const PICKUP_DESCRIPTIONS: Record<string, string> = {
  siege:
    "Vous pourrez déposer votre appareil directement à notre siège à Lorient, sans rendez-vous nécessaire.",
  'point-relais':
    'Notre réseau de points relais partenaires couvre tout le Morbihan. Nous vous communiquerons l\'adresse la plus proche.',
  domicile:
    'Un technicien se déplacera à votre domicile dans le Morbihan. Des frais de déplacement peuvent s\'appliquer selon la distance.',
};

export const TIME_LABELS: Record<string, string> = {
  matin: 'Matin (9h – 12h)',
  'apres-midi': 'Après-midi (14h – 18h)',
  indifferent: 'Indifférent',
};

/* ── Diagnostic workflow statuses ──────────────────────────────────────── */

export type DiagnosticStatus =
  | 'received'
  | 'analyzing'
  | 'quoted'
  | 'approved'
  | 'in_progress'
  | 'testing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export const STATUS_LABELS: Record<DiagnosticStatus, string> = {
  received: 'Nouvelle demande',
  analyzing: 'Diagnostic en cours',
  quoted: 'Devis envoyé',
  approved: 'Devis accepté',
  in_progress: 'Réparation en cours',
  testing: 'Tests finaux',
  ready: 'Prêt à restituer',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

export type StatusTone = 'neutral' | 'blue' | 'amber' | 'emerald' | 'red';

export const STATUS_TONES: Record<DiagnosticStatus, StatusTone> = {
  received: 'blue',
  analyzing: 'blue',
  quoted: 'amber',
  approved: 'emerald',
  in_progress: 'blue',
  testing: 'amber',
  ready: 'emerald',
  completed: 'emerald',
  cancelled: 'red',
};

/** Ordered list of statuses for select inputs and progress display. */
export const STATUS_ORDER: DiagnosticStatus[] = [
  'received',
  'analyzing',
  'quoted',
  'approved',
  'in_progress',
  'testing',
  'ready',
  'completed',
  'cancelled',
];

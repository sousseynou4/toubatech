export type DeviceType = 'smartphone' | 'tablette' | 'pc-portable' | 'console' | 'autre';

export type Pickup = 'siege' | 'point-relais' | 'domicile';

export type ProblemKey =
  | 'ecran'
  | 'batterie'
  | 'charge'
  | 'oxydation'
  | 'micro-soudure'
  | 'logiciel'
  | 'autre';

export type IncidentKey = 'chute' | 'eau' | 'reparation-anterieure' | 'aucun';

export interface DiagnosticData {
  // Step 1
  device: DeviceType | null;
  // Step 2
  brand: string;
  model: string;
  // Step 3
  problems: ProblemKey[];
  problemDetails: string;
  // Step 4
  incident: IncidentKey | null;
  incidentDetails: string;
  // Step 5
  fullName: string;
  email: string;
  phone: string;
  pickup: Pickup | null;
  preferredDate: string;
  preferredTime: string;
  consent: boolean;
}

export const initialData: DiagnosticData = {
  device: null,
  brand: '',
  model: '',
  problems: [],
  problemDetails: '',
  incident: null,
  incidentDetails: '',
  fullName: '',
  email: '',
  phone: '',
  pickup: null,
  preferredDate: '',
  preferredTime: '',
  consent: false,
};

export const STEPS = [
  { id: 1, label: 'Appareil', short: 'Type' },
  { id: 2, label: 'Modèle', short: 'Modèle' },
  { id: 3, label: 'Problème', short: 'Panne' },
  { id: 4, label: 'Historique', short: 'Contexte' },
  { id: 5, label: 'Coordonnées', short: 'Contact' },
  { id: 6, label: 'Récapitulatif', short: 'Récap' },
] as const;

export const DEVICE_OPTIONS: { key: DeviceType; label: string; description: string }[] = [
  { key: 'smartphone', label: 'Smartphone', description: 'iPhone, Galaxy, Pixel…' },
  { key: 'tablette', label: 'Tablette', description: 'iPad, Galaxy Tab…' },
  { key: 'pc-portable', label: 'PC portable', description: 'MacBook, Windows, Linux' },
  { key: 'console', label: 'Console', description: 'Switch, PS, Xbox' },
  { key: 'autre', label: 'Autre', description: 'Décrivez votre appareil' },
];

// Brand catalogue per device type — extend over time
export const BRAND_CATALOG: Record<DeviceType, string[]> = {
  smartphone: ['Apple', 'Samsung', 'Google', 'Xiaomi', 'OnePlus', 'Huawei', 'Sony', 'Honor', 'Oppo', 'Autre'],
  tablette: ['Apple', 'Samsung', 'Lenovo', 'Microsoft', 'Huawei', 'Autre'],
  'pc-portable': ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Microsoft', 'Razer', 'Autre'],
  console: ['Nintendo', 'Sony', 'Microsoft', 'Steam Deck', 'Autre'],
  autre: ['Autre'],
};

export const PROBLEM_OPTIONS: { key: ProblemKey; label: string; description: string }[] = [
  { key: 'ecran', label: 'Écran cassé', description: 'Vitre fissurée, dalle HS, tactile défaillant' },
  { key: 'batterie', label: 'Batterie faible', description: 'Autonomie réduite, ne tient plus la charge' },
  { key: 'charge', label: 'Connecteur de charge', description: 'Charge intermittente ou impossible' },
  { key: 'oxydation', label: 'Oxydation / contact eau', description: 'Désoxydation et nettoyage en salle blanche' },
  { key: 'micro-soudure', label: 'Micro-soudure', description: 'Carte mère, composant à ressouder' },
  { key: 'logiciel', label: 'Problème logiciel', description: 'Bug système, mise à jour, restauration' },
  { key: 'autre', label: 'Autre', description: 'Décrivez librement la panne' },
];

export const INCIDENT_OPTIONS: { key: IncidentKey; label: string }[] = [
  { key: 'chute', label: 'Chute' },
  { key: 'eau', label: 'Contact avec un liquide' },
  { key: 'reparation-anterieure', label: 'Tentative de réparation précédente' },
  { key: 'aucun', label: 'Aucun événement particulier' },
];

export const PICKUP_OPTIONS: { key: Pickup; label: string; description: string }[] = [
  { key: 'siege', label: 'Au siège à Lorient', description: 'Dépôt direct, sans rendez-vous' },
  { key: 'point-relais', label: 'Point relais Morbihan', description: 'Réseau de points de dépôt partenaires' },
  { key: 'domicile', label: 'Déplacement à domicile', description: 'Morbihan · frais applicables selon distance' },
];

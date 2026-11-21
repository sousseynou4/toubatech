import { formatDate, formatTime, formatXOF } from '@/lib/format';

/** Modèles de messages clients (français). Utilisés en lien wa.me ou via l'API WhatsApp. */
export const templates = {
  bookingReceived: (p: { name: string; service: string; start: string; reference: string }) =>
    `Bonjour ${p.name}, nous avons bien reçu votre demande de rendez-vous chez Dada Beauty : ${p.service}, le ${formatDate(p.start)} à ${formatTime(p.start)} (réf. ${p.reference}). Nous vous confirmons très vite.`,
  bookingConfirmed: (p: { name: string; service: string; start: string; reference: string }) =>
    `Bonjour ${p.name}, votre rendez-vous Dada Beauty est confirmé : ${p.service}, le ${formatDate(p.start)} à ${formatTime(p.start)} (réf. ${p.reference}). À très bientôt !`,
  bookingReminder: (p: { name: string; service: string; start: string }) =>
    `Bonjour ${p.name}, petit rappel : votre rendez-vous ${p.service} chez Dada Beauty est prévu le ${formatDate(p.start)} à ${formatTime(p.start)}. Répondez à ce message en cas d'empêchement.`,
  bookingCancelled: (p: { name: string; reference: string }) =>
    `Bonjour ${p.name}, votre rendez-vous Dada Beauty (réf. ${p.reference}) a été annulé. N'hésitez pas à reprendre rendez-vous quand vous le souhaitez.`,
  bookingRescheduled: (p: { name: string; start: string; reference: string }) =>
    `Bonjour ${p.name}, votre rendez-vous Dada Beauty (réf. ${p.reference}) est déplacé au ${formatDate(p.start)} à ${formatTime(p.start)}.`,
  depositReceived: (p: { name: string; amount: number; reference: string }) =>
    `Bonjour ${p.name}, nous avons bien reçu votre acompte de ${formatXOF(p.amount)} pour le rendez-vous ${p.reference}. Merci !`,
  orderReceived: (p: { name: string; reference: string; total: number }) =>
    `Bonjour ${p.name}, merci pour votre commande Dada Beauty ${p.reference} (${formatXOF(p.total)}). Nous la préparons et revenons vers vous.`,
  orderReady: (p: { name: string; reference: string }) =>
    `Bonjour ${p.name}, votre commande Dada Beauty ${p.reference} est prête ! Vous pouvez venir la retirer au salon (Deux Boulangeries, Guédiawaye).`,
  reviewRequest: (p: { name: string; url: string }) =>
    `Bonjour ${p.name}, merci pour votre visite chez Dada Beauty ! Votre avis compte beaucoup pour nous : ${p.url}`,
} as const;

export type TemplateKey = keyof typeof templates;

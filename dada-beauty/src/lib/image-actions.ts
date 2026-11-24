import { unstable_rethrow } from 'next/navigation';
import { shrinkFormImages, UPLOAD_FAILED } from './image-prep';

/**
 * Enveloppe une action serveur qui reçoit des photos : les fichiers du champ `field` sont réduits dans le
 * navigateur avant l'envoi, et un envoi refusé (trop lourd, connexion coupée) devient un message d'erreur
 * au lieu d'une page d'erreur. Les redirections de Next.js (redirect après création) sont laissées passer.
 */
export function withShrunkImages<S>(action: (prev: S, form: FormData) => Promise<S>, field: string, onFailure: S) {
  return async (prev: S, form: FormData): Promise<S> => {
    try {
      return await action(prev, await shrinkFormImages(form, field));
    } catch (e) {
      unstable_rethrow(e);
      return onFailure;
    }
  };
}

export { UPLOAD_FAILED };

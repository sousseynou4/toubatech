import { BUSINESS, LEGAL } from '@/lib/site';

/** Paragraphe « médiation de la consommation », commun aux mentions légales et aux CGV. */
export function MediationNotice() {
  const m = LEGAL.mediator;
  return (
    <>
      <p>
        En cas de litige, le Client adresse d'abord une réclamation écrite à TOUBA TECH, par
        e-mail à <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> ou par courrier. Nous
        nous engageons à y répondre dans un délai de 15 jours.
      </p>
      <p>
        Conformément aux articles L.611-1 et suivants du Code de la consommation, le Client
        consommateur peut ensuite recourir gratuitement à un médiateur de la consommation en vue
        de la résolution amiable du litige.
      </p>
      {m ? (
        <p>
          Médiateur compétent : <strong>{m.name}</strong>, {m.address} —{' '}
          <a href={m.website} target="_blank" rel="noopener noreferrer">
            {m.website.replace(/^https?:\/\//, '')}
          </a>
          .
        </p>
      ) : (
        <p>Les coordonnées du médiateur de la consommation compétent seront publiées sur cette page.</p>
      )}
    </>
  );
}

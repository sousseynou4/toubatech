'use client';

import { motion } from 'framer-motion';
import {
  type DiagnosticData,
  DEVICE_OPTIONS,
  PROBLEM_OPTIONS,
  INCIDENT_OPTIONS,
  PICKUP_OPTIONS,
} from './types';

export function Step6Summary({
  data,
  onEdit,
}: {
  data: DiagnosticData;
  onEdit: (step: number) => void;
}) {
  const device = DEVICE_OPTIONS.find((d) => d.key === data.device)?.label ?? '—';
  const problems =
    data.problems.map((p) => PROBLEM_OPTIONS.find((o) => o.key === p)?.label).join(', ') || '—';
  const incident = INCIDENT_OPTIONS.find((i) => i.key === data.incident)?.label ?? '—';
  const pickup = PICKUP_OPTIONS.find((p) => p.key === data.pickup)?.label ?? '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="space-y-3">
        <p className="font-mono text-[11px] tracking-[0.2em] text-emerald uppercase">
          Récapitulatif
        </p>
        <h2 className="text-h1 text-ink">Vérifions ensemble votre demande</h2>
        <p className="max-w-xl text-[15px] leading-relaxed text-ink-500">
          Relisez les informations avant l'envoi. Vous pouvez modifier chaque étape.
        </p>
      </div>

      <div className="mt-10 divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-bone">
        <Row
          label="Appareil"
          value={device}
          onEdit={() => onEdit(1)}
        />
        <Row
          label="Marque & modèle"
          value={`${data.brand || '—'} · ${data.model || '—'}`}
          onEdit={() => onEdit(2)}
        />
        <Row label="Problèmes identifiés" value={problems} onEdit={() => onEdit(3)} />
        {data.problemDetails && (
          <Row label="Précisions" value={data.problemDetails} onEdit={() => onEdit(3)} multiline />
        )}
        <Row label="Historique" value={incident} onEdit={() => onEdit(4)} />
        {data.incidentDetails && (
          <Row
            label="Contexte"
            value={data.incidentDetails}
            onEdit={() => onEdit(4)}
            multiline
          />
        )}
        <Row label="Contact" value={`${data.fullName} · ${data.email} · ${data.phone}`} onEdit={() => onEdit(5)} />
        <Row
          label="Prise en charge"
          value={
            pickup +
            (data.preferredDate ? ` · ${data.preferredDate}` : '') +
            (data.preferredTime ? ` · ${data.preferredTime}` : '')
          }
          onEdit={() => onEdit(5)}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-emerald/20 bg-emerald/5 p-5">
        <p className="text-sm leading-relaxed text-ink-700">
          <strong className="font-medium text-emerald">Prochaine étape :</strong> un technicien
          analyse votre demande sous 24h ouvrées et vous transmet un pré-diagnostic accompagné
          d'une estimation tarifaire. Aucun engagement avant validation.
        </p>
      </div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  onEdit,
  multiline,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-mist/30">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">{label}</p>
        <p
          className={`mt-1 text-[15px] text-ink ${multiline ? 'whitespace-pre-line' : 'truncate'}`}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-full border border-ink/10 px-3 py-1 text-xs text-ink-600 transition-colors hover:border-ink/25 hover:text-ink"
      >
        Modifier
      </button>
    </div>
  );
}

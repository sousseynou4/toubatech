'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { tiktokPlayerUrl } from '@/lib/tiktok';
import { cn } from '@/lib/cn';

/**
 * Vidéo TikTok en « chargement au clic » : aucun script ni cookie TikTok n'est chargé
 * tant que la visiteuse n'a pas choisi de lancer la vidéo (vie privée et rapidité de la page).
 */
export function TikTokEmbed({ videoId, title, url, className }: { videoId: string; title: string | null; url: string; className?: string }) {
  const [active, setActive] = useState(false);
  const label = title ?? 'Vidéo TikTok de Dada Beauty';
  return (
    <figure className={cn('break-inside-avoid', className)}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-ink">
        {active ? (
          <iframe
            src={`${tiktokPlayerUrl(videoId)}&autoplay=1`}
            title={label}
            className="absolute inset-0 size-full border-0"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          />
        ) : (
          <button type="button" onClick={() => setActive(true)}
            className="group absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-ink via-[#3a2531] to-rosewood p-4 text-center text-ivory">
            <span className="grid size-16 place-items-center rounded-full bg-ivory/15 ring-1 ring-ivory/40 transition group-hover:scale-105 group-hover:bg-ivory/25">
              <Play className="ml-1 size-7 fill-current" aria-hidden />
            </span>
            <span className="text-sm font-medium leading-snug">{label}</span>
            <span className="text-[0.7rem] text-ivory/70">Lire sur le lecteur TikTok</span>
            <span className="sr-only">(la vidéo est chargée depuis TikTok)</span>
          </button>
        )}
      </div>
      <figcaption className="mt-1.5 flex items-center justify-between gap-2 px-1 text-xs text-muted">
        <span className="truncate">{title}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-rosewood hover:underline">Voir sur TikTok</a>
      </figcaption>
    </figure>
  );
}

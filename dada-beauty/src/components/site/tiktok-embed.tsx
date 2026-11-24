'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { tiktokPlayerUrl, tiktokProfileEmbedUrl } from '@/lib/tiktok';
import { cn } from '@/lib/cn';

/** Événement émis quand une vidéo démarre : les autres lecteurs de la page se ferment. */
const PLAY_EVENT = 'dada:tiktok-play';

/**
 * Vidéo TikTok en « chargement au clic » : aucun script ni cookie TikTok n'est chargé
 * tant que la visiteuse n'a pas choisi de lancer la vidéo (vie privée et rapidité de la page).
 *
 * Le lecteur de TikTok pèse environ 1,6 Mo (scripts et polices) avant la vidéo elle-même : on affiche
 * un indicateur pendant ce chargement, et une seule vidéo est ouverte à la fois pour ne pas partager
 * une connexion mobile entre plusieurs lecteurs.
 */
export function TikTokEmbed({ videoId, title, url, className }: { videoId: string; title: string | null; url: string; className?: string }) {
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const label = title ?? 'Vidéo TikTok de Dada Beauty';
  useEffect(() => {
    if (!active) return;
    const onPlay = (e: Event) => {
      if ((e as CustomEvent<string>).detail === videoId) return;
      setActive(false);
      setLoaded(false);
    };
    window.addEventListener(PLAY_EVENT, onPlay);
    return () => window.removeEventListener(PLAY_EVENT, onPlay);
  }, [active, videoId]);
  const start = () => {
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: videoId }));
    setActive(true);
  };
  return (
    <figure className={cn('break-inside-avoid', className)}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-ink">
        {active ? (
          <>
            <iframe
              src={`${tiktokPlayerUrl(videoId)}&autoplay=1`}
              title={label}
              className="absolute inset-0 size-full border-0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
              onLoad={() => setLoaded(true)}
            />
            {!loaded && (
              <div role="status" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-ink via-[#3a2531] to-rosewood p-4 text-center text-ivory">
                <Loader2 className="size-8 animate-spin" aria-hidden />
                <span className="text-sm font-medium">Chargement depuis TikTok…</span>
                <span className="text-[0.7rem] text-ivory/70">Quelques secondes selon votre connexion</span>
              </div>
            )}
          </>
        ) : (
          <button type="button" onClick={start}
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

/**
 * Profil TikTok du salon (dernières vidéos), chargé au clic comme les vidéos : aucun contenu TikTok
 * n'est demandé avant que la visiteuse ne le choisisse.
 */
export function TikTokProfileEmbed({ handle, url, className }: { handle: string; url: string; className?: string }) {
  const [active, setActive] = useState(false);
  const [height, setHeight] = useState(461);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!active || !el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setHeight(profileEmbedHeight(entry!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);
  return (
    <div ref={box} className={cn('mx-auto w-full max-w-[780px] overflow-hidden rounded-2xl', !active && 'border border-line', className)}>
      {active ? (
        <iframe
          src={tiktokProfileEmbedUrl(handle)}
          title={`Dernières vidéos TikTok de @${handle}`}
          style={{ height }}
          className="block w-full border-0"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
        />
      ) : (
        <div className="flex flex-col items-center gap-4 bg-gradient-to-br from-ink via-[#3a2531] to-rosewood px-6 py-10 text-center text-ivory sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-display text-2xl">@{handle}</p>
            <p className="mt-1 text-sm text-ivory/80">Toutes nos dernières réalisations, en direct de TikTok.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => setActive(true)}
              className="inline-flex items-center gap-2 rounded-full bg-ivory px-4 py-2 text-sm font-medium text-ink transition hover:bg-white">
              <Play className="size-4 fill-current" aria-hidden /> Voir les vidéos ici
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-full px-4 py-2 text-sm font-medium text-ivory ring-1 ring-ivory/50 hover:bg-ivory/10">Ouvrir TikTok</a>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hauteur du cadre « profil » de TikTok selon sa largeur : la carte de TikTok change de mise en page à
 * 375 px et à 415 px (mesuré le 24/11/2026). Quelques pixels de marge pour sa bordure.
 */
function profileEmbedHeight(width: number): number {
  if (width < 375) return 373;
  if (width < 415) return 437;
  return 461;
}

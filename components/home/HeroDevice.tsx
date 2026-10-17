'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, X } from 'lucide-react';

/**
 * Téléphone animé de la page d'accueil.
 * Le cadre est en CSS (net à toutes les tailles) ; seul l'écran est une vidéo : boucle de 8 s
 * sans son, générée par le moteur du spot « Ça repart » (marketing/spot-ca-repart/render_web.py).
 * - pause quand le téléphone sort de l'écran (économie de batterie et de données) ;
 * - image fixe pour les visiteurs qui ont demandé moins d'animations ;
 * - le bouton ouvre le spot complet (20 s, avec le son), chargé seulement au clic.
 */
export function HeroDevice() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [spotOpen, setSpotOpen] = useState(false);
  const closeSpot = useCallback(() => setSpotOpen(false), []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 }
    );
    io.observe(video);
    return () => io.disconnect();
  }, [reducedMotion]);

  return (
    <div className="relative">
      <div aria-hidden="true" className="absolute -inset-8 rounded-full bg-emerald/20 blur-3xl" />

      <div className="relative mx-auto w-[min(100%,14.5rem)] rounded-[2.5rem] sm:w-[min(100%,18rem)] sm:rounded-[3rem] bg-gradient-to-br from-[#1B3A5C] via-[#071628] to-[#12304F] p-[0.65rem] shadow-lift ring-1 ring-ink/25">
        <span aria-hidden="true" className="absolute -left-[3px] top-[22%] h-[9%] w-[3px] rounded-l bg-[#0E2742]" />
        <span aria-hidden="true" className="absolute -left-[3px] top-[33%] h-[9%] w-[3px] rounded-l bg-[#0E2742]" />
        <span aria-hidden="true" className="absolute -right-[3px] top-[27%] h-[14%] w-[3px] rounded-r bg-[#0E2742]" />
        <div className="relative overflow-hidden rounded-[1.95rem] bg-ink-900 sm:rounded-[2.35rem]" style={{ aspectRatio: '448 / 944' }}>
          {reducedMotion ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/videos/hero-still.jpg" alt="" className="h-full w-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              src="/videos/hero-loop.mp4"
              poster="/videos/hero-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      <div className="relative mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => setSpotOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-ink/12 bg-bone px-4 py-2 text-sm font-medium text-ink shadow-soft transition-colors hover:border-emerald hover:text-emerald focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald"
        >
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          Voir le spot · 20 s
        </button>
      </div>

      {spotOpen && <SpotDialog onClose={closeSpot} />}
    </div>
  );
}

function SpotDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Spot TOUBA TECH « Ça repart »"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative w-[min(100%,24rem)]" onClick={(e) => e.stopPropagation()}>
        <video
          className="block w-full rounded-2xl bg-ink-900 shadow-lift"
          style={{ aspectRatio: '9 / 16', maxHeight: '85vh' }}
          src="/videos/spot-ca-repart.mp4"
          poster="/videos/spot-poster.jpg"
          controls
          autoPlay
          playsInline
          preload="none"
        />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fermer la vidéo"
          className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full bg-bone text-ink shadow-lift transition-colors hover:text-emerald focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

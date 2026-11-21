import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { CATEGORY_ART } from '@/lib/site';
import { cn } from '@/lib/cn';

/**
 * Affiche la photo administrée si elle existe, sinon un visuel éditorial
 * provisoire clairement identifié (« Photo à venir »), jamais une photo
 * générique trompeuse.
 */
export function ArtImage({
  src, alt, theme = 'salon', label, className, sizes = '(max-width: 768px) 100vw, 50vw', priority, showPlaceholderTag = true,
}: {
  src?: string | null;
  alt: string;
  theme?: string;
  label?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  showPlaceholderTag?: boolean;
}) {
  if (src) {
    return (
      <div className={cn('relative overflow-hidden bg-powder-100', className)}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }
  const art = CATEGORY_ART[theme] ?? CATEGORY_ART.salon!;
  return (
    <div
      role="img"
      aria-label={`${alt} — photo à venir`}
      className={cn('art-placeholder flex items-end [container-type:size]', className)}
      style={{ ['--art-a' as string]: art.a, ['--art-b' as string]: art.b }}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-[6cqw] text-center">
        <span className="font-display text-[clamp(1rem,13cqmin,6rem)] italic leading-[0.95] text-white/75 drop-shadow-sm">
          {label ?? art.label}
        </span>
      </div>
      {showPlaceholderTag && (
        <span className="relative m-3 inline-flex items-center gap-1 rounded-full bg-white/75 px-2.5 py-1 text-[0.68rem] font-medium text-ink-soft backdrop-blur">
          <Sparkles className="size-3 text-gold-dark" aria-hidden /> Photo à venir
        </span>
      )}
    </div>
  );
}

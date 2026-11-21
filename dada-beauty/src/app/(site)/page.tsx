import Link from 'next/link';
import { ArrowRight, BadgeCheck, CalendarHeart, Gem, HeartHandshake, MapPin, MessageCircle, Sparkles } from 'lucide-react';
import { ArtImage } from '@/components/ui/art-image';
import { ButtonLink, buttonClass } from '@/components/ui/button';
import { Section, SectionHeading } from '@/components/ui/section';
import { ProductCard, ServiceCard, Stars } from '@/components/site/cards';
import { HoursList } from '@/components/site/footer';
import { getApprovedReviews, getBusinessHours, getCategoriesWithServices, getGallery, getProducts, getSettings, getSlots } from '@/server/catalog';
import { whatsappLink } from '@/lib/phone';
import { CATEGORY_ART } from '@/lib/site';

export const revalidate = 300;

export default async function HomePage() {
  const [{ settings }, categories, products, reviews, gallery, slots, hours] = await Promise.all([
    getSettings(), getCategoriesWithServices(), getProducts({ limit: 8 }), getApprovedReviews(6), getGallery(undefined, 8), getSlots(), getBusinessHours(),
  ]);
  const featured = categories.flatMap((c) => c.services).filter((s) => s.is_featured).slice(0, 6);
  const featuredProducts = [...products.filter((p) => p.is_featured), ...products.filter((p) => !p.is_featured)].slice(0, 4);

  return (
    <>
      {/* HERO */}
      <section className="relative -mt-[4.5rem] overflow-hidden bg-gradient-to-b from-powder-100 via-powder-50 to-ivory pt-[4.5rem]">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-[34rem] rounded-full bg-powder/50 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-40 bottom-0 size-[26rem] rounded-full bg-champagne/40 blur-3xl" />
        <div className="container-page relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="animate-fade-up">
            <p className="eyebrow">Institut de beauté · Guédiawaye, Dakar</p>
            <h1 className="mt-5 font-display text-[3rem] leading-[0.95] font-medium text-ink sm:text-7xl lg:text-[5.4rem]">
              Révélez votre <em className="text-rosewood">éclat</em>, sublimez votre style.
            </h1>
            <p className="mt-6 max-w-lg text-[1.05rem] leading-relaxed text-ink-soft">
              {settings.tagline ?? 'Maquillage, onglerie, cils et coiffure : chez Dada Beauty, chaque rendez-vous est un moment pensé pour vous, avec le soin du détail et la douceur que vous méritez.'}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/reserver" size="lg"><CalendarHeart className="size-5" /> Réserver un rendez-vous</ButtonLink>
              <ButtonLink href="/prestations" variant="outline" size="lg">Découvrir nos prestations</ButtonLink>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-soft">
              <li className="flex items-center gap-2"><BadgeCheck className="size-4 text-gold-dark" /> Réservation en ligne</li>
              <li className="flex items-center gap-2"><Gem className="size-4 text-gold-dark" /> Produits sélectionnés</li>
              <li className="flex items-center gap-2"><HeartHandshake className="size-4 text-gold-dark" /> Mariages & événements</li>
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <ArtImage src={slots.home_hero?.public_url} alt={slots.home_hero?.alt || 'Maquillage glamour réalisé chez Dada Beauty'} theme="makeup" label="Glam"
              priority className="aspect-[4/5] rounded-[2.5rem] rounded-tl-[9rem] shadow-lift" sizes="(max-width: 1024px) 90vw, 45vw" />
            <div className="absolute -bottom-5 -left-3 rounded-2xl bg-white/90 px-5 py-4 shadow-soft backdrop-blur sm:-left-8">
              <p className="font-display text-2xl leading-none">Soft & Full Glam</p>
              <p className="mt-1 text-xs text-muted">Mariées · cérémonies · anniversaires</p>
            </div>
          </div>
        </div>
      </section>

      {/* UNIVERS */}
      <Section>
        <SectionHeading eyebrow="Nos univers" title={<>Une expertise, <em className="text-rosewood">quatre univers</em></>} intro="Des mains expertes pour chaque envie, du regard jusqu'au bout des ongles." />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {(categories.length ? categories : Object.entries(CATEGORY_ART).slice(0, 4).map(([slug, a]) => ({ slug, name: a.label, tagline: null, image: null, services: [] }))).map((c) => (
            <Link key={c.slug} href={`/prestations#${c.slug}`} className="group relative block overflow-hidden rounded-[1.5rem]">
              <ArtImage src={c.image?.public_url} alt={c.image?.alt || c.name} theme={c.slug} label=" " className="aspect-[3/4] transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 1024px) 50vw, 25vw" showPlaceholderTag={false} />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <h3 className="font-display text-2xl text-white sm:text-3xl">{c.name}</h3>
                {c.tagline && <p className="mt-1 text-xs text-white/85 sm:text-sm">{c.tagline}</p>}
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* PRESTATIONS POPULAIRES */}
      {featured.length > 0 && (
        <Section className="bg-powder-50">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading eyebrow="Les plus demandées" title="Prestations signatures" />
            <Link href="/prestations" className="inline-flex items-center gap-2 text-sm font-medium text-rosewood">Toutes les prestations <ArrowRight className="size-4" /></Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s) => <ServiceCard key={s.id} service={s} />)}
          </div>
        </Section>
      )}

      {/* GALERIE */}
      <Section>
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading eyebrow="Galerie" title={<>Nos <em className="text-rosewood">réalisations</em></>} intro="Maquillages, poses, installations : un aperçu du savoir-faire de l'équipe." />
          <Link href="/galerie" className="inline-flex items-center gap-2 text-sm font-medium text-rosewood">Voir la galerie <ArrowRight className="size-4" /></Link>
        </div>
        {gallery.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.slice(0, 8).map((m, i) => (
              <ArtImage key={m.id} src={m.public_url} alt={m.alt} className={`rounded-2xl ${i % 5 === 0 ? 'row-span-2 aspect-[3/5]' : 'aspect-square'}`} sizes="(max-width: 640px) 50vw, 25vw" />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['makeup', 'onglerie', 'cils-sourcils', 'coiffure-perruques'].map((t) => (
              <ArtImage key={t} alt={`Réalisation ${CATEGORY_ART[t]?.label}`} theme={t} className="aspect-square rounded-2xl" />
            ))}
          </div>
        )}
      </Section>

      {/* NOTRE UNIVERS */}
      <Section className="bg-nude-50">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <ArtImage src={slots.about?.public_url} alt={slots.about?.alt || 'Le salon Dada Beauty'} theme="salon" label="Le salon" className="aspect-[5/4] rounded-[2rem]" />
          <div>
            <SectionHeading eyebrow="Notre univers" title={<>La beauté, <em className="text-rosewood">avec douceur</em> et exigence</>} />
            <p className="mt-5 leading-relaxed text-ink-soft">
              {settings.description ?? 'Au cœur de Guédiawaye, Dada Beauty vous accueille dans un espace chaleureux dédié à votre mise en beauté. Notre équipe vous conseille avec bienveillance et travaille avec des produits soigneusement sélectionnés, pour un résultat qui vous ressemble.'}
            </p>
            <div className="gold-rule my-8" />
            <dl className="grid grid-cols-3 gap-4 text-center">
              {[['Makeup', 'Soft & full glam'], ['Onglerie', 'Gel, capsules, nail art'], ['Coiffure', 'Lace & perruques']].map(([t, d]) => (
                <div key={t}><dt className="font-display text-2xl">{t}</dt><dd className="mt-1 text-xs text-muted">{d}</dd></div>
              ))}
            </dl>
            <ButtonLink href="/a-propos" variant="outline" className="mt-8">Découvrir Dada Beauty</ButtonLink>
          </div>
        </div>
      </Section>

      {/* BOUTIQUE */}
      {featuredProducts.length > 0 && (
        <Section>
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading eyebrow="La boutique" title="Perruques, maquillage & soins" intro="Retrait au salon ou livraison selon disponibilité." />
            <Link href="/boutique" className="inline-flex items-center gap-2 text-sm font-medium text-rosewood">Toute la boutique <ArrowRight className="size-4" /></Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {featuredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </Section>
      )}

      {/* TÉMOIGNAGES — uniquement des avis vérifiés et modérés */}
      {reviews.length > 0 && (
        <Section className="bg-powder-50">
          <SectionHeading eyebrow="Elles nous font confiance" title="Avis de nos clientes" align="center" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <figure key={r.id} className="card p-6">
                <Stars rating={r.rating} />
                {r.comment && <blockquote className="mt-4 font-display text-xl leading-snug text-ink">« {r.comment} »</blockquote>}
                <figcaption className="mt-4 flex items-center gap-2 text-sm text-muted">
                  {r.display_name}{r.is_verified && <span className="inline-flex items-center gap-1 text-xs text-success"><BadgeCheck className="size-3.5" /> Cliente vérifiée</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}

      {/* LOCALISATION */}
      <Section>
        <div className="grid gap-8 overflow-hidden rounded-[2rem] border border-line bg-white lg:grid-cols-2">
          <div className="p-7 sm:p-10">
            <p className="eyebrow">Nous rendre visite</p>
            <h2 className="mt-3 font-display text-4xl">Guédiawaye, Deux Boulangeries</h2>
            <p className="mt-4 flex gap-2 text-ink-soft"><MapPin className="mt-1 size-4 shrink-0 text-rosewood" /> {settings.address_line}, {settings.city}, {settings.country}</p>
            <HoursList hours={hours} className="mt-6 max-w-xs text-sm text-ink-soft" />
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/contact" variant="secondary">Plan & contact</ButtonLink>
              <a href={whatsappLink('Bonjour, pouvez-vous m\'indiquer l\'emplacement exact du salon ?', settings.whatsapp_phone)} target="_blank" rel="noopener noreferrer" className={buttonClass('outline')}>
                <MessageCircle className="size-4" /> Demander l&apos;itinéraire
              </a>
            </div>
          </div>
          {settings.map_embed_url ? (
            <iframe title="Carte Dada Beauty" src={settings.map_embed_url} className="min-h-72 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          ) : (
            <ArtImage alt="Plan d'accès" theme="salon" label="Guédiawaye" className="min-h-72" showPlaceholderTag={false} />
          )}
        </div>
      </Section>

      {/* CTA FINAL */}
      <section className="pb-20">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-14 text-center text-ivory sm:px-12">
            <div aria-hidden className="absolute -right-20 -top-24 size-72 rounded-full bg-rosewood/40 blur-3xl" />
            <div aria-hidden className="absolute -bottom-24 -left-16 size-72 rounded-full bg-gold/30 blur-3xl" />
            <Sparkles className="relative mx-auto size-7 text-gold" />
            <h2 className="relative mx-auto mt-4 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">Prête pour votre prochain moment beauté ?</h2>
            <p className="relative mx-auto mt-4 max-w-lg text-ivory/75">Réservez en quelques clics ou écrivez-nous : nous vous répondons avec plaisir.</p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/reserver" className={buttonClass('gold', 'lg')}><CalendarHeart className="size-5" /> Réserver maintenant</Link>
              <a href={whatsappLink('Bonjour Dada Beauty, je souhaite prendre rendez-vous.', settings.whatsapp_phone)} target="_blank" rel="noopener noreferrer"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/25 px-8 font-medium text-ivory transition hover:border-gold hover:text-gold">
                <MessageCircle className="size-5" /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

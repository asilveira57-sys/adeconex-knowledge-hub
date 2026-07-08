import { createFileRoute } from "@tanstack/react-router";
import { Clock, ExternalLink, MapPin, MessageSquarePlus, Phone, Star } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { getPlaceDetails, type PlaceDetails, type PlaceReview } from "@/lib/place.functions";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/avaliacoes";
const URL = absoluteUrl(PATH);
const TITLE = "Avaliações Google — Adeconex Etiquetas";
const DESCRIPTION =
  "Veja avaliações reais de clientes Adeconex Etiquetas no Google, nosso endereço, horário de funcionamento, fotos e como chegar até a fábrica em Vila Velha (ES).";

const PLACE_ID = "ChIJRZiVPxAeuAARhE6fc6lFr_Y";
const WRITE_REVIEW = `https://search.google.com/local/writereview?placeid=${PLACE_ID}`;

export const Route = createFileRoute("/avaliacoes")({
  loader: () => getPlaceDetails(),
  staleTime: 60 * 60 * 1000,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: AvaliacoesPage,
});

function AvaliacoesPage() {
  const place = Route.useLoaderData() as PlaceDetails;
  const mapEmbed = `https://www.google.com/maps?q=place_id:${PLACE_ID}&output=embed`;

  const primaryImage = place.photos[0]?.url;
  const dayMap: Record<string, string> = {
    "Segunda-feira": "Mo",
    "Terça-feira": "Tu",
    "Quarta-feira": "We",
    "Quinta-feira": "Th",
    "Sexta-feira": "Fr",
    Sábado: "Sa",
    Domingo: "Su",
  };
  const openingHoursSpec = place.weekdayDescriptions
    .map((d) => {
      const [dayRaw, ...rest] = d.split(":");
      const dayOfWeek = dayMap[dayRaw.trim()];
      const times = rest.join(":").trim();
      if (!dayOfWeek || /fechado/i.test(times)) return null;
      const m = times.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
      if (!m) return null;
      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek,
        opens: m[1],
        closes: m[2],
      };
    })
    .filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${URL}#localbusiness`,
    name: place.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: place.address,
      addressLocality: "Vila Velha",
      addressRegion: "ES",
      addressCountry: "BR",
    },
    telephone: place.phone ?? undefined,
    url: URL,
    sameAs: place.website ? [place.website, place.googleMapsUri] : [place.googleMapsUri],
    ...(primaryImage ? { image: place.photos.slice(0, 4).map((p) => p.url) } : {}),
    priceRange: "$$",
    ...(place.location?.lat
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: place.location.lat,
            longitude: place.location.lng,
          },
        }
      : {}),
    ...(openingHoursSpec.length ? { openingHoursSpecification: openingHoursSpec } : {}),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: place.rating,
      reviewCount: place.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    review: place.reviews
      .filter((r) => r.text.trim().length > 20)
      .slice(0, 8)
      .map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.author },
        datePublished: r.publishTime,
        reviewRating: {
          "@type": "Rating",
          ratingValue: r.rating,
          bestRating: 5,
          worstRating: 1,
        },
        reviewBody: r.text,
      })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <section className="relative border-b hairline bg-surface-2">
        <div className="container-page py-20 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <p className="eyebrow">Reputação verificada · Google</p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-6xl">
                {place.rating.toFixed(1).replace(".", ",")} estrelas de{" "}
                {place.reviewCount}+ clientes.
              </h1>
              <p className="mt-5 max-w-xl text-muted-foreground md:text-lg">
                Cada avaliação abaixo é pública no Google Maps — feita por clientes reais que
                compraram, receberam e voltaram a comprar. Sem filtro, sem edição, sem selo pago.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={WRITE_REVIEW}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  Deixar minha avaliação
                </a>
                <a
                  href={place.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border hairline px-5 py-3 text-sm font-medium text-foreground hover:bg-accent"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver perfil no Google
                </a>
              </div>
            </div>

            <RatingCard place={place} />
          </div>
        </div>
      </section>

      {/* MAP + INFO */}
      <Section>
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-2xl border hairline bg-card">
            <iframe
              title="Localização Adeconex Etiquetas"
              src={mapEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[420px] w-full"
            />
          </div>

          <div className="grid gap-4">
            <InfoCard
              icon={<MapPin className="h-5 w-5 text-signal" strokeWidth={1.5} />}
              title="Endereço"
              body={place.address}
              action={{
                label: "Como chegar",
                href: `https://www.google.com/maps/dir/?api=1&destination=place_id:${PLACE_ID}`,
              }}
            />
            <InfoCard
              icon={<Clock className="h-5 w-5 text-signal" strokeWidth={1.5} />}
              title={place.openNow ? "Aberto agora" : "Horário de funcionamento"}
              statusPill={
                place.openNow ? (
                  <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                    Aberto
                  </span>
                ) : (
                  <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Fechado
                  </span>
                )
              }
            >
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {place.weekdayDescriptions.map((d) => (
                  <li key={d} className="tabular-nums">
                    {d}
                  </li>
                ))}
              </ul>
            </InfoCard>
            {place.phone ? (
              <InfoCard
                icon={<Phone className="h-5 w-5 text-signal" strokeWidth={1.5} />}
                title="Telefone"
                body={place.phone}
                action={{
                  label: "Ligar agora",
                  href: `tel:${place.phone.replace(/\s+/g, "")}`,
                }}
              />
            ) : null}
          </div>
        </div>
      </Section>

      {/* PHOTOS */}
      {place.photos.length > 0 ? (
        <Section tone="muted">
          <SectionHeader
            eyebrow="Nossa fábrica"
            title="Fotos publicadas no Google"
            description="Registros feitos por nossa equipe e clientes durante visitas e retiradas."
          />
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {place.photos.map((p, i) => (
              <a
                key={p.url}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-[4/3] overflow-hidden rounded-xl border hairline bg-card"
              >
                <img
                  src={p.url}
                  alt={p.attribution ? `Foto por ${p.attribution}` : `Foto ${i + 1} — Adeconex Etiquetas`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {p.attribution ? (
                  <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                    © {p.attribution}
                  </span>
                ) : null}
              </a>
            ))}
          </div>
        </Section>
      ) : null}

      {/* REVIEWS */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeader
            eyebrow="Depoimentos verificados"
            title="O que dizem no Google"
            description="Avaliações públicas — clique em qualquer uma para abrir direto no perfil do Google."
          />
          <a
            href={WRITE_REVIEW}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Escrever avaliação
          </a>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {place.reviews
            .filter((r) => r.text.trim().length > 20)
            .map((r) => (
              <ReviewCard key={r.publishTime} review={r} />
            ))}
        </div>

        <div className="mt-12 rounded-2xl border hairline bg-card p-8 md:p-12">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="eyebrow">Ajude outros compradores</p>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
                Já é cliente Adeconex? Sua avaliação sustenta nossa reputação.
              </h3>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                Leva 30 segundos e aparece direto no Google Maps.
              </p>
            </div>
            <a
              href={WRITE_REVIEW}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Star className="h-4 w-4" />
              Avaliar no Google
            </a>
          </div>
        </div>
      </Section>
    </>
  );
}

function RatingCard({ place }: { place: PlaceDetails }) {
  const full = Math.floor(place.rating);
  const hasHalf = place.rating - full >= 0.25 && place.rating - full < 0.75;
  const total = 5;
  return (
    <div className="rounded-3xl border hairline bg-card p-8 shadow-sm md:p-10">
      <div className="flex items-center gap-3">
        <GoogleGlyph />
        <span className="text-sm font-medium text-muted-foreground">Google Reviews</span>
      </div>
      <div className="mt-6 flex items-baseline gap-3">
        <span className="font-display text-6xl font-semibold tracking-tight">
          {place.rating.toFixed(1).replace(".", ",")}
        </span>
        <span className="text-sm text-muted-foreground">de 5,0</span>
      </div>
      <div className="mt-3 flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <Star
            key={i}
            className={
              i < full
                ? "h-5 w-5 fill-amber-400 text-amber-400"
                : hasHalf && i === full
                ? "h-5 w-5 fill-amber-400/50 text-amber-400"
                : "h-5 w-5 text-muted-foreground/30"
            }
            strokeWidth={1.5}
          />
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Com base em <strong className="text-foreground">{place.reviewCount}</strong> avaliações
        públicas de clientes verificados no Google Maps.
      </p>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  body,
  children,
  action,
  statusPill,
}: {
  icon: React.ReactNode;
  title: string;
  body?: string;
  children?: React.ReactNode;
  action?: { label: string; href: string };
  statusPill?: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border hairline bg-card p-6">
      <div className="flex items-center">
        {icon}
        <h3 className="ml-2 font-display text-base font-semibold tracking-tight">{title}</h3>
        {statusPill}
      </div>
      {body ? <p className="mt-2 text-sm text-muted-foreground">{body}</p> : null}
      {children}
      {action ? (
        <a
          href={action.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-signal"
        >
          {action.label}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </article>
  );
}

function ReviewCard({ review }: { review: PlaceReview }) {
  const truncated = review.text.length > 320 ? review.text.slice(0, 300).trimEnd() + "…" : review.text;
  return (
    <article className="flex h-full flex-col rounded-2xl border hairline bg-card p-6">
      <div className="flex items-center gap-3">
        {review.authorPhoto ? (
          <img
            src={review.authorPhoto}
            alt={review.author}
            loading="lazy"
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {review.author.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{review.author}</p>
          <p className="text-xs text-muted-foreground">{review.relativeTime}</p>
        </div>
        <GoogleGlyph className="ml-auto h-4 w-4" />
      </div>
      <div className="mt-3 flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={i < review.rating ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4 text-muted-foreground/30"}
            strokeWidth={1.5}
          />
        ))}
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{truncated}</p>
    </article>
  );
}

function GoogleGlyph({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M21.35 11.1H12v3.83h5.35c-.24 1.5-1.75 4.4-5.35 4.4-3.22 0-5.85-2.67-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.6 4.9 14.5 4 12 4 6.99 4 3 8.03 3 13s3.99 9 9 9c5.2 0 8.63-3.65 8.63-8.78 0-.6-.06-1.05-.15-1.5z"
        fill="#4285F4"
      />
    </svg>
  );
}

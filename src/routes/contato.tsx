import { createFileRoute } from "@tanstack/react-router";
import {
  Clock,
  ExternalLink,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Youtube,
} from "lucide-react";
import { useState } from "react";
import { Section, SectionHeader } from "@/components/ui/section";
import { trackGenerateLead } from "@/lib/analytics";
import { getPlaceDetails, type PlaceDetails, type PlaceReview } from "@/lib/place.functions";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/contato";
const URL_ABS = absoluteUrl(PATH);
const TITLE = "Contato Adeconex — WhatsApp, telefone e endereço em Vila Velha (ES)";
const DESCRIPTION =
  "Fale com a Adeconex Etiquetas: WhatsApp (27) 99273-3033, telefone (27) 3318-6565, vendas@adeconex.com.br e fábrica na R. Silva Xavier, 46 — Vila Velha (ES).";

const PLACE_ID = "ChIJRZiVPxAeuAARhE6fc6lFr_Y";
const WHATSAPP_DISPLAY = "+55 27 99273-3033";
const WHATSAPP_HREF =
  "https://wa.me/5527992733033?text=" +
  encodeURIComponent("Olá! Vim pelo site da Adeconex e gostaria de atendimento.");
const PHONE_DISPLAY = "(27) 3318-6565";
const PHONE_HREF = "tel:+552733186565";
const EMAIL = "vendas@adeconex.com.br";
const ADDRESS = "R. Silva Xavier, 46 — Cristóvão Colombo, Vila Velha - ES, 29106-460";
const INSTAGRAM = "https://www.instagram.com/adeconex";
const YOUTUBE = "https://www.youtube.com/adeconexbr";
const WRITE_REVIEW = `https://search.google.com/local/writereview?placeid=${PLACE_ID}`;

export const Route = createFileRoute("/contato")({
  loader: () => getPlaceDetails(),
  staleTime: 60 * 60 * 1000,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL_ABS },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL_ABS }],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  const place = Route.useLoaderData() as PlaceDetails;
  const [sent, setSent] = useState(false);

  const lat = place.location?.lat;
  const lng = place.location?.lng;
  const mapEmbed = lat
    ? `https://maps.google.com/maps?q=${lat},${lng}&z=17&hl=pt-BR&output=embed`
    : null;
  const directionsHref = lat
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${PLACE_ID}`
    : place.googleMapsUri;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${URL_ABS}#localbusiness`,
    name: "Adeconex Etiquetas",
    address: {
      "@type": "PostalAddress",
      streetAddress: "R. Silva Xavier, 46 - Cristóvão Colombo",
      addressLocality: "Vila Velha",
      addressRegion: "ES",
      postalCode: "29106-460",
      addressCountry: "BR",
    },
    telephone: "+55 27 3318-6565",
    email: EMAIL,
    url: URL_ABS,
    sameAs: [INSTAGRAM, YOUTUBE, place.googleMapsUri],
    priceRange: "$$",
    ...(lat ? { geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng } } : {}),
    ...(place.reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: place.rating,
            reviewCount: place.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="border-b hairline bg-surface-2">
        <div className="container-page py-20">
          <div className="max-w-3xl">
            <p className="eyebrow">Fale com a Adeconex</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Especificação técnica direto com quem fabrica.
            </h1>
            <p className="mt-4 text-muted-foreground md:text-lg">
              Conte seu cenário: aplicação, volume, equipamentos atuais e ambiente. Nosso time
              responde com a solução certa — sem empurrar produto.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp {WHATSAPP_DISPLAY}
              </a>
              <a
                href={PHONE_HREF}
                className="inline-flex items-center gap-2 rounded-md border hairline px-5 py-3 text-sm font-medium hover:bg-accent"
              >
                <Phone className="h-4 w-4" />
                {PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ContactCard
            icon={MessageCircle}
            title="WhatsApp comercial"
            body="Atendimento rápido para orçamentos e dúvidas técnicas."
            action={WHATSAPP_DISPLAY}
            href={WHATSAPP_HREF}
            external
          />
          <ContactCard
            icon={Mail}
            title="E-mail"
            body="Envie sua demanda detalhada para nossa equipe comercial."
            action={EMAIL}
            href={`mailto:${EMAIL}`}
          />
          <ContactCard
            icon={Phone}
            title="Telefone fixo"
            body="Atendimento em horário comercial, de segunda a sexta."
            action={PHONE_DISPLAY}
            href={PHONE_HREF}
          />
          <ContactCard
            icon={MapPin}
            title="Endereço"
            body={ADDRESS}
            action="Ver no mapa"
            href={directionsHref}
            external
          />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {mapEmbed ? (
            <div className="overflow-hidden rounded-2xl border hairline bg-card">
              <iframe
                title="Localização Adeconex Etiquetas"
                src={mapEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[420px] w-full"
              />
            </div>
          ) : null}

          <div className="grid gap-4">
            <article className="rounded-xl border hairline bg-card p-6">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-signal" strokeWidth={1.5} />
                <h3 className="ml-2 font-display text-base font-semibold tracking-tight">
                  Horário de funcionamento
                </h3>
                <span
                  className={
                    place.openNow
                      ? "ml-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600"
                      : "ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {place.openNow ? "Aberto" : "Fechado"}
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {place.weekdayDescriptions.map((d) => (
                  <li key={d} className="tabular-nums">
                    {d}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border hairline bg-card p-6">
              <p className="eyebrow">Redes sociais</p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <a
                  href={INSTAGRAM}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-medium hover:text-signal"
                >
                  <Instagram className="h-4 w-4" /> @adeconex
                </a>
                <a
                  href={YOUTUBE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-medium hover:text-signal"
                >
                  <Youtube className="h-4 w-4" /> youtube.com/adeconexbr
                </a>
              </div>
            </article>
          </div>
        </div>

        <form
          className="mt-12 grid gap-4 rounded-2xl border hairline bg-card p-6 md:p-10"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            trackGenerateLead({
              source: "contato",
              method: "form",
              segment: (data.get("segmento") as string) || null,
            });
            setSent(true);
          }}
        >
          <p className="eyebrow">Formulário de orçamento</p>

          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Solicite uma especificação técnica
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nome" name="nome" />
            <FormField label="Empresa" name="empresa" />
            <FormField label="E-mail" name="email" type="email" />
            <FormField label="Telefone" name="telefone" type="tel" />
          </div>
          <FormField label="Segmento" name="segmento" placeholder="Indústria, varejo, logística..." />
          <div>
            <label className="text-sm font-medium" htmlFor="mensagem">Como podemos ajudar?</label>
            <textarea
              id="mensagem"
              name="mensagem"
              rows={5}
              className="mt-1 w-full rounded-md border hairline bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Descreva sua aplicação, volume mensal, equipamentos atuais..."
            />
          </div>
          <button
            type="submit"
            className="inline-flex w-fit items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            {sent ? "Solicitação enviada" : "Enviar solicitação"}
          </button>
          <p className="text-xs text-muted-foreground">
            Os dados são tratados conforme nossa política de privacidade. Sem spam, sem repasse a
            terceiros.
          </p>
        </form>
      </Section>

      {place.reviews.length > 0 ? (
        <Section tone="muted">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeader
              eyebrow={`Google · ${place.rating.toFixed(1).replace(".", ",")} de 5,0 em ${place.reviewCount} avaliações`}
              title="Últimas avaliações no Google"
              description="Depoimentos públicos de clientes reais no perfil da Adeconex Etiquetas."
            />
            <a
              href={WRITE_REVIEW}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Star className="h-4 w-4" />
              Avaliar no Google
            </a>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {place.reviews
              .filter((r) => r.text.trim().length > 20)
              .slice(0, 6)
              .map((r) => (
                <ReviewCard key={r.publishTime} review={r} />
              ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}

function ContactCard({
  icon: Icon,
  title,
  body,
  action,
  href,
  external,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  action: string;
  href: string;
  external?: boolean;
}) {
  return (
    <article className="rounded-xl border hairline bg-card p-6">
      <Icon className="h-5 w-5 text-signal" strokeWidth={1.5} />
      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium hover:text-signal"
      >
        {action}
        {external ? <ExternalLink className="h-3.5 w-3.5" /> : null}
      </a>
    </article>
  );
}

function ReviewCard({ review }: { review: PlaceReview }) {
  const truncated =
    review.text.length > 320 ? review.text.slice(0, 300).trimEnd() + "…" : review.text;
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
      </div>
      <div className="mt-3 flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={
              i < review.rating
                ? "h-4 w-4 fill-amber-400 text-amber-400"
                : "h-4 w-4 text-muted-foreground/30"
            }
            strokeWidth={1.5}
          />
        ))}
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{truncated}</p>
    </article>
  );
}

function FormField({
  label,
  name,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border hairline bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

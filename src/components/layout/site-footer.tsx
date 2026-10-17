import { Link } from "@tanstack/react-router";
import { Instagram, Youtube, Linkedin, Star } from "lucide-react";
import { primaryNav } from "@/lib/nav";
import { FOOTER_GROUPS } from "@/content/institutional-pages";
import { openCookiePreferences } from "@/lib/consent";
import { NewsletterForm } from "@/components/newsletter-form";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t hairline bg-surface-2">
      <div className="container-page py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">
              Adeconex
            </p>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              Autoridade nacional em impressão térmica, etiquetas, ribbons e
              identificação industrial.
            </p>
            <div className="mt-4 flex items-center gap-3 text-ink-soft">
              <a href="https://www.instagram.com/adeconex" aria-label="Instagram" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://www.youtube.com/adeconexbr" aria-label="YouTube" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
                <Youtube className="h-5 w-5" />
              </a>
              <a href="https://www.linkedin.com/company/adeconex" aria-label="LinkedIn" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <FooterCol title="Plataforma" items={primaryNav} />
          <FooterCol title="Institucional" items={FOOTER_GROUPS.institucional} />
          <FooterCol title="Ajuda e atendimento" items={FOOTER_GROUPS.ajuda} />
          <div>
            <FooterCol title="Legal e privacidade" items={FOOTER_GROUPS.legal} />
            <button type="button" onClick={openCookiePreferences} className="mt-2 text-sm text-ink-soft underline-offset-2 hover:text-foreground hover:underline">
              Preferências de cookies
            </button>
          </div>

          <div>
            <p className="eyebrow">Avaliações</p>
            <Link
              to="/avaliacoes"
              className="mt-3 inline-flex items-center gap-2 transition-opacity hover:opacity-80"
              aria-label="Ver avaliações Google verificadas"
            >
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-ember text-ember" />
                ))}
              </div>
              <span className="text-sm font-medium">Avaliações Google</span>
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              Nota e depoimentos reais publicados no{" "}
              <Link to="/avaliacoes" className="underline underline-offset-2 hover:text-foreground">
                perfil do Google
              </Link>{" "}
              da Adeconex.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t hairline pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {year} Adeconex. Todos os direitos reservados.</p>
          <p>Adeconex Ind e Com Ltda · CNPJ 09.406.758/0001-07 · Vila Velha - ES</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { to: string; label: string }[];
}) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="text-sm text-ink-soft transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

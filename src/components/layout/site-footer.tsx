import { Link } from "@tanstack/react-router";
import { Instagram, Youtube, Linkedin, Star } from "lucide-react";
import { primaryNav, secondaryNav } from "@/lib/nav";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t hairline bg-surface-2">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">
              Adeconex
            </p>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              Autoridade nacional em impressão térmica, identificação,
              etiquetagem, automação comercial e logística.
            </p>
            <div className="mt-4 flex items-center gap-3 text-ink-soft">
              <a href="https://www.instagram.com/adeconex" aria-label="Instagram" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://www.youtube.com/@adeconex" aria-label="YouTube" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
                <Youtube className="h-5 w-5" />
              </a>
              <a href="https://www.linkedin.com/company/adeconex" aria-label="LinkedIn" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <FooterCol title="Plataforma" items={primaryNav} />
          <FooterCol title="Institucional" items={secondaryNav} />

          <div>
            <p className="eyebrow">Avaliações</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-ember text-ember" />
                ))}
              </div>
              <span className="text-sm font-medium">4,9 / 5</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Baseado em avaliações Google de clientes Adeconex.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t hairline pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {year} Adeconex. Todos os direitos reservados.</p>
          <p className="font-mono">CNPJ • Impressão térmica • Identificação • Logística</p>
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

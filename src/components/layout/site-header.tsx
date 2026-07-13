import { Link } from "@tanstack/react-router";
import { Menu, X, User } from "lucide-react";
import { useState } from "react";
import { primaryNav, secondaryNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";
import logoWordmark from "@/assets/brand/logo-adeconex.png";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b hairline bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-foreground"
          onClick={() => setOpen(false)}
        >
          <Logo />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {primaryNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-accent text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <Link
            to="/b2b"
            className="text-sm font-medium text-ink-soft transition-colors hover:text-foreground"
          >
            Área B2B
          </Link>
          {user ? (
            <Link
              to="/minha-conta"
              className="inline-flex items-center gap-1.5 rounded-md border hairline px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <User className="h-4 w-4" /> Minha conta
            </Link>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-md border hairline px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <User className="h-4 w-4" /> Entrar
            </Link>
          )}
          <Link
            to="/contato"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Solicitar orçamento
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border hairline text-foreground"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "lg:hidden border-t hairline overflow-hidden transition-[max-height] duration-300",
          open ? "max-h-[80vh]" : "max-h-0",
        )}
      >
        <nav className="container-page py-4 flex flex-col gap-1">
          {[...primaryNav, ...secondaryNav].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-sm font-medium text-ink-soft hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-accent text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to={user ? "/minha-conta" : "/auth"}
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-md border hairline px-4 py-3 text-sm font-medium text-foreground"
          >
            <User className="h-4 w-4" /> {user ? "Minha conta" : "Entrar"}
          </Link>
          <Link
            to="/contato"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
          >
            Solicitar orçamento
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <img
      src={logoWordmark}
      alt="Adeconex"
      className="h-8 w-auto block"
    />
  );
}

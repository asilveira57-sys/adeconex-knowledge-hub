import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Adeconex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutLayout,
});

const STEPS = [
  { path: "/checkout/endereco", label: "Endereço", index: 1 },
  { path: "/checkout/frete", label: "Frete", index: 2 },
  { path: "/checkout/revisao", label: "Revisão", index: 3 },
  { path: "/checkout/pagamento", label: "Pagamento", index: 4 },
] as const;

function CheckoutLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { snapshot, loading } = useCart();
  const { ready } = useSession();

  // Redirect to cart when there's nothing to check out.
  useEffect(() => {
    if (ready && !loading && snapshot.items.length === 0) {
      navigate({ to: "/carrinho" });
    }
  }, [ready, loading, snapshot.items.length, navigate]);

  const currentIdx = Math.max(
    0,
    STEPS.findIndex((s) => location.pathname.startsWith(s.path)),
  );

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <Link
          to="/carrinho"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar ao carrinho
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Finalizar compra</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {STEPS[currentIdx]?.index ?? 1} de {STEPS.length} —{" "}
          {STEPS[currentIdx]?.label ?? "Checkout"}
        </p>
      </header>

      <ol className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STEPS.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li
              key={s.path}
              className={cn(
                "flex items-center gap-3 rounded-lg border hairline bg-card px-3 py-2",
                active && "border-primary/50 shadow-card",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  done && "bg-primary text-primary-foreground",
                  active && "bg-primary/10 text-primary",
                  !done && !active && "bg-surface-2 text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : s.index}
              </span>
              <span
                className={cn(
                  "text-xs font-mono uppercase tracking-[0.12em]",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      <Outlet />
    </div>
  );
}

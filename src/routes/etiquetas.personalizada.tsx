import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Palette, PenLine, Printer, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabelCanvas } from "@/components/labels/label-canvas";
import { getLabelPricing } from "@/lib/labels.functions";
import { LABEL_TEMPLATES, MATERIALS, RIBBON_COLORS } from "@/lib/labels/shared";

const TITLE = "Etiqueta personalizada online — crie, salve e receba | Adeconex";
const DESCRIPTION =
  "Monte sua etiqueta personalizada no editor online da Adeconex: texto, logo, código de barras e QR Code. Escolha material e cor do ribbon, calcule o frete e receba impresso.";

export const Route = createFileRoute("/etiquetas/personalizada")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomLabelLanding,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CustomLabelLanding() {
  const pricingFn = useServerFn(getLabelPricing);
  const tiers = useQuery({ queryKey: ["label-pricing"], queryFn: () => pricingFn(), staleTime: 300_000 });

  const showcase = LABEL_TEMPLATES.slice(0, 3).map((t) => ({ id: t.id, name: t.name, design: t.build() }));

  return (
    <div className="container-page py-14">
      <section className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Etiqueta personalizada</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Crie sua etiqueta do jeito que a sua operação precisa
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Editor visual gratuito: escreva o texto, ajuste a fonte, envie seu logo e insira código de
          barras ou QR Code. Escolha o material e a cor do ribbon, salve o modelo e finalize a compra
          com frete calculado — nós imprimimos e enviamos.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/etiquetas/editor" search={{ design: undefined, produto: undefined }}>
              Abrir o editor
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/catalogo">Ver etiquetas em branco</Link>
          </Button>
        </div>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: PenLine, title: "1. Monte a arte", text: "Texto, logo, código de barras e QR Code em um editor de arrastar e soltar." },
          { icon: Palette, title: "2. Material e cor", text: "Couché, BOPP branco, transparente ou prata — e a cor do ribbon." },
          { icon: Printer, title: "3. Salve e pague", text: "O modelo fica salvo na sua conta e vai para o carrinho com preço por quantidade." },
          { icon: Truck, title: "4. Receba impresso", text: "Frete cotado no checkout pelo seu CEP e produção conforme a arte aprovada." },
        ].map((s) => (
          <article key={s.title} className="rounded-lg border hairline bg-card p-5">
            <s.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-base font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </article>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Modelos de referência</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Comece de um layout pronto e edite tudo: textos, tamanhos, posições e cores.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {showcase.map((s) => (
            <div key={s.id} className="rounded-lg border hairline bg-card p-5">
              <div className="flex min-h-[180px] items-center justify-center rounded-md bg-surface-2 p-4">
                <LabelCanvas design={s.design} scale={Math.min(320 / s.design.width_mm, 150 / s.design.height_mm)} />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{s.name}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg border hairline bg-card p-6">
          <h2 className="font-display text-xl font-semibold tracking-tight">Preço por quantidade</h2>
          <ul className="mt-4 space-y-1 text-sm">
            {(tiers.data ?? []).map((t) => (
              <li key={t.min_quantity} className="flex justify-between border-b hairline py-1.5 last:border-0">
                <span className="text-muted-foreground">a partir de {t.min_quantity.toLocaleString("pt-BR")} etiquetas</span>
                <span className="font-medium">{brl(t.unit_price)} / un.</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Valores da impressão personalizada. O frete é calculado no carrinho pelo CEP de entrega.
          </p>
        </div>

        <div className="rounded-lg border hairline bg-card p-6">
          <h2 className="font-display text-xl font-semibold tracking-tight">Materiais e cores</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {MATERIALS.map((m) => (
              <li key={m.value}>
                <span className="font-medium">{m.label}</span>{" "}
                <span className="text-muted-foreground">— {m.hint}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {RIBBON_COLORS.map((c) => (
              <span
                key={c.value}
                title={c.label}
                className="h-7 w-7 rounded-full border hairline"
                style={{ background: c.value }}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Impressão em uma única cor por etiqueta (cor do ribbon escolhido).
          </p>
        </div>
      </section>
    </div>
  );
}

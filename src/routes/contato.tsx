import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Section } from "@/components/ui/section";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Adeconex" },
      { name: "description", content: "Fale com o time Adeconex para orçamentos, suporte técnico, parcerias e atendimento B2B." },
      { property: "og:title", content: "Contato — Adeconex" },
      { property: "og:description", content: "Canais de atendimento Adeconex: comercial, suporte técnico e B2B." },
      { property: "og:url", content: "/contato" },
    ],
    links: [{ rel: "canonical", href: "/contato" }],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  return (
    <>
      <section className="border-b hairline bg-surface-2">
        <div className="container-page py-20">
          <div className="max-w-3xl">
            <p className="eyebrow">Fale com a Adeconex</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Especificação técnica direto com quem fabrica.
            </h1>
            <p className="mt-4 text-muted-foreground md:text-lg">
              Conte seu cenário: aplicação, volume, equipamentos atuais e
              ambiente. Nosso time responde com a solução certa — sem
              empurrar produto.
            </p>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: MessageCircle, title: "WhatsApp comercial", body: "Atendimento rápido para orçamentos e dúvidas técnicas.", action: "Conversar agora" },
            { icon: Mail, title: "E-mail", body: "Envie sua demanda detalhada para nossa equipe.", action: "comercial@adeconex.com.br" },
            { icon: Phone, title: "Telefone", body: "Atendimento em horário comercial, segunda a sexta.", action: "Ligar" },
            { icon: MapPin, title: "Endereço", body: "Visita técnica e demonstrações com agendamento.", action: "Ver no mapa" },
          ].map((c) => (
            <article key={c.title} className="rounded-xl border hairline bg-card p-6">
              <c.icon className="h-5 w-5 text-signal" strokeWidth={1.5} />
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
                {c.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
              <p className="mt-4 text-sm font-medium">{c.action}</p>
            </article>
          ))}
        </div>

        <form className="mt-12 grid gap-4 rounded-2xl border hairline bg-card p-6 md:p-10">
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
            Enviar solicitação
          </button>
          <p className="text-xs text-muted-foreground">
            Os dados são tratados conforme nossa política de privacidade.
            Sem spam, sem repasse a terceiros.
          </p>
        </form>
      </Section>
    </>
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

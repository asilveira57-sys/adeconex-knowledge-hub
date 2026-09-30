import { kindLabel } from "@/lib/downloads.functions";

export type FaqItem = { q: string; a: string };
export function buildFaq(it: { title: string; kind: string; brand: string | null; model: string | null; version: string | null; operating_system: string | null; file_size: string | null }): FaqItem[] {
  const device = [it.brand, it.model].filter(Boolean).join(" ") || "a sua impressora";
  const k = kindLabel(it.kind).toLowerCase();
  const isInstallable = it.kind === "driver" || it.kind === "software";
  const faq: FaqItem[] = [
    {
      q: `O ${k} ${it.title} é gratuito?`,
      a: `Sim. O download é gratuito e não exige cadastro. Basta clicar em "Baixar gratuitamente" nesta página.`,
    },
    {
      q: `Com quais sistemas operacionais ele é compatível?`,
      a: it.operating_system
        ? `Segundo as informações desta página, ele é compatível com: ${it.operating_system}. Confira se a versão do seu sistema (32 ou 64 bits) aparece na lista antes de instalar.`
        : `A compatibilidade de sistema operacional não foi informada para este arquivo. Em caso de dúvida, fale com a nossa equipe antes de instalar.`,
    },
  ];
  if (isInstallable) {
    faq.push(
      {
        q: `Como instalar o ${k} da ${device}?`,
        a: `Baixe o arquivo, extraia-o se estiver compactado e execute o instalador como administrador. Conecte a impressora pelo cabo USB apenas quando o assistente solicitar e siga as etapas na tela. O tutorial completo está nesta página.`,
      },
      {
        q: `A impressora não é reconhecida depois da instalação. O que fazer?`,
        a: `Verifique se ela está ligada e conectada, troque de porta USB e reinicie o computador. Em seguida, confira em "Impressoras e scanners" se o modelo aparece. Se o problema continuar, desinstale e instale novamente como administrador.`,
      },
    );
  }
  if (it.version) faq.push({ q: `Qual é a versão disponível?`, a: `A versão disponível nesta página é ${it.version}${it.file_size ? `, com tamanho aproximado de ${it.file_size}` : ""}.` });
  faq.push({
    q: `Preciso de ajuda para configurar. A Adeconex pode ajudar?`,
    a: `Sim. Fale com a equipe da Adeconex pelo WhatsApp +55 27 99273-3033 ou pela página de contato para receber orientação sobre instalação, etiquetas e ribbons.`,
  });
  return faq;
}


export function parseFaqs(v: unknown): FaqItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => ({ q: String((x as FaqItem)?.q ?? "").trim(), a: String((x as FaqItem)?.a ?? "").trim() }))
    .filter((x) => x.q && x.a);
}

/** Usa as perguntas personalizadas no admin; sem elas, usa as automáticas (baseadas só nos dados cadastrados). */
export function resolveFaq(it: Parameters<typeof buildFaq>[0] & { faqs?: unknown }): FaqItem[] {
  const custom = parseFaqs(it.faqs);
  return custom.length ? custom : buildFaq(it);
}

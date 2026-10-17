/** Catálogo de e-mails automáticos (client-safe). Textos padrão editáveis no admin. */

export type AppEmailKey =
  | "boas-vindas"
  | "pedido-recebido"
  | "primeiro-pedido"
  | "pagamento-confirmado"
  | "pagamento-recusado"
  | "pedido-em-producao"
  | "pedido-enviado"
  | "pedido-entregue"
  | "pedido-cancelado"
  | "contato-confirmacao"
  | "contato-aviso-interno"
  | "newsletter-inscricao"
  | "download-link"
  | "catalogo-lista"
  | "avaliacao-pedido"
  | "avaliacao-lembrete"
  | "avaliacao-aviso-interno";

export type AppEmailTexts = {
  subject: string;
  heading: string;
  intro: string;
  body: string;
  cta_label: string;
  closing: string;
};

export type AppEmailDef = {
  key: AppEmailKey;
  group: "Conta" | "Pedidos" | "Contato e conteúdo";
  name: string;
  when: string;
  variables: string[];
  defaults: AppEmailTexts;
  /** Envio interno para a equipe. */
  internal?: boolean;
};

const ORDER_VARS = ["nome", "numero_pedido", "total", "link"];
const SIGN = "Equipe Adeconex";

export const APP_EMAILS: AppEmailDef[] = [
  {
    key: "boas-vindas",
    group: "Conta",
    name: "Boas-vindas",
    when: "Quando o cliente cria a conta e entra pela primeira vez.",
    variables: ["nome", "link"],
    defaults: {
      subject: "Bem-vindo à Adeconex, {nome}!",
      heading: "Que bom ter você aqui",
      intro: "Olá, {nome}! Sua conta na Adeconex está pronta.",
      body: "Agora você pode acompanhar pedidos, salvar endereços e guardar suas artes de etiquetas personalizadas. Se precisar de ajuda para escolher etiquetas, ribbons ou impressoras, é só responder este e-mail.",
      cta_label: "Ir para minha conta",
      closing: SIGN,
    },
  },
  {
    key: "pedido-recebido",
    group: "Pedidos",
    name: "Pedido recebido",
    when: "Quando o pedido é criado e aguarda pagamento.",
    variables: ORDER_VARS,
    defaults: {
      subject: "Recebemos seu pedido {numero_pedido}",
      heading: "Pedido recebido",
      intro: "Olá, {nome}! Recebemos seu pedido {numero_pedido} no valor de {total}.",
      body: "Assim que o pagamento for confirmado, avisaremos por e-mail e começaremos a preparar tudo. Se ainda não concluiu o pagamento, use o botão abaixo.",
      cta_label: "Concluir pagamento",
      closing: SIGN,
    },
  },
  {
    key: "primeiro-pedido",
    group: "Pedidos",
    name: "Primeiro pedido",
    when: "Substitui o \"Pedido recebido\" na primeira compra do cliente.",
    variables: ORDER_VARS,
    defaults: {
      subject: "Obrigado pela sua primeira compra, {nome}!",
      heading: "Sua primeira compra na Adeconex",
      intro: "Olá, {nome}! Recebemos seu primeiro pedido, {numero_pedido}, no valor de {total}. Muito obrigado pela confiança.",
      body: "Assim que o pagamento for confirmado, avisaremos por e-mail e começaremos a preparar tudo com carinho. Se ainda não concluiu o pagamento, use o botão abaixo.",
      cta_label: "Concluir pagamento",
      closing: SIGN,
    },
  },
  {
    key: "pagamento-confirmado",
    group: "Pedidos",
    name: "Pagamento confirmado",
    when: "Quando o pagamento é aprovado.",
    variables: ORDER_VARS,
    defaults: {
      subject: "Pagamento confirmado — pedido {numero_pedido}",
      heading: "Pagamento confirmado",
      intro: "Olá, {nome}! O pagamento do pedido {numero_pedido} ({total}) foi confirmado.",
      body: "Já estamos separando seus produtos. Você receberá outro e-mail com o código de rastreio assim que o pedido for enviado.",
      cta_label: "Ver meu pedido",
      closing: SIGN,
    },
  },
  {
    key: "pagamento-recusado",
    group: "Pedidos",
    name: "Pagamento recusado ou expirado",
    when: "Quando o pagamento é recusado ou cancelado.",
    variables: ORDER_VARS,
    defaults: {
      subject: "Não conseguimos confirmar o pagamento do pedido {numero_pedido}",
      heading: "Pagamento não aprovado",
      intro: "Olá, {nome}. O pagamento do pedido {numero_pedido} não foi aprovado.",
      body: "Você pode tentar novamente com outra forma de pagamento. Se precisar de ajuda, responda este e-mail ou fale com a gente no WhatsApp.",
      cta_label: "Ver meu pedido",
      closing: SIGN,
    },
  },
  {
    key: "pedido-em-producao",
    group: "Pedidos",
    name: "Pedido em produção",
    when: "Quando o pedido muda para \"Em produção\" ou \"Arte aprovada\".",
    variables: ORDER_VARS,
    defaults: {
      subject: "Seu pedido {numero_pedido} está em produção",
      heading: "Em produção",
      intro: "Olá, {nome}! O pedido {numero_pedido} entrou em produção.",
      body: "Avisaremos assim que ele for enviado.",
      cta_label: "Ver meu pedido",
      closing: SIGN,
    },
  },
  {
    key: "pedido-enviado",
    group: "Pedidos",
    name: "Pedido enviado",
    when: "Quando o pedido muda para \"Enviado\".",
    variables: [...ORDER_VARS, "transportadora", "rastreio"],
    defaults: {
      subject: "Seu pedido {numero_pedido} foi enviado",
      heading: "Pedido a caminho",
      intro: "Olá, {nome}! O pedido {numero_pedido} foi enviado.",
      body: "Transportadora: {transportadora}\nCódigo de rastreio: {rastreio}",
      cta_label: "Acompanhar pedido",
      closing: SIGN,
    },
  },
  {
    key: "pedido-entregue",
    group: "Pedidos",
    name: "Pedido entregue",
    when: "Quando o pedido muda para \"Entregue\".",
    variables: ORDER_VARS,
    defaults: {
      subject: "Pedido {numero_pedido} entregue — obrigado!",
      heading: "Pedido entregue",
      intro: "Olá, {nome}! O pedido {numero_pedido} foi entregue.",
      body: "Esperamos que tenha gostado. Sua avaliação no Google ajuda muito a nossa empresa: https://search.google.com/local/writereview?placeid=ChIJRZiVPxAeuAARhE6fc6lFr_Y",
      cta_label: "Ver meu pedido",
      closing: SIGN,
    },
  },
  {
    key: "pedido-cancelado",
    group: "Pedidos",
    name: "Pedido cancelado",
    when: "Quando o pedido muda para \"Cancelado\".",
    variables: ORDER_VARS,
    defaults: {
      subject: "Pedido {numero_pedido} cancelado",
      heading: "Pedido cancelado",
      intro: "Olá, {nome}. O pedido {numero_pedido} foi cancelado.",
      body: "Se você não pediu o cancelamento ou tiver qualquer dúvida, responda este e-mail.",
      cta_label: "Ver meu pedido",
      closing: SIGN,
    },
  },
  {
    key: "contato-confirmacao",
    group: "Contato e conteúdo",
    name: "Contato recebido (cliente)",
    when: "Quando alguém envia o formulário de contato/orçamento.",
    variables: ["nome"],
    defaults: {
      subject: "Recebemos sua mensagem, {nome}",
      heading: "Obrigado pelo contato",
      intro: "Olá, {nome}! Recebemos sua solicitação.",
      body: "Nossa equipe responde em até 1 dia útil. Se for urgente, chame no WhatsApp +55 27 99273-3033.",
      cta_label: "Ver catálogo",
      closing: SIGN,
    },
  },
  {
    key: "contato-aviso-interno",
    group: "Contato e conteúdo",
    name: "Novo contato (aviso para vendas@)",
    when: "Enviado para vendas@adeconex.com.br a cada formulário de contato.",
    variables: ["nome", "empresa", "email", "telefone", "segmento", "mensagem"],
    internal: true,
    defaults: {
      subject: "Novo contato pelo site: {nome}",
      heading: "Novo contato pelo site",
      intro: "{nome} ({empresa}) enviou o formulário de contato.",
      body: "E-mail: {email}\nTelefone: {telefone}\nSegmento: {segmento}\n\nMensagem:\n{mensagem}",
      cta_label: "",
      closing: "Site Adeconex",
    },
  },
  {
    key: "newsletter-inscricao",
    group: "Contato e conteúdo",
    name: "Inscrição na newsletter",
    when: "Quando alguém se inscreve pelo rodapé do site.",
    variables: ["link"],
    defaults: {
      subject: "Inscrição confirmada na Adeconex",
      heading: "Obrigado por se inscrever",
      intro: "Sua inscrição foi confirmada.",
      body: "Você vai receber novidades sobre etiquetas, ribbons, impressoras térmicas e dicas de identificação.",
      cta_label: "Visitar o site",
      closing: SIGN,
    },
  },
  {
    key: "download-link",
    group: "Contato e conteúdo",
    name: "Link do download",
    when: "Quando a pessoa pede o link de um driver/manual por e-mail.",
    variables: ["arquivo", "link"],
    defaults: {
      subject: "Seu download: {arquivo}",
      heading: "Seu download está aqui",
      intro: "Segue o link para baixar {arquivo}.",
      body: "Na página do download você também encontra o passo a passo de instalação. Precisa de ajuda? Responda este e-mail.",
      cta_label: "Baixar agora",
      closing: SIGN,
    },
  },
  {
    key: "catalogo-lista",
    group: "Contato e conteúdo",
    name: "Sua lista do catálogo",
    when: "Quando a pessoa salva uma pesquisa do catálogo e pede por e-mail.",
    variables: ["nome", "quantidade", "link"],
    defaults: {
      subject: "Sua lista do catálogo Adeconex",
      heading: "Sua lista está pronta",
      intro: "Olá, {nome}! Salvamos os {quantidade} produtos da sua pesquisa no catálogo.",
      body: "No link você vê os produtos com preço atualizado e pode baixar o PDF. Quer um orçamento? É só responder este e-mail ou chamar no WhatsApp (27) 99273-3033.",
      cta_label: "Abrir minha lista",
      closing: SIGN,
    },
  },
  {
    key: "avaliacao-pedido",
    group: "Pedidos",
    name: "Pedido de avaliação",
    when: "7 dias depois de o pedido ser marcado como entregue. Mostra estrelas clicáveis para cada produto.",
    variables: ["nome", "numero_pedido", "link"],
    defaults: {
      subject: "{nome}, como foi sua experiência com a Adeconex?",
      heading: "Como foi sua experiência?",
      intro: "Olá, {nome}! Faz uma semana que o pedido {numero_pedido} chegou.",
      body: "Sua opinião ajuda outros clientes a escolher o produto certo. Toque nas estrelas abaixo — leva menos de 1 minuto e você pode incluir fotos ou vídeo.",
      cta_label: "Avaliar meus produtos",
      closing: SIGN,
    },
  },
  {
    key: "avaliacao-lembrete",
    group: "Pedidos",
    name: "Lembrete de avaliação",
    when: "Único lembrete, 7 dias após o pedido de avaliação, se o cliente ainda não avaliou.",
    variables: ["nome", "numero_pedido", "link"],
    defaults: {
      subject: "Ainda dá tempo de avaliar seu pedido {numero_pedido}",
      heading: "Conta pra gente o que achou?",
      intro: "Olá, {nome}! Ainda não recebemos sua avaliação do pedido {numero_pedido}.",
      body: "Este é o último lembrete — prometemos não insistir. Sua nota fica visível na página do produto e ajuda muito outros compradores.",
      cta_label: "Avaliar agora",
      closing: SIGN,
    },
  },
  {
    key: "avaliacao-aviso-interno",
    group: "Pedidos",
    name: "Nova avaliação (aviso para vendas@)",
    when: "Enviado para vendas@adeconex.com.br quando chega uma avaliação nova para moderar.",
    variables: ["nome", "produto", "nota", "mensagem", "link"],
    internal: true,
    defaults: {
      subject: "Nova avaliação ({nota}★) — {produto}",
      heading: "Nova avaliação para moderar",
      intro: "{nome} avaliou {produto} com nota {nota}.",
      body: "{mensagem}",
      cta_label: "Moderar avaliações",
      closing: "Site Adeconex",
    },
  },
];

export const APP_EMAIL_KEYS = APP_EMAILS.map((e) => e.key) as [AppEmailKey, ...AppEmailKey[]];

export function getAppEmailDef(key: string): AppEmailDef | undefined {
  return APP_EMAILS.find((e) => e.key === key);
}

/** Substitui {variavel} pelos valores; variáveis vazias viram "—". */
export function interpolate(text: string, vars: Record<string, string | null | undefined>): string {
  return (text ?? "").replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    return v == null || v === "" ? "—" : String(v);
  });
}

export function mergeTexts(defaults: AppEmailTexts, row?: Partial<Record<keyof AppEmailTexts, string | null>> | null): AppEmailTexts {
  const out = { ...defaults };
  if (row) {
    (Object.keys(defaults) as (keyof AppEmailTexts)[]).forEach((k) => {
      const v = row[k];
      if (typeof v === "string") out[k] = v;
    });
  }
  return out;
}

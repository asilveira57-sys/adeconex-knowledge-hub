/**
 * Conteúdo das páginas institucionais, de ajuda e jurídicas.
 * Dados marcados como pendentes aparecem destacados na página para revisão.
 */

export const COMPANY = {
  legalName: "Adeconex Ind e Com Ltda",
  brand: "Adeconex",
  cnpj: "09.406.758/0001-07",
  address: "R. Silva Xavier, 46 - Cristóvão Colombo, Vila Velha - ES, 29106-460",
  email: "vendas@adeconex.com.br",
  phone: "(27) 3318-6565",
  whatsapp: "(27) 99273-3033",
};

export type InstSection = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
  /** Texto pendente de confirmação pela empresa. */
  pending?: string;
};

export type InstPage = {
  path: string;
  group: "Institucional" | "Ajuda e atendimento" | "Legal e privacidade";
  title: string;
  h1: string;
  description: string;
  intro: string;
  updated: string;
  /** Documento proposto, sujeito a aprovação/revisão jurídica. */
  draftNotice?: string;
  sections: InstSection[];
  links?: { to: string; label: string }[];
};

const UPDATED = "17 de outubro de 2026";
const ID = `${COMPANY.legalName}, CNPJ ${COMPANY.cnpj}, com endereço em ${COMPANY.address}`;
const CONTACT = `E-mail ${COMPANY.email}, telefone ${COMPANY.phone} ou WhatsApp ${COMPANY.whatsapp}.`;
const LEGAL_REVIEW = "Documento em revisão: o texto pode ser ajustado após análise jurídica da empresa.";

export const INSTITUTIONAL_PAGES: Record<string, InstPage> = {
  "quem-somos": {
    path: "/quem-somos",
    group: "Institucional",
    title: "Quem Somos — Adeconex",
    h1: "Quem somos",
    description: "Conheça a Adeconex: etiquetas, ribbons e soluções de identificação com atendimento técnico em Vila Velha (ES) e envio para todo o Brasil.",
    intro: "A Adeconex trabalha com etiquetas adesivas, ribbons e suprimentos de identificação para empresas e profissionais que imprimem etiquetas no dia a dia.",
    updated: UPDATED,
    sections: [
      { heading: "O que fazemos", paragraphs: ["Fornecemos etiquetas, ribbons e materiais de identificação, além de ferramentas gratuitas para ajudar a escolher a medida certa, calcular consumo e gerar códigos de barras e QR Codes."] },
      { heading: "Como atendemos", paragraphs: ["Você pode comprar pela loja virtual, com pagamento pelo Mercado Pago e frete calculado no carrinho, ou falar com a nossa equipe por WhatsApp, telefone e e-mail para tirar dúvidas técnicas antes da compra."] },
      { heading: "Nosso compromisso", list: ["Informação clara sobre medidas e aplicações dos produtos.", "Atendimento por pessoas, com orientação técnica.", "Transparência sobre preços, frete e prazos no momento da compra."] },
      { heading: "Dados da empresa", list: [`Razão social: ${COMPANY.legalName}`, `CNPJ: ${COMPANY.cnpj}`, `Endereço: ${COMPANY.address}`] },
    ],
    links: [{ to: "/empresa", label: "Conheça a empresa" }, { to: "/catalogo", label: "Ver catálogo" }, { to: "/contato", label: "Fale conosco" }],
  },
  "nossa-historia": {
    path: "/nossa-historia",
    group: "Institucional",
    title: "Nossa História — Adeconex",
    h1: "Nossa história",
    description: "A trajetória da Adeconex no mercado de etiquetas, ribbons e identificação.",
    intro: "Esta página vai reunir a trajetória da Adeconex: como começamos, o que aprendemos e para onde estamos indo.",
    updated: UPDATED,
    sections: [
      { heading: "Como tudo começou", pending: "A preencher pela empresa: ano e contexto de fundação." },
      { heading: "Marcos da nossa trajetória", pending: "A preencher pela empresa: principais acontecimentos (novos produtos, mudança de sede, novos serviços)." },
      { heading: "Hoje", paragraphs: ["Atendemos clientes de todo o Brasil pela loja virtual e pelos canais de atendimento, com sede em Vila Velha (ES)."] },
    ],
    links: [{ to: "/quem-somos", label: "Quem somos" }, { to: "/missao-visao-valores", label: "Missão, visão e valores" }],
  },
  "missao-visao-valores": {
    path: "/missao-visao-valores",
    group: "Institucional",
    title: "Missão, Visão e Valores — Adeconex",
    h1: "Missão, visão e valores",
    description: "Os princípios que orientam o atendimento e o trabalho da Adeconex.",
    intro: "Os princípios que orientam a forma como atendemos e trabalhamos.",
    updated: UPDATED,
    draftNotice: "Proposta de texto institucional, sujeita à aprovação da empresa.",
    sections: [
      { heading: "Missão", paragraphs: ["Ajudar empresas e profissionais a identificar seus produtos com etiquetas e suprimentos adequados a cada uso, com orientação clara e atendimento próximo."] },
      { heading: "Visão", paragraphs: ["Ser reconhecida como referência em etiquetas e identificação pela qualidade da orientação técnica e pela confiança dos clientes."] },
      { heading: "Valores", list: ["Atendimento: ouvir o cliente e indicar o que de fato atende a necessidade.", "Qualidade: oferecer produtos compatíveis com o uso informado.", "Transparência: preços, prazos e condições claros.", "Compromisso: cumprir o combinado e resolver quando algo der errado."] },
    ],
  },
  diferenciais: {
    path: "/diferenciais",
    group: "Institucional",
    title: "Nossos Diferenciais — Adeconex",
    h1: "Nossos diferenciais",
    description: "Orientação técnica, ferramentas gratuitas, etiquetas personalizadas e compra online com frete calculado: veja o que a Adeconex oferece.",
    intro: "O que você encontra ao comprar com a Adeconex.",
    updated: UPDATED,
    sections: [
      { heading: "Orientação técnica", paragraphs: ["Nossa equipe ajuda a escolher etiqueta e ribbon compatíveis com sua impressora e aplicação, pelo WhatsApp, telefone ou e-mail."] },
      { heading: "Ferramentas gratuitas", paragraphs: ["Calculadoras de consumo de ribbon e de etiquetas por rolo, planejadores de folha e bobina, gerador de código de barras, QR Code e visualizador ZPL."] },
      { heading: "Etiquetas personalizadas", paragraphs: ["Editor online para criar sua arte de etiqueta, salvar na sua conta e reabrir depois."] },
      { heading: "Compra online", paragraphs: ["Frete calculado no carrinho, pagamento pelo Mercado Pago e acompanhamento do pedido na sua conta."] },
      { heading: "Downloads de drivers", paragraphs: ["Central de downloads com drivers e softwares de impressoras térmicas."] },
    ],
    links: [{ to: "/ferramentas", label: "Ferramentas" }, { to: "/downloads", label: "Downloads" }, { to: "/catalogo", label: "Catálogo" }],
  },
  "perguntas-frequentes": {
    path: "/perguntas-frequentes",
    group: "Ajuda e atendimento",
    title: "Perguntas Frequentes — Adeconex",
    h1: "Perguntas frequentes",
    description: "Dúvidas sobre cadastro, compra, pagamento, frete, pedidos, trocas, garantia e privacidade na loja Adeconex.",
    intro: "Respostas rápidas sobre compras na Adeconex. Não encontrou? Fale com a gente.",
    updated: UPDATED,
    sections: [
      { heading: "Cadastro e conta", paragraphs: ["Preciso de cadastro para comprar? Sim. O cadastro guarda seus dados e endereços e permite acompanhar pedidos.", "Pessoa jurídica precisa informar CPF? Sim. Pedimos o CPF do responsável, usado para gerar a etiqueta de envio."] },
      { heading: "Produtos e disponibilidade", paragraphs: ["Como sei se a etiqueta serve na minha impressora? Veja a ficha técnica do produto ou fale com nosso atendimento antes da compra."] },
      { heading: "Como comprar", paragraphs: ["Escolha o produto, adicione ao carrinho, informe o endereço, escolha o frete e pague pelo Mercado Pago. O passo a passo está em Como comprar."] },
      { heading: "Pagamento", paragraphs: ["O pagamento é feito no ambiente do Mercado Pago. As opções e o parcelamento disponíveis aparecem na tela de pagamento do Mercado Pago."] },
      { heading: "Frete e entrega", paragraphs: ["O frete e o prazo estimado são calculados pelo CEP no carrinho, com as opções de transportadora disponíveis para o seu endereço."] },
      { heading: "Pedidos", paragraphs: ["Você acompanha o status em Minha conta e recebe e-mails a cada etapa: pedido recebido, pagamento confirmado, enviado e entregue."] },
      { heading: "Trocas, devoluções e cancelamentos", paragraphs: ["Você pode desistir da compra em até 7 dias após o recebimento. Veja as políticas de Trocas e devoluções e de Cancelamento e reembolso."] },
      { heading: "Garantia", paragraphs: ["Produtos com defeito têm a garantia legal prevista no Código de Defesa do Consumidor. Veja a Política de garantia."] },
      { heading: "Privacidade e atendimento", paragraphs: [`Seus dados são usados para processar pedidos e atendimento, conforme a Política de privacidade. Contato: ${CONTACT}`] },
    ],
    links: [{ to: "/como-comprar", label: "Como comprar" }, { to: "/contato", label: "Fale conosco" }],
  },
  "como-comprar": {
    path: "/como-comprar",
    group: "Ajuda e atendimento",
    title: "Como Comprar — Adeconex",
    h1: "Como comprar",
    description: "Passo a passo para comprar na loja Adeconex: catálogo, carrinho, frete, pagamento pelo Mercado Pago e acompanhamento do pedido.",
    intro: "Comprar na Adeconex é simples. Veja as etapas:",
    updated: UPDATED,
    sections: [
      { heading: "1. Navegue pelo catálogo", paragraphs: ["Use a busca, os filtros e a ordenação para encontrar o produto."] },
      { heading: "2. Escolha o produto", paragraphs: ["Abra a página do produto e confira fotos, medidas e ficha técnica. Quando houver, escolha a variação ou o kit."] },
      { heading: "3. Adicione ao carrinho", paragraphs: ["Defina a quantidade e clique em adicionar ao carrinho."] },
      { heading: "4. Confira o carrinho", paragraphs: ["Revise quantidades e valores. Se tiver cupom, aplique aqui."] },
      { heading: "5. Entre ou crie sua conta", paragraphs: ["Para finalizar é preciso estar logado, com nome, CPF (ou CNPJ e CPF do responsável) e telefone."] },
      { heading: "6. Informe o endereço", paragraphs: ["Escolha um endereço salvo ou cadastre um novo pelo CEP."] },
      { heading: "7. Escolha o frete", paragraphs: ["Selecione uma das opções de entrega exibidas, com valor e prazo estimado."] },
      { heading: "8. Revise e pague", paragraphs: ["Confira o resumo e siga para o Mercado Pago para escolher a forma de pagamento."] },
      { heading: "9. Acompanhe o pedido", paragraphs: ["Após o pagamento, acompanhe o status e o rastreio em Minha conta e pelos e-mails que enviamos."] },
    ],
    links: [{ to: "/catalogo", label: "Ir ao catálogo" }, { to: "/carrinho", label: "Meu carrinho" }, { to: "/formas-de-pagamento", label: "Formas de pagamento" }, { to: "/entrega-e-frete", label: "Entrega e frete" }, { to: "/contato", label: "Atendimento" }],
  },
  "formas-de-pagamento": {
    path: "/formas-de-pagamento",
    group: "Ajuda e atendimento",
    title: "Formas de Pagamento — Adeconex",
    h1: "Formas de pagamento",
    description: "Pagamentos da loja Adeconex são processados pelo Mercado Pago. Veja como funciona.",
    intro: "Todos os pagamentos da loja são processados pelo Mercado Pago, em ambiente seguro.",
    updated: UPDATED,
    sections: [
      { heading: "Como funciona", paragraphs: ["Ao finalizar o pedido, você é levado ao Mercado Pago, onde escolhe a forma de pagamento entre as opções disponíveis no momento, como Pix, cartão de crédito e boleto."] },
      { heading: "Parcelamento", paragraphs: ["O número de parcelas e eventuais juros são definidos e exibidos pelo Mercado Pago na tela de pagamento, antes da confirmação."] },
      { heading: "Confirmação", paragraphs: ["Assim que o Mercado Pago aprova o pagamento, o pedido é atualizado e você recebe um e-mail de confirmação. O tempo de aprovação depende da forma escolhida."] },
      { heading: "Segurança", paragraphs: ["Os dados do cartão são digitados no Mercado Pago e não são armazenados pela Adeconex."] },
    ],
    links: [{ to: "/como-comprar", label: "Como comprar" }, { to: "/cancelamento-e-reembolso", label: "Cancelamento e reembolso" }],
  },
  "entrega-e-frete": {
    path: "/entrega-e-frete",
    group: "Ajuda e atendimento",
    title: "Entrega e Frete — Adeconex",
    h1: "Política de entrega e frete",
    description: "Como calcular o frete, prazos estimados, rastreio e o que fazer em caso de atraso nas entregas da Adeconex.",
    intro: "Enviamos a partir de Vila Velha (ES) para todo o Brasil.",
    updated: UPDATED,
    sections: [
      { heading: "Cálculo do frete", paragraphs: ["O frete é calculado pelo CEP de entrega, com base no peso e nas dimensões da embalagem. As opções de transportadora, valores e prazos estimados aparecem no carrinho e no checkout."] },
      { heading: "Prazo", paragraphs: ["O prazo exibido é uma estimativa da transportadora e começa a contar após a postagem."], pending: "A confirmar pela empresa: prazo de separação e postagem após a confirmação do pagamento." },
      { heading: "Acompanhamento", paragraphs: ["Quando o pedido é enviado, você recebe por e-mail a transportadora e o código de rastreio, também disponíveis em Minha conta."] },
      { heading: "Atraso ou entrega não realizada", paragraphs: [`Se o pedido atrasar ou a entrega não acontecer, fale com a gente: ${CONTACT} Vamos verificar com a transportadora e combinar a solução, como novo envio ou reembolso.`] },
      { heading: "Ao receber", paragraphs: ["Confira a embalagem. Se houver avaria ou produto diferente do pedido, registre fotos e entre em contato."] },
    ],
    links: [{ to: "/trocas-e-devolucoes", label: "Trocas e devoluções" }, { to: "/contato", label: "Atendimento" }],
  },
  "trocas-e-devolucoes": {
    path: "/trocas-e-devolucoes",
    group: "Ajuda e atendimento",
    title: "Trocas e Devoluções — Adeconex",
    h1: "Política de trocas e devoluções",
    description: "Direito de arrependimento, produtos com defeito ou em desacordo: como solicitar troca ou devolução na Adeconex.",
    intro: "Esta política segue o Código de Defesa do Consumidor (CDC) e as regras do comércio eletrônico.",
    updated: UPDATED,
    draftNotice: LEGAL_REVIEW,
    sections: [
      { heading: "Direito de arrependimento", paragraphs: ["Nas compras pela internet, você pode desistir em até 7 dias corridos após o recebimento (art. 49 do CDC), sem precisar justificar. Os valores pagos, incluindo o frete, são devolvidos."] },
      { heading: "Produto com defeito", paragraphs: ["Você pode reclamar em até 90 dias após o recebimento para produtos duráveis e 30 dias para não duráveis (art. 26 do CDC). Se o problema não for resolvido em até 30 dias, você pode escolher troca, devolução do valor ou abatimento do preço."] },
      { heading: "Produto diferente do pedido", paragraphs: ["Se receber item diferente do comprado, avise-nos. Faremos a troca ou o reembolso, sem custo para você."] },
      { heading: "Troca por preferência", pending: "A definir pela empresa: se aceita troca por escolha do cliente fora dos casos legais e em quais condições." },
      { heading: "Como solicitar", list: [`Entre em contato: ${CONTACT}`, "Informe o número do pedido e o motivo.", "Envie fotos quando houver defeito ou avaria.", "Aguarde as instruções de devolução."] },
      { heading: "Envio de volta", paragraphs: ["Nos casos de arrependimento, defeito ou erro no envio, a Adeconex informa como devolver o produto sem custo para você."] },
      { heading: "Produtos personalizados", paragraphs: ["Etiquetas produzidas com a sua arte são feitas sob medida. Defeitos de fabricação seguem a garantia legal normalmente."] },
    ],
    links: [{ to: "/cancelamento-e-reembolso", label: "Cancelamento e reembolso" }, { to: "/garantia", label: "Garantia" }],
  },
  "cancelamento-e-reembolso": {
    path: "/cancelamento-e-reembolso",
    group: "Ajuda e atendimento",
    title: "Cancelamento e Reembolso — Adeconex",
    h1: "Política de cancelamento e reembolso",
    description: "Como cancelar um pedido na Adeconex e como funciona a devolução dos valores conforme a forma de pagamento.",
    intro: "Como cancelar um pedido e receber o valor de volta.",
    updated: UPDATED,
    draftNotice: LEGAL_REVIEW,
    sections: [
      { heading: "Pedido aguardando pagamento", paragraphs: ["Se o pagamento não for feito, o pedido não é processado e nenhum valor é cobrado."] },
      { heading: "Pedido pago e ainda não enviado", paragraphs: [`Fale com a gente informando o número do pedido: ${CONTACT} Cancelamos e iniciamos o reembolso integral.`] },
      { heading: "Pedido já enviado", paragraphs: ["Você pode recusar a entrega ou exercer o direito de arrependimento em até 7 dias após o recebimento. O reembolso é feito após o retorno do produto, conforme a política de trocas e devoluções."] },
      { heading: "Como o valor é devolvido", list: ["Pix ou boleto: devolução pelo Mercado Pago ou em conta indicada por você.", "Cartão de crédito: estorno solicitado ao Mercado Pago; o crédito aparece na fatura conforme o prazo da administradora do cartão."] },
      { heading: "Prazo de reembolso", pending: "A confirmar pela empresa: prazo para solicitar o estorno após a aprovação do cancelamento." },
    ],
    links: [{ to: "/trocas-e-devolucoes", label: "Trocas e devoluções" }, { to: "/formas-de-pagamento", label: "Formas de pagamento" }],
  },
  garantia: {
    path: "/garantia",
    group: "Ajuda e atendimento",
    title: "Política de Garantia — Adeconex",
    h1: "Política de garantia",
    description: "Garantia legal dos produtos Adeconex e como pedir atendimento em caso de defeito.",
    intro: "Todos os produtos vendidos pela Adeconex têm a garantia prevista em lei.",
    updated: UPDATED,
    draftNotice: LEGAL_REVIEW,
    sections: [
      { heading: "Garantia legal", paragraphs: ["Pelo Código de Defesa do Consumidor, você tem 30 dias para produtos não duráveis (como etiquetas e ribbons) e 90 dias para produtos duráveis, contados do recebimento. Para defeitos que só aparecem com o uso, o prazo conta a partir do momento em que o defeito é percebido."] },
      { heading: "Garantia do fabricante", paragraphs: ["Alguns produtos podem ter garantia adicional do fabricante, informada na página do produto ou na nota fiscal. Ela se soma à garantia legal."] },
      { heading: "Como solicitar", list: [`Entre em contato: ${CONTACT}`, "Informe o número do pedido e descreva o problema.", "Envie fotos ou vídeos e, se possível, um exemplo da impressão.", "Nossa equipe analisa e informa a solução: reparo, troca ou reembolso."] },
      { heading: "Dicas para evitar problemas", paragraphs: ["Guarde etiquetas e ribbons em local seco e longe do sol, e confirme a compatibilidade com sua impressora antes do uso."] },
    ],
    links: [{ to: "/trocas-e-devolucoes", label: "Trocas e devoluções" }, { to: "/contato", label: "Atendimento" }],
  },
  "termos-de-uso": {
    path: "/termos-de-uso",
    group: "Legal e privacidade",
    title: "Termos de Uso — Adeconex",
    h1: "Termos de uso",
    description: "Regras de uso do site e da loja virtual Adeconex: cadastro, pedidos, pagamentos, entregas e direitos do consumidor.",
    intro: "Ao usar este site, você concorda com estes termos. Leia com atenção.",
    updated: UPDATED,
    draftNotice: LEGAL_REVIEW,
    sections: [
      { heading: "1. Quem somos", paragraphs: [`Este site é mantido por ${ID}.`] },
      { heading: "2. Aceitação", paragraphs: ["Estes termos valem para todos que acessam o site ou compram na loja. Eles não afastam os direitos garantidos pelo Código de Defesa do Consumidor."] },
      { heading: "3. Cadastro e conta", paragraphs: ["Para comprar é preciso criar uma conta com dados verdadeiros. Você é responsável por manter sua senha em sigilo e por avisar caso perceba uso indevido."] },
      { heading: "4. Uso da plataforma", paragraphs: ["Não é permitido usar o site para fins ilegais, tentar acessar áreas restritas, prejudicar seu funcionamento ou copiar conteúdo de forma automatizada."] },
      { heading: "5. Produtos", paragraphs: ["Procuramos descrever cada produto com precisão. Fotos são ilustrativas e podem ter pequenas variações de cor. A disponibilidade é confirmada no momento da compra."] },
      { heading: "6. Pedidos", paragraphs: ["O pedido é registrado ao finalizar o checkout e confirmado após a aprovação do pagamento. Você recebe a confirmação por e-mail."] },
      { heading: "7. Preços e pagamento", paragraphs: ["Os preços estão em reais (R$). O valor válido é o exibido no fechamento do pedido. O pagamento é processado pelo Mercado Pago."] },
      { heading: "8. Entrega", paragraphs: ["O frete e o prazo estimado são informados antes do pagamento. Veja a Política de entrega e frete."] },
      { heading: "9. Cancelamentos, trocas e reembolsos", paragraphs: ["Seguem as políticas de Trocas e devoluções e de Cancelamento e reembolso, respeitando o direito de arrependimento de 7 dias."] },
      { heading: "10. Propriedade intelectual", paragraphs: ["Marcas, textos, imagens e ferramentas do site pertencem à Adeconex ou a seus parceiros e não podem ser reproduzidos sem autorização. As artes que você cria no editor de etiquetas continuam sendo suas."] },
      { heading: "11. Responsabilidades", paragraphs: ["As ferramentas gratuitas (calculadoras, geradores) dão resultados de referência; confirme as medidas antes de produzir em grande quantidade. Nada nestes termos limita a responsabilidade da Adeconex nos casos previstos em lei."] },
      { heading: "12. Proteção de dados", paragraphs: ["O uso dos seus dados segue a Política de privacidade e a Política de cookies."] },
      { heading: "13. Alterações", paragraphs: ["Estes termos podem ser atualizados. A data da última atualização fica no topo da página."] },
      { heading: "14. Legislação e contato", paragraphs: [`Aplica-se a legislação brasileira. Dúvidas: ${CONTACT}`] },
    ],
    links: [{ to: "/politica-de-privacidade", label: "Política de privacidade" }, { to: "/politica-de-cookies", label: "Política de cookies" }],
  },
  "politica-de-privacidade": {
    path: "/politica-de-privacidade",
    group: "Legal e privacidade",
    title: "Política de Privacidade — Adeconex",
    h1: "Política de privacidade",
    description: "Como a Adeconex coleta, usa, compartilha e protege seus dados pessoais, conforme a LGPD.",
    intro: "Esta política explica como tratamos seus dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).",
    updated: UPDATED,
    draftNotice: LEGAL_REVIEW,
    sections: [
      { heading: "1. Controlador", paragraphs: [`O responsável pelos seus dados é ${ID}.`] },
      { heading: "2. Dados que coletamos", list: ["Cadastro: nome, e-mail, telefone, CPF e, para empresas, CNPJ e razão social.", "Entrega: endereços cadastrados.", "Pedidos: produtos, valores, status do pagamento e da entrega (os dados do cartão ficam com o Mercado Pago).", "Contato e listas do catálogo: nome, e-mail, WhatsApp e mensagem enviados nos formulários.", "Newsletter: e-mail.", "Navegação: páginas visitadas e dispositivo, de forma anônima, e dados de análise somente com seu consentimento.", "Editor de etiquetas: as artes que você salva na conta."] },
      { heading: "3. Para que usamos", list: ["Processar pedidos, pagamentos e entregas (execução de contrato).", "Emitir nota fiscal e cumprir obrigações legais.", "Responder contatos e enviar e-mails sobre seus pedidos.", "Enviar a newsletter, quando você se inscreve (consentimento).", "Medir o uso do site e anúncios, quando você aceita os cookies opcionais (consentimento).", "Segurança e prevenção a fraudes (legítimo interesse)."] },
      { heading: "4. Com quem compartilhamos", list: ["Mercado Pago: processamento de pagamentos.", "Melhor Envio e transportadoras: cálculo de frete e entrega.", "Olist (ERP): emissão de nota fiscal e gestão do pedido.", "Lovable e provedores de nuvem: hospedagem do site, banco de dados e envio de e-mails.", "Google (Analytics/Tag Manager) e Meta (Pixel): análise e anúncios, somente com seu consentimento."] },
      { heading: "5. Transferência internacional", paragraphs: ["Alguns desses fornecedores podem armazenar dados fora do Brasil, com as garantias previstas na LGPD."] },
      { heading: "6. Cookies", paragraphs: ["Veja a Política de cookies para saber quais usamos e como alterar suas preferências."] },
      { heading: "7. Por quanto tempo guardamos", paragraphs: ["Mantemos os dados enquanto sua conta estiver ativa e pelo tempo exigido por lei (por exemplo, dados fiscais por 5 anos). Depois disso, eles são excluídos ou anonimizados."] },
      { heading: "8. Segurança", paragraphs: ["Usamos conexão criptografada, controle de acesso por perfil na equipe e regras de acesso no banco de dados."] },
      { heading: "9. Seus direitos", list: ["Confirmar se tratamos seus dados e acessá-los.", "Corrigir dados incompletos ou desatualizados.", "Pedir anonimização, bloqueio ou exclusão de dados desnecessários.", "Pedir a portabilidade.", "Revogar o consentimento a qualquer momento.", "Saber com quem compartilhamos seus dados."] },
      { heading: "10. Como fazer uma solicitação", paragraphs: [`Envie seu pedido para ${COMPANY.email}, informando seu nome e e-mail de cadastro. Responderemos no prazo legal.`], pending: "A definir pela empresa: nome do encarregado de dados (DPO) e, se desejar, um e-mail exclusivo para privacidade." },
      { heading: "11. Atualizações", paragraphs: ["Esta política pode ser atualizada. A data da última versão fica no topo da página."] },
    ],
    links: [{ to: "/politica-de-cookies", label: "Política de cookies" }, { to: "/termos-de-uso", label: "Termos de uso" }],
  },
  "politica-de-cookies": {
    path: "/politica-de-cookies",
    group: "Legal e privacidade",
    title: "Política de Cookies — Adeconex",
    h1: "Política de cookies",
    description: "Quais cookies e tecnologias o site Adeconex usa, para que servem e como alterar seu consentimento.",
    intro: "Explicamos aqui, de forma simples, como usamos cookies e tecnologias parecidas.",
    updated: UPDATED,
    draftNotice: LEGAL_REVIEW,
    sections: [
      { heading: "O que são cookies", paragraphs: ["São pequenos arquivos ou registros guardados no seu navegador para lembrar informações, como o login e o carrinho."] },
      { heading: "Necessários (sempre ativos)", list: ["Login: mantém você conectado à sua conta.", "Carrinho: guarda os produtos escolhidos.", "Preferência de cookies: lembra sua escolha.", "Editor de etiquetas: salva o rascunho no navegador.", "Contagem anônima de visitas, sem identificar você, para estatísticas da própria loja."] },
      { heading: "Análise e marketing (opcionais)", paragraphs: ["Só são ativados se você aceitar:"], list: ["Google Analytics 4 e Google Tag Manager: medem como o site é usado.", "Meta Pixel: mede resultados de anúncios no Facebook e Instagram."] },
      { heading: "Duração", paragraphs: ["Os cookies de login e carrinho duram enquanto você usa a conta ou até limpar o navegador. Os cookies do Google Analytics duram até 2 anos e os da Meta até 90 dias, conforme definido por esses serviços."] },
      { heading: "Como alterar ou retirar o consentimento", paragraphs: ["Clique em \"Preferências de cookies\" no rodapé do site a qualquer momento. Você também pode apagar os cookies nas configurações do navegador. Recusar os opcionais não impede comprar na loja."] },
      { heading: "Contato", paragraphs: [CONTACT] },
    ],
    links: [{ to: "/politica-de-privacidade", label: "Política de privacidade" }],
  },
};

export const FOOTER_GROUPS = {
  institucional: [
    { to: "/empresa", label: "Empresa" },
    { to: "/quem-somos", label: "Quem somos" },
    { to: "/nossa-historia", label: "Nossa história" },
    { to: "/missao-visao-valores", label: "Missão, visão e valores" },
    { to: "/diferenciais", label: "Nossos diferenciais" },
    { to: "/blog", label: "Blog" },
    { to: "/contato", label: "Contato" },
  ],
  ajuda: [
    { to: "/como-comprar", label: "Como comprar" },
    { to: "/perguntas-frequentes", label: "Perguntas frequentes" },
    { to: "/formas-de-pagamento", label: "Formas de pagamento" },
    { to: "/entrega-e-frete", label: "Entrega e frete" },
    { to: "/trocas-e-devolucoes", label: "Trocas e devoluções" },
    { to: "/cancelamento-e-reembolso", label: "Cancelamento e reembolso" },
    { to: "/garantia", label: "Garantia" },
  ],
  legal: [
    { to: "/termos-de-uso", label: "Termos de uso" },
    { to: "/politica-de-privacidade", label: "Política de privacidade" },
    { to: "/politica-de-cookies", label: "Política de cookies" },
  ],
};

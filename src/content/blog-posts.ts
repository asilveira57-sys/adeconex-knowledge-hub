/**
 * Conteúdo editorial inicial do Blog Adeconex (Fase 1).
 * Artigos estáticos, tipados, servidos por /blog e /blog/$slug.
 * Quando o CMS entrar no ar, esta fonte vira fallback/seed.
 */

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; head: string[]; rows: string[][] };

export interface BlogPost {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  category: string;
  date: string; // ISO
  readingMinutes: number;
  excerpt: string;
  keywords: string[];
  blocks: BlogBlock[];
  faq?: { q: string; a: string }[];
  related?: string[];
}

export const BLOG_CATEGORIES = [
  "Ribbon",
  "Etiquetas",
  "Impressoras",
  "Compatibilidade",
  "Economia",
] as const;

export const blogPosts: BlogPost[] = [
  {
    slug: "ribbon-cera-cera-resina-resina-qual-escolher",
    title: "Ribbon cera, cera-resina ou resina: qual escolher para cada etiqueta",
    seoTitle: "Ribbon cera, cera-resina ou resina: qual escolher | Adeconex",
    description:
      "Entenda a diferença entre ribbon cera, cera-resina e resina, em quais materiais cada um funciona e como evitar borrar, apagar ou riscar a impressão.",
    category: "Ribbon",
    date: "2026-08-04",
    readingMinutes: 7,
    excerpt:
      "A maioria dos problemas de impressão térmica começa em uma escolha simples: o tipo de ribbon. Veja o critério prático para acertar de primeira.",
    keywords: [
      "ribbon cera",
      "ribbon cera resina",
      "ribbon resina",
      "qual ribbon usar",
      "impressão por transferência térmica",
    ],
    blocks: [
      {
        type: "p",
        text: "Ribbon é o filme que transfere tinta para a etiqueta no processo de transferência térmica. A cabeça de impressão aquece pontos do filme, a tinta derrete e adere ao substrato. Se a formulação do ribbon não combina com o material da etiqueta, a impressão sai fraca, borra ou some com o atrito — mesmo que a impressora esteja perfeita.",
      },
      { type: "h2", text: "As três famílias, em uma frase cada" },
      {
        type: "ul",
        items: [
          "Cera (wax): tinta mais macia, imprime rápido com baixa energia. Ideal para papel couché e etiquetas de logística sem exposição severa.",
          "Cera-resina (wax/resin): meio-termo. Mais resistência a atrito e umidade leve, imprime bem em papel e alguns sintéticos.",
          "Resina (resin): máxima resistência a atrito, calor, álcool e solventes. Obrigatória em sintéticos como BOPP, PET e poliéster.",
        ],
      },
      { type: "h2", text: "Tabela rápida de escolha" },
      {
        type: "table",
        head: ["Material da etiqueta", "Ribbon indicado", "Observação"],
        rows: [
          ["Papel couché adesivo", "Cera", "Melhor custo por metro; evita desgaste da cabeça."],
          ["Papel couché em ambiente úmido", "Cera-resina", "Ganha resistência sem trocar de material."],
          ["BOPP branco / transparente", "Resina", "Cera não adere ao sintético."],
          ["PET / poliéster", "Resina", "Uso em patrimônio, elétrica e químicos."],
          ["Fita de cetim", "Resina", "Necessário para lavagem e atrito em tecido."],
          ["Tag papel cartão", "Cera ou cera-resina", "Depende do manuseio da tag."],
        ],
      },
      { type: "h2", text: "Teste de campo em 30 segundos" },
      {
        type: "ol",
        items: [
          "Imprima uma etiqueta e espere 10 segundos.",
          "Passe a unha com força sobre o código de barras. Se apagar, suba um nível de resistência.",
          "Esfregue com pano levemente umedecido em álcool. Se borrar, você precisa de resina.",
          "Repita o leitor de código de barras após os testes: a leitura precisa continuar em primeira tentativa.",
        ],
      },
      { type: "h2", text: "Erros que custam caro" },
      {
        type: "ul",
        items: [
          "Usar resina em papel comum: aumenta o custo e não traz ganho real.",
          "Compensar ribbon errado subindo a temperatura: desgasta a cabeça de impressão e encurta a vida do equipamento.",
          "Misturar lotes de fornecedores diferentes na mesma operação sem revalidar a densidade.",
        ],
      },
      {
        type: "quote",
        text: "Regra prática: papel pede cera, sintético pede resina, e a dúvida entre os dois se resolve com cera-resina.",
      },
    ],
    faq: [
      {
        q: "Posso usar ribbon cera em etiqueta BOPP?",
        a: "Não é recomendado. A tinta de cera não ancora na superfície sintética e sai com o atrito. Use resina.",
      },
      {
        q: "Ribbon resina desgasta mais a cabeça de impressão?",
        a: "Exige mais energia, então o ideal é usar a menor temperatura que entregue leitura perfeita e manter a limpeza em dia.",
      },
    ],
    related: ["como-economizar-ribbon", "etiqueta-bopp-quando-vale-a-pena"],
  },
  {
    slug: "como-economizar-ribbon",
    title: "Como economizar ribbon sem perder qualidade de leitura",
    seoTitle: "Como economizar ribbon: 9 ajustes que reduzem custo | Adeconex",
    description:
      "Nove ajustes práticos de layout, temperatura, velocidade e compra que reduzem o consumo de ribbon mantendo a leitura do código de barras.",
    category: "Economia",
    date: "2026-08-03",
    readingMinutes: 8,
    excerpt:
      "Ribbon costuma ser o insumo mais desperdiçado da operação. Estes ajustes reduzem consumo sem sacrificar a legibilidade.",
    keywords: [
      "economizar ribbon",
      "consumo de ribbon",
      "custo por etiqueta",
      "reduzir custo impressão térmica",
    ],
    blocks: [
      {
        type: "p",
        text: "Ribbon é consumido pelo comprimento da etiqueta, não pela quantidade de tinta impressa. Isso significa que uma etiqueta quase vazia gasta praticamente o mesmo que uma etiqueta cheia. Economizar, portanto, é uma decisão de layout, de configuração e de compra — nessa ordem.",
      },
      { type: "h2", text: "1. Reduza a altura impressa, não a fonte" },
      {
        type: "p",
        text: "Concentre todo o conteúdo na área útil e evite margens verticais grandes. Em etiquetas de 100x150 mm, cortar 15 mm de área útil reduz cerca de 10% do rolo consumido no mês.",
      },
      { type: "h2", text: "2. Use o rolo com a largura certa" },
      {
        type: "p",
        text: "Ribbon mais largo que a etiqueta é dinheiro jogado fora e ainda acumula resíduo na cabeça. A largura ideal é a da etiqueta mais 2 a 4 mm de folga total.",
      },
      { type: "h2", text: "3. Ajuste temperatura e velocidade juntos" },
      {
        type: "ul",
        items: [
          "Comece na temperatura recomendada pelo fabricante do ribbon.",
          "Baixe de 2 em 2 pontos até o código falhar na leitura, depois volte 4 pontos.",
          "Velocidade alta com temperatura baixa borra; velocidade baixa com temperatura alta queima o filme.",
        ],
      },
      { type: "h2", text: "4. Prefira rolos longos" },
      {
        type: "table",
        head: ["Metragem do rolo", "Trocas por 100.000 etiquetas de 100 mm", "Impacto"],
        rows: [
          ["300 m", "~34 trocas", "Mais paradas e mais pontas perdidas"],
          ["450 m", "~23 trocas", "Bom equilíbrio para desktop"],
          ["600 m", "~17 trocas", "Melhor custo/metro em industriais"],
        ],
      },
      { type: "h2", text: "5. Elimine o desperdício invisível" },
      {
        type: "ul",
        items: [
          "Cada troca de rolo perde entre 20 cm e 1 m de leader.",
          "Etiquetas de teste impressas em rolo cheio: use o modo de calibração, não a impressão real.",
          "Reimpressões por erro de dado no ERP costumam representar 3% a 8% do consumo.",
        ],
      },
      { type: "h2", text: "6. Padronize um único tamanho quando possível" },
      {
        type: "p",
        text: "Operações com 5 ou 6 formatos diferentes trocam rolo o tempo todo. Reduzir para dois formatos (um logístico e um de produto) diminui trocas, sobras e estoque parado.",
      },
      { type: "h2", text: "7. Limpe a cabeça a cada rolo" },
      {
        type: "p",
        text: "Resíduo acumulado obriga a subir temperatura, o que acelera o desgaste do ribbon e da própria cabeça. Álcool isopropílico e caneta de limpeza a cada troca resolvem.",
      },
      { type: "h2", text: "8. Calcule o custo por etiqueta, não por rolo" },
      {
        type: "p",
        text: "Custo por etiqueta = (preço do rolo ÷ metragem) × (altura da etiqueta em metros). Um rolo mais caro com metragem maior quase sempre sai mais barato por etiqueta.",
      },
      { type: "h2", text: "9. Considere impressão térmica direta onde couber" },
      {
        type: "p",
        text: "Etiquetas de expedição com vida útil de poucos dias podem dispensar ribbon usando papel térmico direto. O ganho é o insumo inteiro — desde que não haja exposição a calor ou luz solar.",
      },
    ],
    faq: [
      {
        q: "Dá para reaproveitar sobras de ribbon?",
        a: "Sobras curtas podem ser usadas em testes internos, mas não recomendamos emendar rolos: a emenda pode rasgar dentro da impressora e danificar a cabeça.",
      },
      {
        q: "Ribbon mais barato compensa?",
        a: "Só se a densidade se mantiver com a mesma temperatura. Ribbon barato que exige mais calor consome mais energia e reduz a vida útil da cabeça.",
      },
    ],
    related: ["ribbon-cera-cera-resina-resina-qual-escolher", "calcular-quantas-etiquetas-tem-um-rolo"],
  },
  {
    slug: "tabela-compatibilidade-ribbon-impressora",
    title: "Compatibilidade de ribbon por impressora: como acertar mandril, lado da tinta e largura",
    seoTitle: "Compatibilidade de ribbon por impressora | Guia Adeconex",
    description:
      "Mandril, lado da tinta (CSI/CSO), largura e metragem: os quatro parâmetros que definem se um ribbon é compatível com a sua impressora térmica.",
    category: "Compatibilidade",
    date: "2026-08-02",
    readingMinutes: 6,
    excerpt:
      "Ribbon não é universal. Quatro parâmetros determinam a compatibilidade — e três deles costumam ser ignorados na hora da compra.",
    keywords: [
      "compatibilidade ribbon",
      "mandril ribbon",
      "ribbon CSI CSO",
      "ribbon para zebra",
      "ribbon para argox",
    ],
    blocks: [
      {
        type: "p",
        text: "Comprar ribbon pela largura apenas é a causa número um de rolo parado no estoque. Antes de fechar pedido, confira estes quatro parâmetros.",
      },
      { type: "h2", text: "1. Diâmetro do mandril (core)" },
      {
        type: "table",
        head: ["Mandril", "Perfil típico de impressora"],
        rows: [
          ["1/2\" (12,7 mm)", "Desktop compactas"],
          ["1\" (25,4 mm)", "Desktop mais comuns no Brasil"],
          ["1/2\" com entalhe", "Modelos que travam o rolo por encaixe"],
        ],
      },
      { type: "h2", text: "2. Lado da tinta: CSI ou CSO" },
      {
        type: "ul",
        items: [
          "CSI (coated side in): tinta voltada para dentro — padrão na maioria das desktop.",
          "CSO (coated side out): tinta voltada para fora — comum em industriais e alguns modelos específicos.",
          "Teste caseiro: cole uma fita adesiva no filme e puxe. O lado que solta tinta é o lado da tinta.",
        ],
      },
      { type: "h2", text: "3. Largura útil" },
      {
        type: "p",
        text: "O ribbon deve ser igual ou até 4 mm mais largo que a etiqueta, e nunca mais estreito. Ribbon estreito deixa a cabeça em contato direto com a etiqueta nas bordas — desgaste acelerado e risco de trilhas queimadas.",
      },
      { type: "h2", text: "4. Metragem versus capacidade interna" },
      {
        type: "p",
        text: "Desktop costuma aceitar até 300 m; industriais chegam a 450 m e 600 m. Comprar rolo longo demais simplesmente não fecha a tampa.",
      },
      { type: "h2", text: "Checklist antes de comprar" },
      {
        type: "ol",
        items: [
          "Meça o mandril do rolo atual com paquímetro ou régua.",
          "Confirme CSI/CSO com o teste da fita adesiva.",
          "Meça a largura da etiqueta e some 2 a 4 mm.",
          "Confira a metragem máxima no manual da impressora.",
          "Valide o tipo (cera, cera-resina, resina) conforme o material da etiqueta.",
        ],
      },
      {
        type: "p",
        text: "Se ainda restar dúvida, envie o modelo da impressora e uma foto do rolo atual para nossa equipe técnica — validamos a compatibilidade antes do pedido.",
      },
    ],
    faq: [
      {
        q: "Ribbon de outra marca funciona na minha impressora?",
        a: "Sim, desde que mandril, lado da tinta, largura e metragem sejam compatíveis. Impressoras térmicas não bloqueiam insumo por marca.",
      },
      {
        q: "O que acontece se eu montar o ribbon com o lado errado?",
        a: "Nada é impresso e a tinta pode aderir à cabeça. Pare, limpe com álcool isopropílico e remonte na orientação correta.",
      },
    ],
    related: ["ribbon-cera-cera-resina-resina-qual-escolher", "impressora-termica-desktop-ou-industrial"],
  },
  {
    slug: "impressora-termica-desktop-ou-industrial",
    title: "Impressora térmica desktop ou industrial: como decidir pelo volume",
    seoTitle: "Impressora térmica desktop ou industrial: qual escolher | Adeconex",
    description:
      "Volume diário, ciclo de trabalho, resolução e custo de manutenção: os critérios objetivos para escolher entre impressora desktop e industrial.",
    category: "Impressoras",
    date: "2026-08-01",
    readingMinutes: 7,
    excerpt:
      "Comprar desktop para volume industrial custa mais caro em 12 meses do que comprar a industrial certa desde o início.",
    keywords: [
      "impressora térmica industrial",
      "impressora de etiquetas desktop",
      "qual impressora de etiquetas comprar",
      "203 dpi ou 300 dpi",
    ],
    blocks: [
      {
        type: "p",
        text: "As duas categorias imprimem por transferência térmica, mas foram projetadas para regimes de trabalho diferentes. A escolha errada aparece na forma de cabeça queimada antes do tempo e paradas de linha.",
      },
      { type: "h2", text: "Comparativo direto" },
      {
        type: "table",
        head: ["Critério", "Desktop", "Industrial"],
        rows: [
          ["Volume diário indicado", "até ~1.000 etiquetas", "acima de 2.000 etiquetas"],
          ["Rolo de etiqueta", "até 127 mm de diâmetro", "até 203 mm de diâmetro"],
          ["Ribbon", "até 300 m", "450 a 600 m"],
          ["Estrutura", "plástico reforçado", "metal"],
          ["Acessórios", "limitados", "rebobinador, destacador, cortador"],
          ["Custo inicial", "menor", "maior, com custo por etiqueta menor"],
        ],
      },
      { type: "h2", text: "203 dpi ou 300 dpi?" },
      {
        type: "ul",
        items: [
          "203 dpi: padrão para logística, expedição e códigos de barras lineares em etiquetas médias e grandes.",
          "300 dpi: necessário para etiquetas pequenas, textos com corpo reduzido, QR Code denso e GS1 DataMatrix.",
          "600 dpi: nichos como eletrônica e joalheria, onde a etiqueta tem poucos milímetros.",
        ],
      },
      { type: "h2", text: "Sinais de que sua desktop já não dá conta" },
      {
        type: "ol",
        items: [
          "Troca de rolo mais de três vezes por turno.",
          "Cabeça de impressão substituída em menos de 12 meses.",
          "Fila de impressão travando em picos de expedição.",
          "Necessidade de destacar ou rebobinar etiquetas manualmente.",
        ],
      },
      { type: "h2", text: "Custo total, não preço de etiqueta de vitrine" },
      {
        type: "p",
        text: "Some equipamento, cabeça de reposição, consumo de ribbon e horas paradas. Em operações acima de 3.000 etiquetas/dia, a industrial costuma se pagar em menos de um ano só pela metragem maior de ribbon e menos paradas.",
      },
    ],
    faq: [
      {
        q: "Uma desktop aguenta uso contínuo?",
        a: "Aguenta picos, mas não regime contínuo de turno inteiro. O ciclo de trabalho recomendado pelos fabricantes é bem menor que o de uma industrial.",
      },
      {
        q: "Preciso de 300 dpi para código de barras?",
        a: "Para EAN-13 e Code 128 em etiquetas normais, 203 dpi resolve. Para GS1 DataMatrix pequeno ou textos com menos de 6 pt, use 300 dpi.",
      },
    ],
    related: ["tabela-compatibilidade-ribbon-impressora", "resolver-problemas-impressao-etiquetas"],
  },
  {
    slug: "etiqueta-couche-bopp-ou-termica-direta",
    title: "Etiqueta couché, BOPP ou térmica direta: qual usar em cada aplicação",
    seoTitle: "Etiqueta couché, BOPP ou térmica direta: comparativo | Adeconex",
    description:
      "Comparativo entre etiqueta de papel couché, BOPP sintético e papel térmico direto: durabilidade, custo, resistência e aplicações típicas.",
    category: "Etiquetas",
    date: "2026-07-30",
    readingMinutes: 6,
    excerpt:
      "Três materiais cobrem quase toda a demanda de identificação. Saber onde cada um falha evita retrabalho e reclamação de cliente.",
    keywords: [
      "etiqueta couché",
      "etiqueta bopp",
      "etiqueta térmica direta",
      "qual etiqueta usar",
    ],
    blocks: [
      {
        type: "p",
        text: "A escolha do substrato define durabilidade, custo e qual ribbon você vai precisar. Comece sempre pela pergunta: quanto tempo essa etiqueta precisa durar e a que ela vai ser exposta?",
      },
      { type: "h2", text: "Papel couché adesivo" },
      {
        type: "ul",
        items: [
          "Custo mais baixo por etiqueta.",
          "Excelente definição de impressão com ribbon cera.",
          "Não resiste a água, óleo ou atrito prolongado.",
          "Aplicações: expedição, e-commerce, estoque interno, precificação.",
        ],
      },
      { type: "h2", text: "BOPP sintético" },
      {
        type: "ul",
        items: [
          "Resistente a água, óleo e rasgo.",
          "Exige ribbon resina.",
          "Disponível em branco, transparente e prata fosco.",
          "Aplicações: cosméticos, alimentos refrigerados, químicos, produtos que enfrentam umidade.",
        ],
      },
      { type: "h2", text: "Papel térmico direto" },
      {
        type: "ul",
        items: [
          "Dispensa ribbon — a impressão vem da reação do papel ao calor.",
          "Escurece com sol, calor e atrito ao longo do tempo.",
          "Aplicações: etiquetas de envio de marketplace, balança, senhas, uso de curta duração.",
        ],
      },
      { type: "h2", text: "Comparativo" },
      {
        type: "table",
        head: ["Material", "Ribbon", "Durabilidade", "Custo relativo"],
        rows: [
          ["Couché", "Cera / cera-resina", "6 a 12 meses em ambiente seco", "$"],
          ["BOPP", "Resina", "Anos, resiste a umidade", "$$$"],
          ["Térmica direta", "Nenhum", "Semanas a poucos meses", "$$ (sem custo de ribbon)"],
        ],
      },
      {
        type: "quote",
        text: "Se a etiqueta vai ver água, sol ou fricção constante, o material precisa ser sintético — nenhum ajuste de impressora compensa o substrato errado.",
      },
    ],
    faq: [
      {
        q: "Etiqueta térmica direta serve para envio de marketplace?",
        a: "Sim, é o padrão para Mercado Livre, Shopee e correios, porque a etiqueta cumpre sua função em poucos dias de trânsito.",
      },
      {
        q: "BOPP transparente imprime bem?",
        a: "Imprime com ribbon resina. Para texto claro sobre embalagem escura, considere BOPP branco ou impressão em prata fosco.",
      },
    ],
    related: ["etiqueta-bopp-quando-vale-a-pena", "ribbon-cera-cera-resina-resina-qual-escolher"],
  },
  {
    slug: "etiqueta-bopp-quando-vale-a-pena",
    title: "Etiqueta BOPP: quando o sintético compensa o custo maior",
    seoTitle: "Etiqueta BOPP: quando vale a pena usar sintético | Adeconex",
    description:
      "Cenários em que a etiqueta BOPP se paga: umidade, geladeira, contato com óleo, produtos de banho e rotulagem premium.",
    category: "Etiquetas",
    date: "2026-07-28",
    readingMinutes: 5,
    excerpt:
      "BOPP custa mais por etiqueta e menos por reclamação. Veja os cenários em que a conta fecha com folga.",
    keywords: [
      "etiqueta bopp",
      "rótulo sintético",
      "etiqueta resistente a água",
      "rótulo para cosmético",
    ],
    blocks: [
      {
        type: "p",
        text: "BOPP é um filme de polipropileno biorientado. Ele não absorve água, não rasga com facilidade e mantém a impressão quando combinado com ribbon resina. O custo por etiqueta é maior que o papel — a questão é quando esse custo se converte em economia.",
      },
      { type: "h2", text: "Cenários em que o BOPP se paga" },
      {
        type: "ul",
        items: [
          "Produtos de banho e cosméticos: contato direto com água e mão molhada.",
          "Alimentos refrigerados e congelados: condensação destrói rótulo de papel.",
          "Químicos e lubrificantes: respingo de óleo apaga impressão em papel.",
          "Produtos com giro lento em prateleira: rótulo precisa continuar apresentável.",
          "Rotulagem premium: acabamento fosco ou transparente valoriza a embalagem.",
        ],
      },
      { type: "h2", text: "Variações mais usadas" },
      {
        type: "table",
        head: ["Versão", "Efeito visual", "Uso típico"],
        rows: [
          ["BOPP branco brilho", "Cor sólida, alto contraste", "Cosméticos, alimentos"],
          ["BOPP transparente", "Efeito 'no label look'", "Frascos e potes de vidro"],
          ["BOPP prata fosco", "Aspecto industrial", "Patrimônio, eletroeletrônicos"],
        ],
      },
      { type: "h2", text: "Cuidados na aplicação" },
      {
        type: "ol",
        items: [
          "Aplique sobre superfície limpa e seca — óleo residual impede a ancoragem do adesivo.",
          "Respeite o tempo de cura do adesivo (normalmente 24 h) antes de submeter à água.",
          "Use sempre ribbon resina; cera não adere ao filme.",
          "Em superfícies curvas de pequeno diâmetro, prefira adesivo de alta aderência.",
        ],
      },
    ],
    faq: [
      {
        q: "BOPP pode ir para o congelador?",
        a: "Sim, com adesivo indicado para baixa temperatura. Informe a faixa de temperatura de aplicação e de serviço ao solicitar orçamento.",
      },
      {
        q: "Dá para imprimir BOPP em impressora desktop?",
        a: "Dá, desde que ela suporte ribbon resina e você ajuste a temperatura para cima em relação ao papel.",
      },
    ],
    related: ["etiqueta-couche-bopp-ou-termica-direta", "ribbon-cera-cera-resina-resina-qual-escolher"],
  },
  {
    slug: "resolver-problemas-impressao-etiquetas",
    title: "Impressão falhada, borrada ou clara: diagnóstico em 10 causas",
    seoTitle: "Impressão de etiqueta falhada ou borrada: como resolver | Adeconex",
    description:
      "Guia de diagnóstico para impressão térmica com falhas, listras brancas, impressão clara, borrada ou desalinhada — com a correção de cada causa.",
    category: "Impressoras",
    date: "2026-07-26",
    readingMinutes: 8,
    excerpt:
      "Antes de chamar assistência, percorra estas dez causas. A maioria dos chamados se resolve na terceira.",
    keywords: [
      "impressão de etiqueta falhando",
      "listra branca na etiqueta",
      "etiqueta saindo clara",
      "calibrar impressora de etiquetas",
    ],
    blocks: [
      { type: "h2", text: "Listra branca vertical constante" },
      {
        type: "p",
        text: "Quase sempre é sujeira ou um ponto queimado na cabeça. Limpe com álcool isopropílico e caneta de limpeza. Se a listra permanecer após a limpeza, o elemento está queimado e a cabeça precisa ser substituída.",
      },
      { type: "h2", text: "Impressão clara ou apagada" },
      {
        type: "ul",
        items: [
          "Temperatura (darkness) baixa demais para o material.",
          "Ribbon incompatível com o substrato — cera em sintético, por exemplo.",
          "Pressão da cabeça desregulada ou desigual entre os lados.",
          "Velocidade alta demais para a temperatura configurada.",
        ],
      },
      { type: "h2", text: "Impressão borrada" },
      {
        type: "p",
        text: "Temperatura alta demais, velocidade excessiva ou ribbon frouxo. Reduza a temperatura em passos de 2 e verifique se o rolo de ribbon está bem tensionado.",
      },
      { type: "h2", text: "Ribbon enrugando" },
      {
        type: "ol",
        items: [
          "Verifique se o ribbon está centralizado no mandril.",
          "Confira a pressão nos dois lados da cabeça.",
          "Reduza a temperatura — calor excessivo amassa o filme.",
          "Confirme que a largura do ribbon é adequada à etiqueta.",
        ],
      },
      { type: "h2", text: "Etiqueta saindo desalinhada ou pulando" },
      {
        type: "p",
        text: "Faça a calibração de sensor (gap ou black mark) com o rolo instalado. Trocar de formato sem recalibrar é a causa mais comum de etiqueta em branco entre impressões.",
      },
      { type: "h2", text: "Código de barras não lê" },
      {
        type: "ul",
        items: [
          "Barras impressas na direção do movimento borram mais: gire o código 90°.",
          "Contraste insuficiente por temperatura baixa.",
          "Quiet zone (margem lateral do código) menor que o mínimo exigido.",
          "Resolução insuficiente: código denso em 203 dpi pede 300 dpi.",
        ],
      },
      { type: "h2", text: "Manutenção preventiva que evita 80% dos chamados" },
      {
        type: "ol",
        items: [
          "Limpar cabeça a cada troca de rolo.",
          "Limpar o rolete de tração semanalmente.",
          "Aspirar resíduo de papel do interior mensalmente.",
          "Recalibrar sempre que mudar de material ou formato.",
        ],
      },
    ],
    faq: [
      {
        q: "Posso limpar a cabeça com álcool comum?",
        a: "Use álcool isopropílico. O álcool comum contém água e aditivos que deixam resíduo sobre os elementos térmicos.",
      },
      {
        q: "Com que frequência a cabeça precisa ser trocada?",
        a: "Depende do uso e da limpeza. Com manutenção correta e temperatura ajustada, é comum passar de um milhão de centímetros lineares impressos.",
      },
    ],
    related: ["impressora-termica-desktop-ou-industrial", "como-economizar-ribbon"],
  },
  {
    slug: "calcular-quantas-etiquetas-tem-um-rolo",
    title: "Como calcular quantas etiquetas cabem em um rolo (e planejar a compra)",
    seoTitle: "Como calcular quantas etiquetas tem um rolo | Adeconex",
    description:
      "Fórmula prática para estimar a quantidade de etiquetas por rolo a partir do diâmetro externo, do mandril e da espessura do material.",
    category: "Economia",
    date: "2026-07-24",
    readingMinutes: 5,
    excerpt:
      "Planejar compra sem saber quantas etiquetas há no rolo gera ruptura ou estoque parado. A conta é simples.",
    keywords: [
      "quantas etiquetas tem um rolo",
      "calcular etiquetas por rolo",
      "diâmetro do rolo de etiqueta",
    ],
    blocks: [
      { type: "h2", text: "A fórmula" },
      {
        type: "p",
        text: "Comprimento total (mm) = π × (D² − d²) ÷ (4 × espessura), onde D é o diâmetro externo do rolo, d é o diâmetro do mandril e a espessura é a do conjunto etiqueta + liner.",
      },
      {
        type: "p",
        text: "Quantidade de etiquetas = comprimento total ÷ (altura da etiqueta + gap entre etiquetas).",
      },
      { type: "h2", text: "Exemplo prático" },
      {
        type: "ul",
        items: [
          "Diâmetro externo: 110 mm; mandril: 25,4 mm; espessura: 0,17 mm.",
          "Comprimento ≈ π × (12.100 − 645) ÷ (4 × 0,17) ≈ 52.900 mm ≈ 52,9 m.",
          "Etiqueta de 50 mm com gap de 3 mm: 52.900 ÷ 53 ≈ 998 etiquetas.",
        ],
      },
      { type: "h2", text: "Referências rápidas" },
      {
        type: "table",
        head: ["Formato (mm)", "Rolo 110 mm ext.", "Rolo 200 mm ext."],
        rows: [
          ["33 x 22 (2 colunas)", "~2.900 pares", "~10.000 pares"],
          ["50 x 30", "~1.600", "~5.700"],
          ["100 x 50", "~1.000", "~3.400"],
          ["100 x 150", "~350", "~1.150"],
        ],
      },
      {
        type: "p",
        text: "Os valores são estimativas: variação de gramatura, liner e gap muda o resultado em até 8%. Para compra recorrente, meça um rolo real da sua operação e use esse número como base.",
      },
      { type: "h2", text: "Planejamento de compra" },
      {
        type: "ol",
        items: [
          "Levante o consumo médio diário de etiquetas por formato.",
          "Multiplique por 30 e some 20% de margem de segurança.",
          "Divida pela quantidade por rolo para achar os rolos/mês.",
          "Compre em lote fechado quando o giro justificar — o custo por etiqueta cai.",
        ],
      },
    ],
    faq: [
      {
        q: "O gap entra na conta?",
        a: "Sim. Ele consome comprimento do rolo mesmo sem imprimir nada, e por isso precisa ser somado à altura da etiqueta.",
      },
      {
        q: "Etiqueta em duas colunas rende mais?",
        a: "Rende. Duas colunas dobram a quantidade por metro linear e reduzem também o consumo de ribbon por etiqueta.",
      },
    ],
    related: ["como-economizar-ribbon", "etiqueta-couche-bopp-ou-termica-direta"],
  },
  {
    slug: "etiqueta-para-mercado-livre-shopee",
    title: "Etiqueta para Mercado Livre e Shopee: formato, material e impressão",
    seoTitle: "Etiqueta para Mercado Livre e Shopee: guia prático | Adeconex",
    description:
      "Formato 100x150 mm, papel térmico direto, configuração de impressão e erros comuns ao imprimir etiquetas de envio de marketplace.",
    category: "Compatibilidade",
    date: "2026-07-22",
    readingMinutes: 6,
    excerpt:
      "Etiqueta de marketplace cortada, minúscula ou ilegível quase sempre vem de dois ajustes errados no momento da impressão.",
    keywords: [
      "etiqueta mercado livre",
      "etiqueta shopee",
      "etiqueta 100x150",
      "imprimir etiqueta de envio",
    ],
    blocks: [
      { type: "h2", text: "Formato padrão" },
      {
        type: "p",
        text: "Mercado Livre, Shopee, Amazon e Magalu trabalham com o padrão 100 x 150 mm em rolo. Esse formato acomoda o código de barras de rastreio com quiet zone adequada e ainda deixa espaço para os dados do destinatário.",
      },
      { type: "h2", text: "Material recomendado" },
      {
        type: "ul",
        items: [
          "Papel térmico direto: dispensa ribbon e é suficiente para o tempo de trânsito.",
          "Couché com ribbon cera: alternativa quando o pacote fica semanas em estoque.",
          "Evite térmico em cargas expostas ao sol — a etiqueta escurece por inteiro.",
        ],
      },
      { type: "h2", text: "Configuração de impressão que evita corte" },
      {
        type: "ol",
        items: [
          "No driver, defina o tamanho de papel exatamente como 100 x 150 mm.",
          "Desative 'ajustar à página' no leitor de PDF — use escala 100%.",
          "Calibre o sensor de gap com o rolo instalado.",
          "Imprima uma etiqueta de teste e confira a leitura do código com o app do celular.",
        ],
      },
      { type: "h2", text: "Erros mais comuns" },
      {
        type: "table",
        head: ["Sintoma", "Causa provável"],
        rows: [
          ["Etiqueta impressa pequena no centro", "Escala do PDF em 'ajustar à página'"],
          ["Metade da etiqueta cortada", "Tamanho de papel errado no driver"],
          ["Etiqueta em branco alternada", "Sensor de gap descalibrado"],
          ["Código não lê no coletor", "Impressão clara ou quiet zone insuficiente"],
        ],
      },
      {
        type: "p",
        text: "Para operações acima de 300 pedidos/dia, vale um rebobinador ou destacador: o ganho de tempo na expedição costuma superar o investimento em poucas semanas.",
      },
    ],
    faq: [
      {
        q: "Preciso de impressora específica para etiqueta de marketplace?",
        a: "Não. Qualquer impressora térmica com largura útil de 104 mm imprime o padrão 100x150 mm em papel térmico direto.",
      },
      {
        q: "Etiqueta térmica desbota?",
        a: "Sim, com calor, sol e atrito. Para trânsito de poucos dias não é problema; para armazenamento longo, use couché com ribbon.",
      },
    ],
    related: ["etiqueta-couche-bopp-ou-termica-direta", "resolver-problemas-impressao-etiquetas"],
  },
  {
    slug: "gs1-128-e-boas-praticas-de-codigo-de-barras",
    title: "GS1-128, EAN e DataMatrix: boas práticas para o código sempre ler",
    seoTitle: "GS1-128, EAN e DataMatrix: boas práticas de impressão | Adeconex",
    description:
      "Escolha da simbologia, quiet zone, resolução e contraste: as regras que garantem leitura em primeira tentativa em qualquer coletor.",
    category: "Etiquetas",
    date: "2026-07-20",
    readingMinutes: 7,
    excerpt:
      "Código de barras que falha na leitura trava recebimento e gera multa de rede. As regras que evitam isso cabem em uma página.",
    keywords: [
      "gs1-128",
      "código de barras ean 13",
      "gs1 datamatrix",
      "quiet zone código de barras",
    ],
    blocks: [
      { type: "h2", text: "Escolhendo a simbologia" },
      {
        type: "table",
        head: ["Simbologia", "Uso principal"],
        rows: [
          ["EAN-13 / EAN-8", "Produto de varejo com GTIN"],
          ["Code 128", "Uso interno, números de série, lotes"],
          ["GS1-128", "Logística com AIs: lote, validade, SSCC"],
          ["ITF-14", "Caixa de embarque impressa em papelão"],
          ["GS1 DataMatrix", "Rastreabilidade em área pequena"],
          ["QR Code", "Link, campanha, informação ao consumidor"],
        ],
      },
      { type: "h2", text: "Quiet zone: a margem que ninguém respeita" },
      {
        type: "ul",
        items: [
          "Códigos lineares exigem margem lateral de no mínimo 10× a largura do módulo estreito.",
          "EAN-13 pede 3,63 mm à esquerda e 2,31 mm à direita como referência.",
          "DataMatrix exige uma margem equivalente a um módulo em todos os lados.",
        ],
      },
      { type: "h2", text: "Resolução e tamanho do módulo" },
      {
        type: "p",
        text: "Em 203 dpi cada ponto tem cerca de 0,125 mm. Um módulo estreito precisa de pelo menos 2 pontos para leitura confiável. Códigos densos ou etiquetas pequenas exigem 300 dpi.",
      },
      { type: "h2", text: "Orientação da impressão" },
      {
        type: "p",
        text: "Barras paralelas ao sentido de avanço do papel (\"ladder\") sofrem menos com variação de velocidade e falham menos. Se seu código está falhando de forma intermitente, girá-lo 90° costuma resolver.",
      },
      { type: "h2", text: "Contraste e material" },
      {
        type: "ul",
        items: [
          "Preto sobre branco fosco é o ideal. Evite fundo colorido escuro.",
          "BOPP transparente com código de barras exige fundo branco impresso atrás.",
          "Verniz ou laminação brilhante pode gerar reflexo e derrubar a leitura.",
        ],
      },
      { type: "h2", text: "Valide antes de rodar o lote" },
      {
        type: "ol",
        items: [
          "Gere o código na nossa ferramenta gratuita e confira a estrutura dos AIs.",
          "Imprima 3 amostras em velocidades diferentes.",
          "Leia cada uma com o coletor da operação, não apenas com o celular.",
          "Só então libere a produção do lote completo.",
        ],
      },
    ],
    faq: [
      {
        q: "Qual a diferença entre Code 128 e GS1-128?",
        a: "GS1-128 é o Code 128 com regras GS1: identificadores de aplicação (AIs) que informam o significado de cada campo, como lote (10) e validade (17).",
      },
      {
        q: "Posso reduzir o tamanho do EAN-13 na etiqueta?",
        a: "Até 80% do tamanho nominal com leitura confiável. Abaixo disso, o risco de falha em coletores de varejo cresce muito.",
      },
    ],
    related: ["resolver-problemas-impressao-etiquetas", "impressora-termica-desktop-ou-industrial"],
  },
];

export const getPost = (slug: string) => blogPosts.find((p) => p.slug === slug);

export const sortedPosts = [...blogPosts].sort((a, b) => b.date.localeCompare(a.date));

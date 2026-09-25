import type { ORDER_STATUS_LABEL } from "@/lib/orders.functions";

type PdfOrderData = {
  order: Record<string, any>;
  items: Array<Record<string, any>>;
  addresses: Array<Record<string, any>>;
  history: Array<Record<string, any>>;
  payments: Array<Record<string, any>>;
  shipments: Array<Record<string, any>>;
  customer: Record<string, any> | null;
  company: Record<string, any> | null;
};

type StatusLabels = typeof ORDER_STATUS_LABEL;

const COMPANY = {
  name: "ADECONEX ETIQUETAS",
  address: "R. Silva Xavier, 46 - Cristóvão Colombo",
  city: "Vila Velha - ES, CEP 29106-460",
  phone: "(27) 3318-6565",
  whatsapp: "(27) 99273-3033",
  email: "vendas@adeconex.com.br",
  website: "www.adeconex.com.br",
};

const RED: [number, number, number] = [239, 51, 58];
const DARK: [number, number, number] = [35, 39, 47];
const MUTED: [number, number, number] = [102, 108, 118];
const LIGHT: [number, number, number] = [244, 245, 247];

const money = (value: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);

const dateTime = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "-";

const clean = (value: unknown, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível carregar a logomarca.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível preparar a logomarca."));
    reader.readAsDataURL(blob);
  });
}

export async function downloadOrderPdf(
  data: PdfOrderData,
  logoUrl: string,
  statusLabels: StatusLabels,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 16;
  const { order, items, addresses, history, payments, shipments, customer, company } = data;
  const shipping = addresses.find((address) => address.kind === "shipping");
  const payment = payments[0];
  const shipment = shipments[0];
  const status = statusLabels[order.status as keyof StatusLabels] ?? clean(order.status);
  let y = 14;
  let pageNumber = 1;

  const setText = (color: [number, number, number], size = 9, style: "normal" | "bold" = "normal") => {
    doc.setTextColor(...color);
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };

  const footer = () => {
    doc.setDrawColor(220, 222, 226);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
    setText(MUTED, 7);
    doc.text(`Pedido ${clean(order.order_number)} • ${COMPANY.website}`, margin, pageHeight - 6.5);
    doc.text(`Página ${pageNumber}`, pageWidth - margin, pageHeight - 6.5, { align: "right" });
  };

  const newPageIfNeeded = (height: number) => {
    if (y + height <= bottomLimit) return;
    footer();
    doc.addPage();
    pageNumber += 1;
    y = 15;
  };

  const sectionTitle = (title: string) => {
    newPageIfNeeded(12);
    doc.setFillColor(...DARK);
    doc.roundedRect(margin, y, contentWidth, 8, 1.2, 1.2, "F");
    setText([255, 255, 255], 9, "bold");
    doc.text(title.toUpperCase(), margin + 4, y + 5.3);
    y += 11;
  };

  const infoBlock = (title: string, lines: string[], x: number, width: number) => {
    const lineHeight = 4.5;
    const wrapped = lines.flatMap((line) => doc.splitTextToSize(line, width - 8) as string[]);
    const height = 10 + wrapped.length * lineHeight;
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(224, 226, 230);
    doc.roundedRect(x, y, width, height, 1.5, 1.5, "FD");
    setText(DARK, 8, "bold");
    doc.text(title.toUpperCase(), x + 4, y + 5.5);
    setText(DARK, 8);
    wrapped.forEach((line, index) => doc.text(line, x + 4, y + 10 + index * lineHeight));
    return height;
  };

  try {
    const logo = await imageUrlToDataUrl(logoUrl);
    doc.addImage(logo, "PNG", margin, y, 63, 15.6, undefined, "FAST");
  } catch {
    setText(RED, 22, "bold");
    doc.text("ADECONEX", margin, y + 11);
  }

  setText(DARK, 8, "bold");
  doc.text(COMPANY.name, pageWidth - margin, y + 2, { align: "right" });
  setText(MUTED, 7.5);
  [
    COMPANY.address,
    COMPANY.city,
    `Telefone ${COMPANY.phone} • WhatsApp ${COMPANY.whatsapp}`,
    `${COMPANY.email} • ${COMPANY.website}`,
  ].forEach((line, index) => doc.text(line, pageWidth - margin, y + 6 + index * 4, { align: "right" }));
  y += 24;
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  setText(DARK, 18, "bold");
  doc.text(`PEDIDO ${clean(order.order_number)}`, margin, y);
  doc.setFillColor(...RED);
  const statusWidth = Math.min(66, Math.max(26, doc.getTextWidth(status) + 10));
  doc.roundedRect(pageWidth - margin - statusWidth, y - 6, statusWidth, 8, 1.5, 1.5, "F");
  setText([255, 255, 255], 8, "bold");
  doc.text(status.toUpperCase(), pageWidth - margin - statusWidth / 2, y - 0.8, { align: "center" });
  y += 7;
  setText(MUTED, 8);
  doc.text(`Emitido em ${dateTime(new Date())} • Pedido criado em ${dateTime(order.created_at)}`, margin, y);
  y += 8;

  const gap = 5;
  const half = (contentWidth - gap) / 2;
  const customerLines = [
    company ? clean(company.trade_name ?? company.legal_name) : clean(customer?.full_name),
    company ? `Razão social: ${clean(company.legal_name)}` : `CPF: ${clean(customer?.cpf)}`,
    company ? `CNPJ: ${clean(company.cnpj)}` : `E-mail: ${clean(customer?.email)}`,
    company ? `Contato: ${clean(customer?.full_name)}` : `Telefone: ${clean(customer?.phone ?? customer?.whatsapp)}`,
    ...(company ? [`E-mail: ${clean(customer?.email)}`, `Telefone: ${clean(customer?.phone ?? customer?.whatsapp)}`] : []),
  ];
  const addressLines = shipping
    ? [
        `${clean(shipping.recipient_name)}${shipping.recipient_document ? ` • ${shipping.recipient_document}` : ""}`,
        `${clean(shipping.street)}, ${clean(shipping.number)}${shipping.complement ? ` - ${shipping.complement}` : ""}`,
        `${clean(shipping.district)} - ${clean(shipping.city)}/${clean(shipping.state)}`,
        `CEP ${clean(shipping.zip)} • ${clean(shipping.country, "Brasil")}`,
      ]
    : ["Endereço de entrega não informado."];
  const leftHeight = infoBlock("Cliente / faturamento", customerLines, margin, half);
  const rightHeight = infoBlock("Endereço de entrega", addressLines, margin + half + gap, half);
  y += Math.max(leftHeight, rightHeight) + 7;

  sectionTitle("Itens do pedido");
  const columns = [margin, margin + 96, margin + 122, margin + 151, pageWidth - margin];
  const drawTableHeader = () => {
    doc.setFillColor(232, 233, 236);
    doc.rect(margin, y, contentWidth, 8, "F");
    setText(DARK, 7.5, "bold");
    doc.text("PRODUTO", columns[0] + 3, y + 5.2);
    doc.text("SKU", columns[1] + 2, y + 5.2);
    doc.text("QTD.", columns[2] + 2, y + 5.2);
    doc.text("UNITÁRIO", columns[3] - 2, y + 5.2, { align: "right" });
    doc.text("TOTAL", columns[4] - 2, y + 5.2, { align: "right" });
    y += 8;
  };
  drawTableHeader();

  for (const item of items) {
    const product = `${clean(item.product_name)}${item.variant_label ? `\n${item.variant_label}` : ""}`;
    const productLines = doc.splitTextToSize(product, 90) as string[];
    const rowHeight = Math.max(10, productLines.length * 4 + 4);
    if (y + rowHeight > bottomLimit) {
      footer();
      doc.addPage();
      pageNumber += 1;
      y = 15;
      drawTableHeader();
    }
    setText(DARK, 8);
    productLines.forEach((line, index) => doc.text(line, columns[0] + 3, y + 5 + index * 4));
    setText(MUTED, 7.5);
    doc.text(clean(item.product_sku), columns[1] + 2, y + 5);
    setText(DARK, 8);
    doc.text(String(item.quantity ?? 0), columns[2] + 7, y + 5, { align: "center" });
    doc.text(money(item.unit_price), columns[3] - 2, y + 5, { align: "right" });
    doc.text(money(item.subtotal), columns[4] - 2, y + 5, { align: "right" });
    doc.setDrawColor(225, 227, 230);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    y += rowHeight;
  }

  newPageIfNeeded(34);
  y += 3;
  const totalsX = pageWidth - margin - 74;
  const totalRows: Array<[string, unknown, boolean]> = [
    ["Subtotal", order.subtotal, false],
    [`Frete${order.shipping_carrier ? ` (${order.shipping_carrier})` : ""}`, order.shipping_total, false],
    ["Desconto", -Number(order.discount_total || 0), false],
    ["Total", order.total, true],
  ];
  totalRows.forEach(([label, value, strong]) => {
    if (label === "Desconto" && Number(order.discount_total || 0) === 0) return;
    if (strong) {
      doc.setFillColor(...DARK);
      doc.roundedRect(totalsX, y - 1, 74, 9, 1.2, 1.2, "F");
      setText([255, 255, 255], 9, "bold");
    } else setText(DARK, 8);
    doc.text(label, totalsX + 4, y + 5);
    doc.text(money(value), pageWidth - margin - 4, y + 5, { align: "right" });
    y += strong ? 12 : 7;
  });

  sectionTitle("Pagamento e envio");
  const paymentLines = payment
    ? [
        `Forma: ${clean(payment.method ?? payment.provider)}`,
        `Status: ${clean(payment.status)}`,
        `Valor: ${money(payment.amount)}`,
        `ID da transação: ${clean(payment.external_id)}`,
        `Confirmação: ${dateTime(order.paid_at)}`,
      ]
    : ["Nenhum pagamento registrado."];
  const shipmentLines = shipment
    ? [
        `Transportadora: ${clean(shipment.carrier ?? order.shipping_carrier)}`,
        `Serviço: ${clean(shipment.service ?? order.shipping_service)}`,
        `Rastreio: ${clean(shipment.tracking_code)}`,
        `Postagem: ${dateTime(shipment.posted_at)}`,
      ]
    : [
        `Transportadora: ${clean(order.shipping_carrier)}`,
        `Serviço: ${clean(order.shipping_service)}`,
        "Envio ainda não registrado.",
      ];
  newPageIfNeeded(40);
  const payHeight = infoBlock("Pagamento", paymentLines, margin, half);
  const shipHeight = infoBlock("Envio", shipmentLines, margin + half + gap, half);
  y += Math.max(payHeight, shipHeight) + 7;

  if (history.length) {
    sectionTitle("Histórico do pedido");
    for (const entry of history) {
      newPageIfNeeded(8);
      setText(DARK, 8, "bold");
      const label = statusLabels[entry.to_status as keyof StatusLabels] ?? clean(entry.to_status);
      doc.text(label, margin + 3, y + 4);
      setText(MUTED, 7.5);
      doc.text(dateTime(entry.created_at), margin + 65, y + 4);
      if (entry.comment) {
        const comments = doc.splitTextToSize(clean(entry.comment), 96) as string[];
        comments.forEach((line, index) => doc.text(line, margin + 87, y + 4 + index * 3.6));
        y += Math.max(7, comments.length * 3.6 + 2);
      } else y += 7;
    }
  }

  footer();
  doc.setProperties({
    title: `Pedido ${clean(order.order_number)} - Adeconex`,
    subject: "Documento completo do pedido",
    author: COMPANY.name,
    creator: "Adeconex 2030",
  });
  doc.save(`pedido-${clean(order.order_number).replace(/[^a-zA-Z0-9-]/g, "-")}.pdf`);
}
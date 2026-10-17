import type { ShowcaseProduct } from "@/lib/catalog.functions";

const RED: [number, number, number] = [239, 51, 58];
const DARK: [number, number, number] = [35, 39, 47];
const MUTED: [number, number, number] = [102, 108, 118];
const money = (v: number | null) =>
  v === null ? "Sob consulta" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

async function toDataUrl(url: string): Promise<{ data: string; fmt: "PNG" | "JPEG" } | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    const s = Math.min(1, 300 / Math.max(img.naturalWidth, img.naturalHeight));
    c.width = Math.max(1, Math.round(img.naturalWidth * s));
    c.height = Math.max(1, Math.round(img.naturalHeight * s));
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return { data: c.toDataURL("image/jpeg", 0.8), fmt: "JPEG" };
  } catch {
    return null;
  }
}

/** Gera o PDF da lista do catálogo no navegador e devolve o Blob. */
export async function buildCatalogListPdf(opts: {
  products: ShowcaseProduct[];
  filters: string;
  listUrl: string;
  logoUrl: string;
  date?: Date;
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 14;
  const site = typeof window !== "undefined" ? window.location.origin : "https://adeconex.com.br";
  const header = async () => {
    const logo = await toDataUrl(opts.logoUrl);
    if (logo) doc.addImage(logo.data, logo.fmt, M, 10, 50, 12.4);
    doc.setFontSize(8).setTextColor(...MUTED);
    doc.text(["ADECONEX ETIQUETAS · R. Silva Xavier, 46 - Vila Velha/ES", "(27) 3318-6565 · WhatsApp (27) 99273-3033 · vendas@adeconex.com.br"], W - M, 13, { align: "right" });
    doc.setDrawColor(...RED).setLineWidth(0.8).line(M, 26, W - M, 26);
  };
  await header();
  doc.setFontSize(16).setTextColor(...DARK).setFont("helvetica", "bold").text("Minha lista do catálogo", M, 36);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED);
  doc.text(doc.splitTextToSize(`Filtros: ${opts.filters}`, W - 2 * M), M, 42);
  doc.text(`${opts.products.length} produtos · ${(opts.date ?? new Date()).toLocaleDateString("pt-BR")} · Preços sujeitos a alteração`, M, 52);
  doc.setTextColor(...RED).textWithLink("Ver lista online com preços atualizados", M, 57, { url: opts.listUrl });

  let y = 64;
  const rowH = 26;
  for (const p of opts.products) {
    if (y + rowH > 280) {
      doc.addPage();
      await header();
      y = 32;
    }
    const img = p.image_url ? await toDataUrl(p.image_url) : null;
    doc.setDrawColor(225).setLineWidth(0.2).rect(M, y, 22, 22);
    if (img) doc.addImage(img.data, img.fmt, M + 1, y + 1, 20, 20);
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...DARK);
    doc.text(doc.splitTextToSize(p.name, 120).slice(0, 2), M + 26, y + 5);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
    if (p.short_description) doc.text(doc.splitTextToSize(p.short_description, 120).slice(0, 2), M + 26, y + 14);
    const hasPromo = p.promotional_price !== null && p.promotional_price > 0 && p.price !== null && p.promotional_price < p.price;
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...RED);
    doc.text(money(hasPromo ? p.promotional_price : p.price), W - M, y + 6, { align: "right" });
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.textWithLink("Ver produto", W - M - 16, y + 13, { url: `${site}/produto/${p.slug}` });
    y += rowH;
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8).setTextColor(...MUTED);
    doc.text(`Orçamentos: WhatsApp (27) 99273-3033 · vendas@adeconex.com.br · adeconex.com.br   —   ${i}/${pages}`, W / 2, 290, { align: "center" });
  }
  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

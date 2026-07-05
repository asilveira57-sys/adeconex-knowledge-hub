import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Phase 4 — AI enrichment & media migration.
 * All fns are staff-guarded and use the service-role admin client for storage
 * writes + bypassing RLS during bulk operations.
 */

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const BUCKET = "catalog-media";

function extFromContentType(ct: string | null, url: string): string {
  const fromUrl = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (fromUrl && ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(fromUrl)) return fromUrl;
  if (!ct) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("avif")) return "avif";
  return "jpg";
}

// ============ MEDIA MIGRATION ============

export const migrateProductImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ productId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: images, error } = await supabaseAdmin
      .from("product_images")
      .select("id, source_url, storage_path, position")
      .eq("product_id", data.productId)
      .order("position");
    if (error) throw new Error(error.message);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const img of images ?? []) {
      if (img.storage_path) {
        skipped++;
        continue;
      }
      if (!img.source_url) {
        skipped++;
        continue;
      }
      try {
        const resp = await fetch(img.source_url, { redirect: "follow" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const ct = resp.headers.get("content-type");
        const ext = extFromContentType(ct, img.source_url);
        const bytes = new Uint8Array(await resp.arrayBuffer());
        const path = `products/${data.productId}/${img.id}.${ext}`;
        const { error: upErr } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(path, bytes, { contentType: ct ?? "image/jpeg", upsert: true });
        if (upErr) throw upErr;
        const { error: updErr } = await supabaseAdmin
          .from("product_images")
          .update({ storage_path: path })
          .eq("id", img.id);
        if (updErr) throw updErr;
        migrated++;
      } catch (e) {
        failed++;
        errors.push(`${img.id}: ${(e as Error).message}`);
      }
    }

    // Clear missing_image flag if we now have at least one image with storage_path
    if (migrated > 0) {
      const { data: hasAny } = await supabaseAdmin
        .from("product_images")
        .select("id")
        .eq("product_id", data.productId)
        .not("storage_path", "is", null)
        .limit(1);
      if (hasAny && hasAny.length > 0) {
        const { data: prod } = await supabaseAdmin
          .from("products")
          .select("quality_flags")
          .eq("id", data.productId)
          .maybeSingle();
        const flags: Record<string, boolean> = { ...((prod?.quality_flags as Record<string, boolean> | null) ?? {}) };
        delete flags.missing_image;
        await supabaseAdmin.from("products").update({ quality_flags: flags as never }).eq("id", data.productId);
      }
    }

    return { migrated, skipped, failed, errors: errors.slice(0, 10) };
  });

export const bulkMigrateImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ limit: z.number().int().min(1).max(50).default(10) }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find products that still have unmigrated images
    const { data: rows, error } = await supabaseAdmin
      .from("product_images")
      .select("product_id")
      .is("storage_path", null)
      .not("source_url", "is", null)
      .limit(data.limit * 20);
    if (error) throw new Error(error.message);
    const productIds = Array.from(new Set((rows ?? []).map((r) => r.product_id))).slice(0, data.limit);

    let totalMigrated = 0;
    let totalFailed = 0;
    const perProduct: { productId: string; migrated: number; failed: number }[] = [];

    for (const pid of productIds) {
      const { data: images } = await supabaseAdmin
        .from("product_images")
        .select("id, source_url, storage_path")
        .eq("product_id", pid);
      let m = 0;
      let f = 0;
      for (const img of images ?? []) {
        if (img.storage_path || !img.source_url) continue;
        try {
          const resp = await fetch(img.source_url, { redirect: "follow" });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const ct = resp.headers.get("content-type");
          const ext = extFromContentType(ct, img.source_url);
          const bytes = new Uint8Array(await resp.arrayBuffer());
          const path = `products/${pid}/${img.id}.${ext}`;
          const { error: upErr } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(path, bytes, { contentType: ct ?? "image/jpeg", upsert: true });
          if (upErr) throw upErr;
          await supabaseAdmin.from("product_images").update({ storage_path: path }).eq("id", img.id);
          m++;
        } catch {
          f++;
        }
      }
      if (m > 0) {
        const { data: prod } = await supabaseAdmin
          .from("products")
          .select("quality_flags")
          .eq("id", pid)
          .maybeSingle();
        const flags: Record<string, boolean> = { ...((prod?.quality_flags as Record<string, boolean> | null) ?? {}) };
        delete flags.missing_image;
        await supabaseAdmin.from("products").update({ quality_flags: flags as never }).eq("id", pid);
      }
      totalMigrated += m;
      totalFailed += f;
      perProduct.push({ productId: pid, migrated: m, failed: f });
    }

    return { productsProcessed: productIds.length, totalMigrated, totalFailed, perProduct };
  });

export const getSignedImageUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ path: z.string().min(1) }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(data.path, 60 * 30);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

// ============ AI ENRICHMENT ============

const ENRICHMENT_SCHEMA = {
  name: "enrich_product",
  description: "Gera conteúdo comercial, técnico e SEO para um produto do catálogo Adeconex.",
  parameters: {
    type: "object",
    properties: {
      seo_title: { type: "string", description: "Título SEO (50-60 caracteres)" },
      seo_description: { type: "string", description: "Meta description persuasiva (140-160 caracteres)" },
      seo_keywords: { type: "string", description: "5-10 palavras-chave separadas por vírgula" },
      short_description: { type: "string", description: "Resumo comercial de 1-2 frases (até 200 chars)" },
      commercial_description: {
        type: "string",
        description: "Descrição comercial detalhada em HTML (parágrafos <p>, listas <ul>/<li>). 3-5 parágrafos, tom técnico-consultivo B2B.",
      },
      applications: {
        type: "array",
        items: { type: "string" },
        description: "3-6 aplicações práticas do produto",
      },
      faqs: {
        type: "array",
        description: "3 a 5 perguntas frequentes técnicas relevantes",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
          },
          required: ["question", "answer"],
        },
      },
    },
    required: ["seo_title", "seo_description", "short_description", "commercial_description", "faqs"],
  },
};

async function callLovableAI(payload: {
  system: string;
  user: string;
  tool: typeof ENRICHMENT_SCHEMA;
}) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: payload.system },
        { role: "user", content: payload.user },
      ],
      tools: [{ type: "function", function: payload.tool }],
      tool_choice: { type: "function", function: { name: payload.tool.name } },
    }),
  });

  if (resp.status === 429) throw new Error("Rate limit atingido. Aguarde alguns segundos.");
  if (resp.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
  if (!resp.ok) throw new Error(`AI Gateway HTTP ${resp.status}: ${await resp.text()}`);

  const json = await resp.json();
  const call = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("Resposta da IA sem tool_call");
  return JSON.parse(call.function.arguments);
}

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
}

export const enrichProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ productId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: p, error } = await supabaseAdmin
      .from("products")
      .select("id, name, sku, model, reference, price, technical_description, raw_html, short_description, categories:product_categories(category:categories(name))")
      .eq("id", data.productId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) throw new Error("Produto não encontrado");

    const cats = ((p as any).categories ?? [])
      .map((r: any) => r.category?.name)
      .filter(Boolean)
      .join(", ");
    const source = stripHtml(p.technical_description) || stripHtml(p.raw_html) || p.short_description || "";

    const result = await callLovableAI({
      system:
        "Você é redator técnico da Adeconex, especialista em impressão térmica, etiquetas, ribbons, lacres e automação comercial B2B. Produza conteúdo em português do Brasil, direto, com terminologia técnica correta. Nunca invente especificações numéricas que não estejam no material fornecido.",
      user: `Produto: ${p.name}
SKU: ${p.sku ?? "—"} | Modelo: ${p.model ?? "—"} | Ref: ${p.reference ?? "—"}
Categorias: ${cats || "—"}
Preço: ${p.price ?? "—"}

Descrição de origem (pode conter ruído):
${source || "(sem descrição fornecida — gere conteúdo genérico coerente com o nome/categoria)"}

Gere conteúdo comercial, técnico e SEO para este produto.`,
      tool: ENRICHMENT_SCHEMA,
    });

    // Persist
    const patch: Record<string, unknown> = {
      seo_title: result.seo_title?.slice(0, 200),
      seo_description: result.seo_description?.slice(0, 300),
      seo_keywords: result.seo_keywords ?? null,
      short_description: result.short_description?.slice(0, 500),
      commercial_description: result.commercial_description,
      status: "enriched",
    };
    const { error: updErr } = await supabaseAdmin.from("products").update(patch).eq("id", p.id);
    if (updErr) throw new Error(updErr.message);

    // Replace AI FAQs
    await supabaseAdmin.from("product_faqs").delete().eq("product_id", p.id).eq("is_ai_generated", true);
    const faqs = Array.isArray(result.faqs) ? result.faqs : [];
    if (faqs.length > 0) {
      await supabaseAdmin.from("product_faqs").insert(
        faqs.slice(0, 5).map((f: { question: string; answer: string }, i: number) => ({
          product_id: p.id,
          question: f.question,
          answer: f.answer,
          position: i,
          is_ai_generated: true,
          is_reviewed: false,
        })),
      );
    }

    return { ok: true, faqs: faqs.length };
  });

export const bulkEnrichProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z.object({
      limit: z.number().int().min(1).max(20).default(5),
      status: z.enum(["imported", "needs_review"]).default("imported"),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prods, error } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("status", data.status)
      .order("updated_at", { ascending: true })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    let ok = 0;
    let fail = 0;
    const errors: string[] = [];

    for (const p of prods ?? []) {
      try {
        await enrichProduct({ data: { productId: p.id } });
        ok++;
      } catch (e) {
        fail++;
        errors.push(`${p.id}: ${(e as Error).message}`);
        if ((e as Error).message.includes("Rate limit") || (e as Error).message.includes("Créditos")) break;
      }
    }
    return { processed: (prods ?? []).length, ok, fail, errors: errors.slice(0, 5) };
  });

export const getEnrichmentQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { count: pendingImages },
      { count: productsWithUnmigrated },
      { count: pendingEnrichment },
      { count: enriched },
      { count: totalFaqs },
    ] = await Promise.all([
      supabaseAdmin.from("product_images").select("*", { count: "exact", head: true }).is("storage_path", null).not("source_url", "is", null),
      supabaseAdmin.from("product_images").select("product_id", { count: "exact", head: true }).is("storage_path", null).not("source_url", "is", null),
      supabaseAdmin.from("products").select("*", { count: "exact", head: true }).eq("status", "imported"),
      supabaseAdmin.from("products").select("*", { count: "exact", head: true }).eq("status", "enriched"),
      supabaseAdmin.from("product_faqs").select("*", { count: "exact", head: true }).eq("is_ai_generated", true),
    ]);

    return {
      pendingImages: pendingImages ?? 0,
      productsWithUnmigrated: productsWithUnmigrated ?? 0,
      pendingEnrichment: pendingEnrichment ?? 0,
      enriched: enriched ?? 0,
      totalFaqs: totalFaqs ?? 0,
    };
  });

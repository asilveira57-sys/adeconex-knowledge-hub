import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listProducts, updateProductStatus, bulkUpdateStatus } from "@/lib/admin.functions";
import { productPreviewOptions } from "@/lib/admin.queries";
import { publicMediaUrl } from "@/lib/enrichment.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, CheckCircle2, ExternalLink, ImageOff, SquareArrowOutUpRight } from "lucide-react";


type Status = "all" | "imported" | "needs_review" | "enriched" | "published" | "hidden" | "discontinued";
type Quality = "all" | "missing_image" | "missing_price" | "thin_content";

const listOptions = (input: { search: string; status: Status; quality: Quality; page: number; pageSize: number }) =>
  queryOptions({
    queryKey: ["admin", "products", input],
    queryFn: () => listProducts({
      data: {
        search: input.search || undefined,
        status: input.status,
        quality: input.quality,
        page: input.page,
        pageSize: input.pageSize,
      },
    }),
    staleTime: 30_000,
    placeholderData: (prev) => prev, // mantém a página anterior visível ao paginar/filtrar
  });

export const Route = createFileRoute("/_authenticated/admin/produtos/")({
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(
      listOptions({ search: "", status: "all", quality: "all", page: 1, pageSize: 25 }),
    ),
  component: ProductsAdmin,
});

const STATUS_LABEL: Record<string, { label: string; tone: "default" | "success" | "warning" | "muted" }> = {
  imported: { label: "Importado", tone: "muted" },
  needs_review: { label: "Revisar", tone: "warning" },
  enriched: { label: "Enriquecido", tone: "default" },
  published: { label: "Publicado", tone: "success" },
  hidden: { label: "Oculto", tone: "muted" },
  discontinued: { label: "Descontinuado", tone: "muted" },
};

function ProductsAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [quality, setQuality] = useState<Quality>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Debounce search
  useState(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  });

  const { data } = useSuspenseQuery(listOptions({ search: debouncedSearch, status, quality, page, pageSize }));
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === data.rows.length) setSelected(new Set());
    else setSelected(new Set(data.rows.map((r) => r.id)));
  };

  const changeStatus = async (id: string, newStatus: "published" | "hidden" | "needs_review") => {
    await updateProductStatus({ data: { productId: id, status: newStatus } });
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const bulkPublish = async (newStatus: "published" | "hidden" | "needs_review") => {
    if (selected.size === 0) return;
    await bulkUpdateStatus({ data: { productIds: Array.from(selected), status: newStatus } });
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-xs">Catálogo</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.total.toLocaleString("pt-BR")} produtos encontrados</p>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selected.size} selecionados</span>
            <Button size="sm" onClick={() => bulkPublish("published")}><CheckCircle2 className="h-4 w-4" />Publicar</Button>
            <Button size="sm" variant="outline" onClick={() => bulkPublish("hidden")}><EyeOff className="h-4 w-4" />Ocultar</Button>
            <Button size="sm" variant="outline" onClick={() => bulkPublish("needs_review")}>Marcar p/ revisão</Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Buscar por nome…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setDebouncedSearch(e.target.value); setPage(1); }}
              className="max-w-xs"
            />
            <Select value={status} onValueChange={(v) => { setStatus(v as Status); setPage(1); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="imported">Importado</SelectItem>
                <SelectItem value="needs_review">Aguardando revisão</SelectItem>
                <SelectItem value="enriched">Enriquecido</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
                <SelectItem value="hidden">Oculto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={quality} onValueChange={(v) => { setQuality(v as Quality); setPage(1); }}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Qualidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer qualidade</SelectItem>
                <SelectItem value="missing_image">Sem imagem</SelectItem>
                <SelectItem value="missing_price">Sem preço</SelectItem>
                <SelectItem value="thin_content">Conteúdo raso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox checked={selected.size > 0 && selected.size === data.rows.length} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="w-16">Img</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-24">Preço</TableHead>
                <TableHead className="w-20">Estoque</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32">Qualidade</TableHead>
                <TableHead className="w-48">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado com os filtros atuais.</TableCell></TableRow>
              )}
              {data.rows.map((row) => {
                const mainRec = row.product_images?.find((i) => i.is_main) ?? row.product_images?.[0];
                const mainImg = publicMediaUrl(mainRec?.storage_path) ?? mainRec?.source_url ?? null;
                const st = STATUS_LABEL[row.status] ?? { label: row.status, tone: "muted" as const };
                const flags = (row.quality_flags ?? {}) as Record<string, boolean>;

                return (
                  <TableRow key={row.id} onMouseEnter={() => qc.prefetchQuery(productPreviewOptions(row.id))}>
                    <TableCell><Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} /></TableCell>
                    <TableCell>
                      {mainImg ? (
                        <img src={mainImg} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted"><ImageOff className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link to="/admin/produtos/$id" params={{ id: row.id }} className="font-medium hover:underline">
                        {row.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{row.slug}</div>
                    </TableCell>

                    <TableCell className="tabular-nums">
                      {row.price
                        ? Number(row.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">{row.stock_quantity ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={st.tone === "success" ? "default" : st.tone === "warning" ? "destructive" : "secondary"}>{st.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {flags.missing_image && <Badge variant="outline" className="text-xs">sem img</Badge>}
                        {flags.missing_price && <Badge variant="outline" className="text-xs">sem preço</Badge>}
                        {flags.thin_content && <Badge variant="outline" className="text-xs">raso</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link
                          to="/admin/produtos/$id"
                          params={{ id: row.id }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                          title="Ver preview"
                        >
                          <SquareArrowOutUpRight className="h-4 w-4" />
                        </Link>

                        {row.status !== "published" && (
                          <Button size="sm" variant="ghost" title="Publicar" onClick={() => changeStatus(row.id, "published")}><Eye className="h-4 w-4" /></Button>
                        )}
                        {row.status === "published" && (
                          <Button size="sm" variant="ghost" title="Ocultar" onClick={() => changeStatus(row.id, "hidden")}><EyeOff className="h-4 w-4" /></Button>
                        )}
                        {row.old_url && (
                          <a href={row.old_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent" title="URL original">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
        </div>
      </div>
    </div>
  );
}

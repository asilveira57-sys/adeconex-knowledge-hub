import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listProducts,
  updateProductStatus,
  bulkUpdateStatus,
  deleteProduct,
  duplicateProduct,
} from "@/lib/admin.functions";
import { productPreviewOptions } from "@/lib/admin.queries";
import { publicMediaUrl } from "@/lib/enrichment.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  ExternalLink,
  ImageOff,
  SquareArrowOutUpRight,
  Pencil,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from "lucide-react";

type Status = "all" | "imported" | "needs_review" | "enriched" | "published" | "hidden" | "discontinued";
type Quality = "all" | "missing_image" | "missing_price" | "thin_content";
type KitFilter = "all" | "with" | "without";
type ShippingFilter = "all" | "with" | "without" | "no_weight";
type CustomFilter = "all" | "with" | "without";
type SortField = "updated_at" | "name" | "price" | "stock_quantity" | "weight_kg";
type SortDir = "asc" | "desc";

type ListInput = {
  search: string;
  status: Status;
  quality: Quality;
  kit: KitFilter;
  shipping: ShippingFilter;
  custom: CustomFilter;
  sort: SortField;
  dir: SortDir;
  page: number;
  pageSize: number;
};

const listOptions = (input: ListInput) =>
  queryOptions({
    queryKey: ["admin", "products", input],
    queryFn: () =>
      listProducts({
        data: {
          search: input.search || undefined,
          status: input.status,
          quality: input.quality,
          kit: input.kit,
          shipping: input.shipping,
          custom: input.custom,
          sort: input.sort,
          dir: input.dir,
          page: input.page,
          pageSize: input.pageSize,
        },
      }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

const DEFAULT_INPUT: ListInput = {
  search: "",
  status: "all",
  quality: "all",
  kit: "all",
  shipping: "all",
  custom: "all",
  sort: "updated_at",
  dir: "desc",
  page: 1,
  pageSize: 25,
};

export const Route = createFileRoute("/_authenticated/admin/produtos/")({
  loader: ({ context }) => context.queryClient.prefetchQuery(listOptions(DEFAULT_INPUT)),
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

const br = (n: number | null | undefined) =>
  n == null ? "—" : Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

type Row = {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  status: string;
  stock_quantity: number | null;
  old_url: string | null;
  quality_flags: unknown;
  sells_by_kit?: boolean | null;
  weight_kg?: number | null;
  width_mm?: number | null;
  height_mm?: number | null;
  length_mm?: number | null;
  is_customizable?: boolean | null;
  custom_width_mm?: number | null;
  custom_height_mm?: number | null;
  product_images?: { source_url: string | null; storage_path: string | null; is_main: boolean }[];
};

function ProductsAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [quality, setQuality] = useState<Quality>("all");
  const [kit, setKit] = useState<KitFilter>("all");
  const [shipping, setShipping] = useState<ShippingFilter>("all");
  const [custom, setCustom] = useState<CustomFilter>("all");
  const [sort, setSort] = useState<SortField>("updated_at");
  const [dir, setDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const { data } = useSuspenseQuery(
    listOptions({ search, status, quality, kit, shipping, custom, sort, dir, page, pageSize }),
  );
  const rows = data.rows as Row[];
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const changeSort = (field: SortField) => {
    if (sort === field) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(field);
      setDir(field === "name" ? "asc" : "desc");
    }
    setPage(1);
  };

  const SortHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => changeSort(field)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {sort !== field ? (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        ) : dir === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )}
      </button>
    </TableHead>
  );

  const changeStatus = async (id: string, newStatus: "published" | "hidden" | "needs_review" | "discontinued") => {
    await updateProductStatus({ data: { productId: id, status: newStatus } });
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const bulkPublish = async (newStatus: "published" | "hidden" | "needs_review") => {
    if (selected.size === 0) return;
    await bulkUpdateStatus({ data: { productIds: Array.from(selected), status: newStatus } });
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const doDuplicate = async (id: string) => {
    try {
      setBusy(true);
      await duplicateProduct({ data: { productId: id } });
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Produto duplicado como rascunho oculto");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao duplicar");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    try {
      setBusy(true);
      await deleteProduct({ data: { productId: toDelete.id } });
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Produto excluído");
      setToDelete(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    } finally {
      setBusy(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setQuality("all");
    setKit("all");
    setShipping("all");
    setCustom("all");
    setPage(1);
  };

  const activeFilters =
    (search ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (quality !== "all" ? 1 : 0) +
    (kit !== "all" ? 1 : 0) +
    (shipping !== "all" ? 1 : 0) +
    (custom !== "all" ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-xs">Catálogo</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.total.toLocaleString("pt-BR")} produtos encontrados
          </p>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selected.size} selecionados</span>
            <Button size="sm" onClick={() => bulkPublish("published")}>
              <CheckCircle2 className="h-4 w-4" />
              Publicar
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkPublish("hidden")}>
              <EyeOff className="h-4 w-4" />
              Ocultar
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkPublish("needs_review")}>
              Marcar p/ revisão
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Buscar por nome…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="max-w-xs"
            />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as Status);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="imported">Importado</SelectItem>
                <SelectItem value="needs_review">Aguardando revisão</SelectItem>
                <SelectItem value="enriched">Enriquecido</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
                <SelectItem value="hidden">Oculto</SelectItem>
                <SelectItem value="discontinued">Descontinuado</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={quality}
              onValueChange={(v) => {
                setQuality(v as Quality);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Qualidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer qualidade</SelectItem>
                <SelectItem value="missing_image">Sem imagem</SelectItem>
                <SelectItem value="missing_price">Sem preço</SelectItem>
                <SelectItem value="thin_content">Conteúdo raso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={kit}
              onValueChange={(v) => {
                setKit(v as KitFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Kit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kit: todos</SelectItem>
                <SelectItem value="with">Com kit</SelectItem>
                <SelectItem value="without">Sem kit</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={shipping}
              onValueChange={(v) => {
                setShipping(v as ShippingFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Medidas de envio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Medidas: todas</SelectItem>
                <SelectItem value="with">Com medidas e peso</SelectItem>
                <SelectItem value="without">Sem medidas completas</SelectItem>
                <SelectItem value="no_weight">Sem peso</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={custom}
              onValueChange={(v) => {
                setCustom(v as CustomFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Personalização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Personalização: todas</SelectItem>
                <SelectItem value="with">Permite personalizar</SelectItem>
                <SelectItem value="without">Não personalizável</SelectItem>
              </SelectContent>
            </Select>
            {activeFilters > 0 && (
              <Button size="sm" variant="ghost" onClick={resetFilters}>
                Limpar filtros ({activeFilters})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox checked={selected.size > 0 && selected.size === rows.length} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="w-16">Img</TableHead>
                <SortHeader field="name" label="Nome" />
                <SortHeader field="price" label="Preço" className="w-24" />
                <SortHeader field="stock_quantity" label="Estoque" className="w-24" />
                <TableHead className="w-48">Envio</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32">Qualidade</TableHead>
                <TableHead className="w-56">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum produto encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => {
                const mainRec = row.product_images?.find((i) => i.is_main) ?? row.product_images?.[0];
                const mainImg = publicMediaUrl(mainRec?.storage_path) ?? mainRec?.source_url ?? null;
                const st = STATUS_LABEL[row.status] ?? { label: row.status, tone: "muted" as const };
                const flags = (row.quality_flags ?? {}) as Record<string, boolean>;
                const hasDims = row.width_mm != null && row.height_mm != null && row.length_mm != null;
                const hasWeight = row.weight_kg != null;

                return (
                  <TableRow key={row.id} onMouseEnter={() => qc.prefetchQuery(productPreviewOptions(row.id))}>
                    <TableCell>
                      <Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} />
                    </TableCell>
                    <TableCell>
                      {mainImg ? (
                        <img src={mainImg} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link to="/admin/produtos/$id" params={{ id: row.id }} className="font-medium hover:underline">
                        {row.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{row.slug}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.sells_by_kit && (
                          <Badge variant="secondary" className="text-[10px]">
                            kit
                          </Badge>
                        )}
                        {row.is_customizable && (
                          <Badge variant="secondary" className="text-[10px]">
                            personalizável
                            {row.custom_width_mm && row.custom_height_mm
                              ? ` ${br(row.custom_width_mm)}×${br(row.custom_height_mm)} mm`
                              : " (sem medidas)"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="tabular-nums">
                      {row.price
                        ? Number(row.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">{row.stock_quantity ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {hasDims ? (
                        <div className="tabular-nums">
                          {br(row.width_mm)}×{br(row.height_mm)}×{br(row.length_mm)} mm
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          sem medidas
                        </Badge>
                      )}
                      <div className="mt-1">
                        {hasWeight ? (
                          <span className="tabular-nums text-muted-foreground">{br(row.weight_kg)} kg</span>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            sem peso
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={st.tone === "success" ? "default" : st.tone === "warning" ? "destructive" : "secondary"}
                      >
                        {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {flags.missing_image && (
                          <Badge variant="outline" className="text-xs">
                            sem img
                          </Badge>
                        )}
                        {flags.missing_price && (
                          <Badge variant="outline" className="text-xs">
                            sem preço
                          </Badge>
                        )}
                        {flags.thin_content && (
                          <Badge variant="outline" className="text-xs">
                            raso
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link
                          to="/admin/produtos/$id"
                          params={{ id: row.id }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                          title="Editar produto"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <Link
                          to="/produto/$slug"
                          params={{ slug: row.slug }}
                          target="_blank"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                          title="Ver na loja"
                        >
                          <SquareArrowOutUpRight className="h-4 w-4" />
                        </Link>

                        {row.status !== "published" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Publicar"
                            onClick={() => changeStatus(row.id, "published")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {row.status === "published" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Ocultar"
                            onClick={() => changeStatus(row.id, "hidden")}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Duplicar"
                          disabled={busy}
                          onClick={() => doDuplicate(row.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setToDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {row.old_url && (
                          <a
                            href={row.old_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                            title="URL original"
                          >
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
        <p className="text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Próxima
          </Button>
        </div>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.name}” será removido definitivamente, junto com imagens, variantes, kits e
              especificações. Produtos já vendidos não podem ser excluídos — use “Ocultar”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void doDelete();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

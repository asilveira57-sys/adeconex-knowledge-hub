import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { adminListLabelTypes, adminSaveLabelType } from "@/lib/label-catalog.functions";
import { sizeLabel, slugify } from "@/lib/labels/catalog-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/etiquetas/")({
  head: () => ({
    meta: [
      { title: "Etiqueta personalizada — Admin Adeconex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLabelTypesPage,
});

function AdminLabelTypesPage() {
  const listFn = useServerFn(adminListLabelTypes);
  const saveFn = useServerFn(adminSaveLabelType);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const types = useQuery({ queryKey: ["admin", "label-types"], queryFn: () => listFn() });

  const create = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          slug: slugify(name),
          name: name.trim(),
          sizes: [{ width_mm: 50, height_mm: 30, shape: "rect", corner_radius_mm: null }],
          blog_images: [],
          is_published: false,
          sort_order: types.data?.length ?? 0,
        },
      }),
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ["admin", "label-types"] });
      navigate({ to: "/admin/etiquetas/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Etiqueta personalizada</h1>
        <p className="text-sm text-muted-foreground">
          Tipos de etiqueta que o cliente pode personalizar: medidas sugeridas, artes prontas e o post de blog de cada um.
        </p>
      </div>

      <form
        className="flex flex-wrap gap-2 rounded-lg border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length >= 2) create.mutate();
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do novo tipo (ex.: Etiqueta para doces)"
          className="max-w-md"
        />
        <Button type="submit" disabled={create.isPending || name.trim().length < 2}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar tipo
        </Button>
      </form>

      {types.isPending ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : types.error ? (
        <p className="text-sm text-destructive">{(types.error as Error).message}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Tipo</th>
                <th className="p-3">Medidas</th>
                <th className="p-3">Artes prontas</th>
                <th className="p-3">Post</th>
                <th className="p-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {types.data.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="p-3">
                    <Link to="/admin/etiquetas/$id" params={{ id: t.id }} className="font-medium hover:underline">
                      {t.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">/etiquetas/personalizada/{t.slug}</p>
                  </td>
                  <td className="p-3 text-xs">
                    {t.sizes.map((s, i) => (
                      <div key={i}>{sizeLabel(s)}</div>
                    ))}
                  </td>
                  <td className="p-3">{t.template_count}</td>
                  <td className="p-3">
                    {t.blog_body ? <Badge variant="secondary">Escrito</Badge> : <Badge variant="outline">A escrever</Badge>}
                  </td>
                  <td className="p-3">
                    {t.is_published ? <Badge>Publicado</Badge> : <Badge variant="outline">Oculto</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

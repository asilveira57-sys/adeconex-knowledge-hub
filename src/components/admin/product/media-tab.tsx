import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Star, Trash2, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicMediaUrl } from "@/lib/enrichment.functions";
import {
  addProductImageByUrl,
  deleteProductImage,
  updateProductImage,
  upsertProductVideo,
  deleteProductVideo,
} from "@/lib/admin.product.functions";
import { Field, useInvalidateProduct } from "./fields";

type Img = {
  id: string;
  source_url: string | null;
  storage_path: string | null;
  is_main: boolean | null;
  position: number | null;
  alt_text: string | null;
};
type Video = { id: string; video_url: string; platform: string; title: string | null; position: number | null };

export function MediaTab({
  productId,
  images,
  videos,
}: {
  productId: string;
  images: Img[];
  videos: Video[];
}) {
  const updateImg = useServerFn(updateProductImage);
  const removeImg = useServerFn(deleteProductImage);
  const addImg = useServerFn(addProductImageByUrl);
  const upsertVid = useServerFn(upsertProductVideo);
  const removeVid = useServerFn(deleteProductVideo);
  const invalidate = useInvalidateProduct(productId);
  const [busy, setBusy] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [alts, setAlts] = useState<Record<string, string>>(
    Object.fromEntries(images.map((i) => [i.id, i.alt_text ?? ""])),
  );
  const [newVideo, setNewVideo] = useState({ url: "", title: "" });

  async function run(key: string, fn: () => Promise<unknown>, msg: string) {
    setBusy(key);
    try {
      await fn();
      await invalidate();
      toast.success(msg);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Imagens ({images.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {images.length === 0 && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ImageOff className="h-4 w-4" /> Nenhuma imagem cadastrada.
            </p>
          )}
          {images.map((img, idx) => {
            const url = publicMediaUrl(img.storage_path) ?? img.source_url;
            return (
              <div key={img.id} className="grid items-center gap-3 rounded-md border p-3 sm:grid-cols-[80px_1fr_auto]">
                <div className="h-20 w-20 overflow-hidden rounded border bg-muted">
                  {url ? <img src={url} alt="" className="h-full w-full object-contain" loading="lazy" /> : null}
                </div>
                <div className="space-y-2">
                  <Field
                    label="Texto alternativo (alt)"
                    value={alts[img.id] ?? ""}
                    onChange={(v) => setAlts((s) => ({ ...s, [img.id]: v }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy != null}
                      onClick={() =>
                        run(img.id, () => updateImg({ data: { id: img.id, productId, alt_text: alts[img.id] ?? null } }), "Imagem atualizada")
                      }
                    >
                      Salvar alt
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy != null || idx === 0}
                      onClick={() =>
                        run(img.id, () => updateImg({ data: { id: img.id, productId, position: Math.max(0, (img.position ?? idx) - 1) } }), "Ordem atualizada")
                      }
                    >
                      Subir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy != null}
                      onClick={() =>
                        run(img.id, () => updateImg({ data: { id: img.id, productId, position: (img.position ?? idx) + 1 } }), "Ordem atualizada")
                      }
                    >
                      Descer
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant={img.is_main ? "default" : "outline"}
                    disabled={busy != null || !!img.is_main}
                    onClick={() => run(img.id, () => updateImg({ data: { id: img.id, productId, is_main: true } }), "Imagem principal definida")}
                  >
                    <Star className="mr-1 h-3 w-3" /> {img.is_main ? "Principal" : "Tornar principal"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy != null}
                    onClick={() => {
                      if (confirm("Remover esta imagem?")) run(img.id, () => removeImg({ data: { id: img.id } }), "Imagem removida");
                    }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Remover
                  </Button>
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
            <div className="min-w-[260px] flex-1">
              <Field label="Adicionar imagem por URL" value={newUrl} onChange={setNewUrl} placeholder="https://..." />
            </div>
            <Button
              size="sm"
              disabled={busy != null || !newUrl.trim()}
              onClick={() =>
                run("new-img", async () => {
                  await addImg({ data: { productId, url: newUrl.trim() } });
                  setNewUrl("");
                }, "Imagem adicionada")
              }
            >
              {busy === "new-img" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Vídeos ({videos.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {videos.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{v.title ?? "Sem título"}</p>
                <p className="text-xs text-muted-foreground">{v.video_url}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={busy != null}
                onClick={() => run(v.id, () => removeVid({ data: { id: v.id } }), "Vídeo removido")}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
            <div className="min-w-[220px] flex-1">
              <Field label="URL do vídeo" value={newVideo.url} onChange={(v) => setNewVideo((s) => ({ ...s, url: v }))} />
            </div>
            <div className="min-w-[180px] flex-1">
              <Field label="Título" value={newVideo.title} onChange={(v) => setNewVideo((s) => ({ ...s, title: v }))} />
            </div>
            <Button
              size="sm"
              disabled={busy != null || !newVideo.url.trim()}
              onClick={() =>
                run("new-video", async () => {
                  const url = newVideo.url.trim();
                  const platform = url.includes("youtu") ? "youtube" : url.includes("vimeo") ? "vimeo" : url.endsWith(".mp4") ? "mp4" : "other";
                  await upsertVid({
                    data: { productId, video_url: url, platform: platform as any, title: newVideo.title.trim() || null, position: videos.length },
                  });
                  setNewVideo({ url: "", title: "" });
                }, "Vídeo adicionado")
              }
            >
              <Plus className="mr-1 h-3 w-3" /> Adicionar vídeo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

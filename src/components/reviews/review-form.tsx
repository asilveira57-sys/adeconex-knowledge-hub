import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, Video, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StarInput } from "./star-rating";
import { reviewMediaUrl } from "./media-url";
import {
  createReviewUpload,
  createReviewUploadByToken,
  getMyReview,
  submitReview,
  submitReviewByToken,
} from "@/lib/reviews.functions";
import {
  REVIEW_MAX_IMAGES,
  REVIEW_MAX_IMAGE_BYTES,
  REVIEW_MAX_VIDEO_BYTES,
  REVIEW_MAX_VIDEO_SECONDS,
  REVIEW_MIN_BODY,
  isValidRating,
} from "@/lib/reviews.shared";
import { trackEvent } from "@/lib/analytics";

type Media = { kind: "image" | "video"; path: string };

function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(file);
  });
}

export function ReviewForm({
  productId,
  productName,
  token,
  initialRating,
  onDone,
}: {
  productId: string;
  productName: string;
  token?: string;
  initialRating?: number;
  onDone?: (r: { verified: boolean }) => void;
}) {
  const fetchMine = useServerFn(getMyReview);
  const upAuth = useServerFn(createReviewUpload);
  const upToken = useServerFn(createReviewUploadByToken);
  const sendAuth = useServerFn(submitReview);
  const sendToken = useServerFn(submitReviewByToken);

  const [rating, setRating] = useState(initialRating && isValidRating(initialRating) ? initialRating : 0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [city, setCity] = useState("");
  const [media, setMedia] = useState<Media[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) return;
    fetchMine({ data: { productId } }).then((r) => {
      if (!r) return;
      setEditing(true);
      setRating((cur) => cur || r.rating);
      setTitle(r.title); setBody(r.body); setCity(r.city ?? ""); setMedia(r.media);
    }).catch(() => {});
  }, [productId, token, fetchMine]);

  const images = media.filter((m) => m.kind === "image").length;
  const videos = media.filter((m) => m.kind === "video").length;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
        if (!kind) { toast.error(`${file.name}: formato não suportado`); continue; }
        if (kind === "image" && (images + media.filter((m) => m.kind === "image").length >= REVIEW_MAX_IMAGES)) { toast.error("Máximo de 5 fotos"); continue; }
        if (kind === "video" && videos >= 1) { toast.error("Máximo de 1 vídeo"); continue; }
        if (kind === "image" && file.size > REVIEW_MAX_IMAGE_BYTES) { toast.error(`${file.name}: foto acima de 8 MB`); continue; }
        if (kind === "video") {
          if (file.size > REVIEW_MAX_VIDEO_BYTES) { toast.error("Vídeo acima de 50 MB"); continue; }
          const d = await videoDuration(file);
          if (d > REVIEW_MAX_VIDEO_SECONDS + 1) { toast.error("Vídeo com mais de 60 segundos"); continue; }
        }
        const ext = file.name.split(".").pop() ?? "";
        const signed = token
          ? await upToken({ data: { token, kind, ext } })
          : await upAuth({ data: { kind, ext } });
        const { error } = await supabase.storage.from("review-media").uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
        if (error) { toast.error(`Falha ao enviar ${file.name}`); continue; }
        setMedia((m) => [...m, { kind, path: signed.path }]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no envio");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const canSend = isValidRating(rating) && body.trim().length >= REVIEW_MIN_BODY && accepted && !uploading && !saving;

  const submit = async () => {
    if (!canSend) return;
    setSaving(true);
    try {
      const payload = { productId, rating, title, body, city: city || null, media, accepted: true as const };
      const r = token ? await sendToken({ data: { ...payload, token } }) : await sendAuth({ data: payload });
      trackEvent("review_submitted", { product_id: productId, item_name: productName, rating, has_media: media.length > 0, source: token ? "email" : "product_page" });
      toast.success("Obrigado! Sua avaliação será publicada após uma rápida revisão.");
      onDone?.(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium">Sua nota para {productName}</p>
        <StarInput value={rating} onChange={setRating} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`rt-${productId}`} className="text-sm font-medium">Título (opcional)</label>
        <Input id={`rt-${productId}`} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Ótima aderência na caixa" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`rb-${productId}`} className="text-sm font-medium">Sua opinião</label>
        <Textarea id={`rb-${productId}`} value={body} maxLength={4000} rows={5} onChange={(e) => setBody(e.target.value)}
          placeholder="Conte como usou o produto, a impressora, a qualidade da impressão…" />
        <p className="text-xs text-muted-foreground">{body.trim().length < REVIEW_MIN_BODY ? `Mínimo de ${REVIEW_MIN_BODY} caracteres (${body.trim().length}/${REVIEW_MIN_BODY})` : `${body.length}/4000`}</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`rc-${productId}`} className="text-sm font-medium">Cidade/UF (opcional)</label>
        <Input id={`rc-${productId}`} value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} placeholder="Vila Velha/ES" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Fotos e vídeo (opcional)</p>
        <div className="flex flex-wrap gap-2">
          {media.map((m) => (
            <div key={m.path} className="relative h-20 w-20 overflow-hidden rounded-md border hairline bg-surface-2">
              {m.kind === "image"
                ? <img src={reviewMediaUrl(m.path)} alt="" className="h-full w-full object-cover" />
                : <video src={reviewMediaUrl(m.path)} className="h-full w-full object-cover" muted />}
              <button type="button" aria-label="Remover" onClick={() => setMedia((all) => all.filter((x) => x.path !== m.path))}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5"><X className="h-3 w-3" /></button>
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || (images >= REVIEW_MAX_IMAGES && videos >= 1)}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:border-foreground/40 disabled:opacity-50">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span className="flex gap-1"><ImagePlus className="h-4 w-4" /><Video className="h-4 w-4" /></span>Adicionar</>}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Até 5 fotos (8 MB cada) e 1 vídeo de até 60 s / 50 MB.</p>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
        <span className="text-muted-foreground">
          Declaro que a avaliação é verdadeira e sobre minha experiência. Ela será publicada com meu primeiro nome e inicial após revisão; conteúdo ofensivo, links ou dados pessoais não são publicados.
        </span>
      </label>
      <Button onClick={submit} disabled={!canSend} size="lg" className="w-full sm:w-auto">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {editing ? "Atualizar avaliação" : "Enviar avaliação"}
      </Button>
    </div>
  );
}

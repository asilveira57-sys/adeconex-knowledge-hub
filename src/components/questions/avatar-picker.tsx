import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createAvatarUpload, saveUploadedAvatar, setAvatarPreset } from "@/lib/questions.functions";
import { AVATAR_MAX_BYTES, AVATAR_PRESETS, AVATAR_STORAGE_PREFIX, isAvatarPreset, type PublicQuestion } from "@/lib/questions.shared";
import { PresetArt, UserAvatar } from "./user-avatar";
import { cn } from "@/lib/utils";

/** Reduz a foto para 512 px e converte em WEBP antes do envio. */
async function optimize(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao processar imagem"))), "image/webp", 0.85));
}

export function AvatarPicker({ profile }: { profile: { avatar_url?: string | null; avatar_preset?: string | null } | null }) {
  const qc = useQueryClient();
  const createUpload = useServerFn(createAvatarUpload);
  const saveUpload = useServerFn(saveUploadedAvatar);
  const setPreset = useServerFn(setAvatarPreset);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const current: PublicQuestion["avatar"] = profile?.avatar_url?.startsWith(AVATAR_STORAGE_PREFIX)
    ? { kind: "upload", path: profile.avatar_url.slice(AVATAR_STORAGE_PREFIX.length) }
    : isAvatarPreset(profile?.avatar_preset) ? { kind: "preset", key: profile.avatar_preset } : null;

  const done = (msg: string) => { toast.success(msg); qc.invalidateQueries({ queryKey: ["account", "me"] }); qc.invalidateQueries({ queryKey: ["questions", "me"] }); };
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } finally { setBusy(false); } };

  const onFile = (f: File | undefined) => f && run(async () => {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new Error("Use uma imagem JPG, PNG ou WEBP.");
    if (f.size > AVATAR_MAX_BYTES) throw new Error("A imagem deve ter até 5 MB.");
    const blob = await optimize(f);
    const { path, token } = await createUpload();
    const { error } = await supabase.storage.from("avatars").uploadToSignedUrl(path, token, blob, { contentType: "image/webp" });
    if (error) throw new Error("Falha no envio da imagem");
    await saveUpload({ data: { path } });
    done("Foto de perfil atualizada");
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imagem de perfil</CardTitle>
        <CardDescription>Envie uma foto ou escolha uma ilustração. Ela só aparece publicamente nas perguntas em que você autorizar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <UserAvatar avatar={current} size={72} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>{current?.kind === "upload" ? "Substituir foto" : "Enviar foto"}</Button>
            {current ? <Button type="button" variant="ghost" disabled={busy} onClick={() => run(async () => { await setPreset({ data: { key: null } }); done("Imagem removida"); })}>Remover</Button> : null}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Ou escolha um avatar ilustrado</p>
          <div className="flex flex-wrap gap-3">
            {AVATAR_PRESETS.map((p) => (
              <button key={p.key} type="button" disabled={busy} title={p.label} aria-label={p.label}
                onClick={() => run(async () => { await setPreset({ data: { key: p.key } }); done("Avatar atualizado"); })}
                className={cn("h-14 w-14 overflow-hidden rounded-full border-2 transition", current?.kind === "preset" && current.key === p.key ? "border-primary" : "border-transparent hover:border-muted-foreground/40")}>
                <PresetArt k={p.key} />
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

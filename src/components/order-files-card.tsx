import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, Download, FileText, Loader2, Trash2, Upload, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  FILE_STATUS_LABEL,
  deleteOrderFile,
  getOrderFileSignedUrl,
  listOrderFiles,
  registerOrderFile,
  reviewOrderFile,
} from "@/lib/order-files.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ACCEPTED = ".pdf,.ai,.eps,.svg,.png,.jpg,.jpeg,.tif,.tiff,.cdr,.psd,.zip";
const MAX_MB = 50;

function slugify(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "arquivo";
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : "";
  return base.slice(0, 60) + ext;
}

function statusTone(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "aprovado") return "default";
  if (s === "rejeitado") return "destructive";
  if (s === "correcao_solicitada") return "outline";
  if (s === "em_analise") return "secondary";
  return "outline";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "aprovado") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === "rejeitado") return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === "correcao_solicitada") return <AlertCircle className="h-4 w-4 text-amber-600" />;
  if (status === "em_analise") return <Clock className="h-4 w-4 text-blue-600" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

export function OrderFilesCard({ orderId, staff }: { orderId: string; staff: boolean }) {
  const qc = useQueryClient();
  const { user } = useSession();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["order-files", orderId],
    queryFn: () => listOrderFiles({ data: { orderId } }),
  });

  const files = data?.files ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["order-files", orderId] });

  const deleteMut = useMutation({
    mutationFn: (fileId: string) => deleteOrderFile({ data: { fileId } }),
    onSuccess: () => { toast.success("Arquivo removido"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover"),
  });

  const handlePick = () => inputRef.current?.click();

  const onFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (!user) {
      toast.error("Sessão expirada. Recarregue a página.");
      return;
    }
    setUploading(true);
    let ok = 0;
    let fail = 0;
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`${file.name}: excede ${MAX_MB}MB`);
        fail++;
        continue;
      }
      const path = `${user.id}/${orderId}/${crypto.randomUUID()}-${slugify(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from("order-files")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) {
        toast.error(`${file.name}: ${upErr.message}`);
        fail++;
        continue;
      }
      try {
        await registerOrderFile({
          data: {
            orderId,
            storagePath: path,
            originalName: file.name,
            mimeType: file.type || null,
            sizeBytes: file.size,
          },
        });
        ok++;
      } catch (e) {
        // rollback do storage
        await supabase.storage.from("order-files").remove([path]);
        toast.error(`${file.name}: ${e instanceof Error ? e.message : "falha ao registrar"}`);
        fail++;
      }
    }
    if (ok > 0) toast.success(`${ok} arquivo(s) enviado(s)`);
    if (inputRef.current) inputRef.current.value = "";
    setUploading(false);
    invalidate();
  };

  const download = async (fileId: string) => {
    try {
      const { url } = await getOrderFileSignedUrl({ data: { fileId } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar link");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" /> Arquivos do pedido
        </CardTitle>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            className="sr-only"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button size="sm" onClick={handlePick} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Enviar arquivo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Envie a arte final para produção. Formatos aceitos: PDF, AI, EPS, SVG, PNG, JPG, TIFF, CDR, PSD, ZIP. Máx {MAX_MB}MB por arquivo.
        </p>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum arquivo enviado ainda.</p>
        ) : (
          <ul className="divide-y">
            {files.map((f: any) => (
              <li key={f.id} className="py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={f.status} />
                      <p className="font-medium truncate text-sm">{f.original_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {f.size_bytes ? `${(f.size_bytes / 1024 / 1024).toFixed(2)} MB · ` : ""}
                      {new Date(f.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={statusTone(f.status)}>{FILE_STATUS_LABEL[f.status as keyof typeof FILE_STATUS_LABEL]}</Badge>
                  </div>
                </div>
                {f.reviewer_notes && (
                  <p className="text-xs rounded-md bg-muted p-2">
                    <span className="font-medium">Análise:</span> {f.reviewer_notes}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => download(f.id)}>
                    <Download className="h-4 w-4" /> Baixar
                  </Button>
                  {(staff || (f.uploaded_by === user?.id && f.status === "enviado")) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remover "${f.original_name}"?`)) deleteMut.mutate(f.id);
                      }}
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 className="h-4 w-4" /> Remover
                    </Button>
                  )}
                  {staff && <StaffReview fileId={f.id} current={f.status} notes={f.reviewer_notes ?? ""} onDone={invalidate} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StaffReview({ fileId, current, notes, onDone }: { fileId: string; current: string; notes: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(current === "enviado" ? "em_analise" : current);
  const [text, setText] = useState(notes);
  const mut = useMutation({
    mutationFn: () => reviewOrderFile({ data: { fileId, status: status as any, notes: text || null } }),
    onSuccess: () => { toast.success("Análise salva"); setOpen(false); onDone(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  if (!open) {
    return <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Analisar</Button>;
  }
  return (
    <div className="w-full grid gap-2 rounded-md border p-2">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="em_analise">Em análise</SelectItem>
          <SelectItem value="aprovado">Aprovado</SelectItem>
          <SelectItem value="correcao_solicitada">Solicitar correção</SelectItem>
          <SelectItem value="rejeitado">Rejeitado</SelectItem>
        </SelectContent>
      </Select>
      <Textarea rows={2} placeholder="Observações para o cliente" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

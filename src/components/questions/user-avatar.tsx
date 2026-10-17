import type { AvatarPresetKey, PublicQuestion } from "@/lib/questions.shared";
import { cn } from "@/lib/utils";

export function avatarUploadUrl(path: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/storage/v1/object/public/avatars/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Ilustrações próprias (SVG), livres para uso comercial. */
export function PresetArt({ k }: { k: AvatarPresetKey }) {
  switch (k) {
    case "gato":
      return (<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#fde2c8" /><path d="M16 22 L22 10 L28 20 M48 22 L42 10 L36 20" fill="#f59e0b" /><circle cx="32" cy="36" r="18" fill="#f59e0b" /><circle cx="25" cy="33" r="2.5" fill="#1f2937" /><circle cx="39" cy="33" r="2.5" fill="#1f2937" /><path d="M29 40 Q32 43 35 40" stroke="#1f2937" strokeWidth="2" fill="none" /><path d="M14 38 H22 M42 38 H50" stroke="#92400e" strokeWidth="1.5" /></svg>);
    case "cafe":
      return (<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#e7d8c9" /><rect x="16" y="26" width="26" height="22" rx="4" fill="#ffffff" /><path d="M42 30 h4 a5 5 0 0 1 0 10 h-4" stroke="#ffffff" strokeWidth="4" fill="none" /><rect x="16" y="26" width="26" height="6" fill="#7c4a2d" /><path d="M24 12 q3 4 0 8 M32 12 q3 4 0 8" stroke="#7c4a2d" strokeWidth="2" fill="none" /><rect x="12" y="48" width="36" height="4" rx="2" fill="#a47551" /></svg>);
    case "arco-iris":
      return (<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#e0f2fe" />{["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#3b82f6"].map((c, i) => <path key={c} d={`M${8 + i * 4} 46 a${24 - i * 4} ${24 - i * 4} 0 0 1 ${48 - i * 8} 0`} stroke={c} strokeWidth="4" fill="none" />)}<circle cx="12" cy="48" r="6" fill="#ffffff" /><circle cx="52" cy="48" r="6" fill="#ffffff" /></svg>);
    case "montanha":
      return (<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#bfdbfe" /><circle cx="48" cy="16" r="6" fill="#fde047" /><path d="M0 56 L22 22 L36 42 L44 32 L64 56 Z" fill="#475569" /><path d="M22 22 L28 31 L24 30 L19 27 Z" fill="#ffffff" /></svg>);
    case "planta":
      return (<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#dcfce7" /><path d="M32 44 V20" stroke="#15803d" strokeWidth="3" /><path d="M32 30 q-14 -2 -14 -14 q14 0 14 14 M32 26 q14 -2 14 -14 q-14 0 -14 14" fill="#22c55e" /><path d="M20 44 h24 l-4 14 h-16 z" fill="#c2410c" /></svg>);
    case "livro":
      return (<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#ede9fe" /><path d="M12 18 q10 -4 20 2 v30 q-10 -6 -20 -2 z" fill="#7c3aed" /><path d="M52 18 q-10 -4 -20 2 v30 q10 -6 20 -2 z" fill="#a78bfa" /><path d="M16 26 h10 M16 32 h10 M38 26 h10 M38 32 h10" stroke="#ffffff" strokeWidth="1.5" /></svg>);
    case "geometrico":
      return (<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#fef3c7" /><circle cx="22" cy="24" r="12" fill="#e63946" /><rect x="30" y="30" width="22" height="22" fill="#1d3557" /><path d="M10 54 L22 36 L34 54 Z" fill="#2a9d8f" /></svg>);
  }
}

function DefaultArt() {
  return (<svg viewBox="0 0 64 64"><rect width="64" height="64" className="fill-muted" /><circle cx="32" cy="26" r="11" className="fill-muted-foreground/40" /><path d="M12 58 a20 18 0 0 1 40 0 z" className="fill-muted-foreground/40" /></svg>);
}

export function UserAvatar({ avatar, size = 40, className }: { avatar: PublicQuestion["avatar"]; size?: number; className?: string }) {
  return (
    <span className={cn("inline-block shrink-0 overflow-hidden rounded-full border hairline bg-muted", className)} style={{ width: size, height: size }} aria-hidden="true">
      {avatar?.kind === "upload" ? (
        <img src={avatarUploadUrl(avatar.path)} alt="" width={size} height={size} loading="lazy" className="h-full w-full object-cover" />
      ) : avatar?.kind === "preset" ? <PresetArt k={avatar.key} /> : <DefaultArt />}
    </span>
  );
}

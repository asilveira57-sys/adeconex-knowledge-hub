import { useState } from "react";
import { Check, Facebook, Link2, MessageCircle, Share2, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

export function ShareButtons({ url, title, context = "product" }: { url: string; title: string; context?: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const track = (method: string) => trackEvent("share", { method, content_type: context, item_id: url });
  const links = [
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${t}%20${u}` },
    { key: "facebook", label: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: "x", label: "X", icon: Twitter, href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" className="sm:hidden" onClick={async () => {
        if (navigator.share) { try { await navigator.share({ title, url }); track("native"); } catch { /* cancelado */ } }
      }}>
        <Share2 className="mr-1.5 h-4 w-4" /> Compartilhar
      </Button>
      {links.map((l) => (
        <Button key={l.key} asChild variant="outline" size="sm">
          <a href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => track(l.key)} aria-label={`Compartilhar no ${l.label}`}>
            <l.icon className="h-4 w-4" /><span className="ml-1.5 hidden sm:inline">{l.label}</span>
          </a>
        </Button>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={async () => {
        await navigator.clipboard.writeText(url); setCopied(true); track("copy_link"); setTimeout(() => setCopied(false), 2000);
      }}>
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}<span className="ml-1.5">{copied ? "Copiado" : "Copiar link"}</span>
      </Button>
    </div>
  );
}

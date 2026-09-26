import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { myPermissionsQuery } from "@/hooks/use-permissions";
import { LayoutDashboard, PackageSearch, UploadCloud, Sparkles, LogOut, ShoppingBag, TicketPercent, Palette, Globe2, Users, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Adeconex 2030" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ context, location }) => {
    const perms = await context.queryClient.ensureQueryData(myPermissionsQuery);
    if (!perms.isStaff) throw redirect({ to: "/" });
    const seg = location.pathname.split("/")[2] ?? "dashboard";
    const key = seg === "" ? "dashboard" : seg;
    if (key === "colaboradores" && !perms.isAdmin) throw redirect({ to: "/admin" });
    if (key !== "colaboradores" && !perms.sections.includes(key)) {
      const first = perms.sections[0];
      if (!first || key === "dashboard") {
        if (first && first !== "dashboard") throw redirect({ to: `/admin/${first}` as never });
      } else {
        throw redirect({ to: (first === "dashboard" ? "/admin" : `/admin/${first}`) as never });
      }
    }
    return { perms };
  },
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", key: "dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/pedidos", key: "pedidos", label: "Pedidos", icon: ShoppingBag, exact: false },
  { to: "/admin/clientes", key: "clientes", label: "Clientes", icon: Users, exact: false },
  { to: "/admin/artes", key: "artes", label: "Artes", icon: Palette, exact: false },
  { to: "/admin/produtos", key: "produtos", label: "Produtos", icon: PackageSearch, exact: false },
  { to: "/admin/cupons", key: "cupons", label: "Cupons", icon: TicketPercent, exact: false },
  { to: "/admin/seo", key: "seo", label: "SEO & Tracking", icon: Globe2, exact: false },
  { to: "/admin/importacao", key: "importacao", label: "Importação", icon: UploadCloud, exact: false },
  { to: "/admin/enriquecimento", key: "enriquecimento", label: "Enriquecimento", icon: Sparkles, exact: false },
  { to: "/admin/colaboradores", key: "colaboradores", label: "Colaboradores", icon: UserCog, exact: false },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { data: perms } = useQuery(myPermissionsQuery);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  };

  const visible = navItems.filter((i) =>
    i.key === "colaboradores" ? perms?.isAdmin : perms?.sections.includes(i.key),
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-muted/20">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="border-b p-4">
          <p className="eyebrow text-xs">Adeconex 2030</p>
          <p className="mt-1 text-sm font-semibold">Painel administrativo</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {visible.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

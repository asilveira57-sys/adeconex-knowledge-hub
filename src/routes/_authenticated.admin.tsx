import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { getMyRoles } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, PackageSearch, UploadCloud, Sparkles, LogOut, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Adeconex 2030" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const { roles } = await context.queryClient.ensureQueryData({
      queryKey: ["admin", "my-roles"],
      queryFn: () => getMyRoles(),
      staleTime: Infinity,
      gcTime: Infinity,
    });
    if (!roles.includes("admin") && !roles.includes("editor")) {
      throw redirect({ to: "/" });
    }
    return { roles };
  },
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/produtos", label: "Produtos", icon: PackageSearch, exact: false },
  { to: "/admin/importacao", label: "Importação", icon: UploadCloud, exact: false },
  { to: "/admin/enriquecimento", label: "Enriquecimento", icon: Sparkles, exact: false },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-muted/20">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="border-b p-4">
          <p className="eyebrow text-xs">Adeconex 2030</p>
          <p className="mt-1 text-sm font-semibold">Painel administrativo</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
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

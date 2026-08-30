import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Auth gate. beforeLoad runs on SSR too: the server has no localStorage session,
 * so unauthenticated requests are redirected to /auth consistently, avoiding
 * hydration mismatches when the client reaches the same conclusion.
 */
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } as never });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});

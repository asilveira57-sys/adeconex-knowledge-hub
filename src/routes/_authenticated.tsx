import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Auth gate. Client-only (ssr:false) because Supabase stores the session
 * in localStorage, which the server cannot read.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } as never });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});

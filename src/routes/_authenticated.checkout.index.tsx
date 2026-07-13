import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/checkout/")({
  beforeLoad: () => {
    throw redirect({ to: "/checkout/endereco" });
  },
});

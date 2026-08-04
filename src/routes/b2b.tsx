import { createFileRoute, redirect } from "@tanstack/react-router";

// Módulo B2B temporariamente oculto — será produzido futuramente.
export const Route = createFileRoute("/b2b")({
  head: () => ({
    meta: [
      { title: "Área B2B — Adeconex" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/contato" });
  },
  component: () => null,
});

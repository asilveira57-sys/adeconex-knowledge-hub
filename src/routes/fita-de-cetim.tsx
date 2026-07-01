import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/fita-de-cetim")({
  component: () => <Outlet />,
});

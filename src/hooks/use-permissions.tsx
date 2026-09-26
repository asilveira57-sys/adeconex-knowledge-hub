import { useQuery } from "@tanstack/react-query";
import { getMyPermissions } from "@/lib/staff.functions";

export const myPermissionsQuery = {
  queryKey: ["admin", "my-permissions"],
  queryFn: () => getMyPermissions(),
  staleTime: 60_000,
};

export function usePermissions() {
  return useQuery(myPermissionsQuery).data;
}

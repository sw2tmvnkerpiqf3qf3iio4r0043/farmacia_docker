import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { userService, type AppUser } from "../services/userService";

export function useUsers(): UseQueryResult<AppUser[], Error> {
  return useQuery({
    queryKey: ["users"],
    queryFn: userService.getAll,
  });
}

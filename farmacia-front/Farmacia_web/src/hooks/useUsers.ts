import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { userService } from "../services/userService";
import type { User } from "../types/user";

export function useUsers(): UseQueryResult<User[], Error> {
  return useQuery({
    queryKey: ["users"],
    queryFn: userService.getAll,
  });
}

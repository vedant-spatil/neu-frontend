import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { getToken } from "./session";
import { UserSchema } from "../api/schemas";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    enabled: Boolean(getToken()),
    queryFn: async () => UserSchema.parse(await api<unknown>("/api/auth/me")),
    retry: false,
  });
}

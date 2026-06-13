import { authApi } from "@/api/client";
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000, // 5 min
    retry: false,
  });

  return { user, isLoading, isAuthenticated: !!user && !isError };
}

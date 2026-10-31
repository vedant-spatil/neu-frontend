import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../auth/session";

/** Clears the session and cached data, then returns to the sign-in page. Used by the sidebar and the top bar. */
export function useLogout(): () => void {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return () => {
    clearToken();
    qc.clear();
    navigate("/login", { replace: true });
  };
}

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { getToken } from "../auth/session";
import { openStream } from "../lib/stream";

/** Keeps the dashboard and the notification bell up to date from the server's pushes. Renders nothing. The stream is
 * opened for the signed-in user and closed on logout; navigation re-reads the token, so login and logout are caught. */
export default function Live() {
  const qc = useQueryClient();
  useLocation();
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    return openStream(token, (e) => {
      if (e.event !== "snapshot") return;
      const snap = e.data as { dashboard: unknown };
      qc.setQueryData(["dashboard"], snap.dashboard);
      qc.invalidateQueries({ queryKey: ["dashboard-trends"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    });
  }, [token, qc]);

  return null;
}

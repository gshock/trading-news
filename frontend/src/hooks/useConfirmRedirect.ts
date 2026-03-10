import { useEffect, useState } from "react";
import { toast } from "react-toastify";

function readTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const t = params.get("token");
  return t && /^[0-9a-f]{64}$/i.test(t) ? t : null;
}

/**
 * Reads ?token= from the URL on first render.
 * Returns the confirmation token if present, or null.
 * Also handles the legacy ?confirmed=error redirect from old backend GET links.
 */
export function useConfirmRedirect(): string | null {
  // useState with an initializer function runs synchronously on first render,
  // so the returned token is correct even before any effects fire.
  const [pendingToken] = useState<string | null>(readTokenFromUrl);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("token") || params.has("confirmed")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    // Legacy: ?confirmed=error arrives from the old GET /subscription/confirm redirect
    // when an already-invalid token was in an old email.
    if (params.get("confirmed") === "error") {
      toast.error("Confirmation failed. The link may be invalid or expired.");
    }
  }, []);

  return pendingToken;
}

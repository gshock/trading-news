import { useEffect, useState } from "react";

function readUnsubscribeTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  if (window.location.pathname !== "/unsubscribe") return null;
  const params = new URLSearchParams(window.location.search);
  const t = params.get("token");
  // Token is two base64url segments joined by a dot
  return t && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t) ? t : null;
}

/**
 * Reads ?token= from the URL when the path is /unsubscribe.
 * Returns the unsubscribe token if present and well-formed, otherwise null.
 * Clears the token from the address bar after reading.
 */
export function useUnsubscribeRedirect(): string | null {
  const [token] = useState<string | null>(readUnsubscribeTokenFromUrl);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/unsubscribe") return;
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return token;
}

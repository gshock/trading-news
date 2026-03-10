import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import type { TabItem } from "../types/tabs";

export function useConfirmRedirect(): TabItem {
  const [initialTab, setInitialTab] = useState<TabItem>("subscribe");
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const confirmed = params.get("confirmed");

    if (!confirmed) {
      return;
    }

    // Clean the URL immediately
    window.history.replaceState({}, "", window.location.pathname);

    if (confirmed === "success") {
      toast.success("Subscription confirmed! You're all set.");
      setInitialTab("status");
      return;
    }

    if (confirmed === "already") {
      toast.info("Your subscription is already confirmed.");
      setInitialTab("status");
      return;
    }

    toast.error("Confirmation failed. The link may be invalid or expired.");
    setInitialTab("subscribe");
  }, []);

  return initialTab;
}

import { useState } from "react";
import { toast } from "react-toastify";
import type { TabItem } from "../types/tabs";

export function useConfirmRedirect(): TabItem {
  const [initialTab] = useState<TabItem>(() => {
    const params = new URLSearchParams(window.location.search);
    const confirmed = params.get("confirmed");

    if (!confirmed) return "subscribe";

    // Clean the URL immediately
    window.history.replaceState({}, "", window.location.pathname);

    if (confirmed === "success") {
      toast.success("Subscription confirmed! You're all set.");
      return "status";
    }

    if (confirmed === "already") {
      toast.info("Your subscription is already confirmed.");
      return "status";
    }

    toast.error("Confirmation failed. The link may be invalid or expired.");
    return "subscribe";
  });

  return initialTab;
}

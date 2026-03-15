import { useState } from "react";
import { useUnsubscribeByToken, getErrorMessage } from "../hooks/useSubscription";
import { Checkbox } from "./ui/checkbox";
import { PageLayout } from "./PageLayout";
import { HeroSection } from "./HeroSection";
import type { TopicId } from "../types/tabs";

interface UnsubscribePageProps {
  token: string;
  onBack: () => void;
}

const TOPIC_GROUPS = [
  {
    group: "AM Analysis",
    topics: [{ id: "530AM" as TopicId, label: "5:30 AM" }],
  },
  {
    group: "Sector Snapshot",
    topics: [
      { id: "945AM" as TopicId, label: "9:45 AM" },
      { id: "10AM" as TopicId, label: "10:00 AM" },
    ],
  },
];

const ALL_TOPIC_IDS: TopicId[] = ["530AM", "945AM", "10AM"];

/** Safely decode the base64url payload from the HMAC token (no secret needed). */
function decodeTokenTopic(token: string): TopicId | null {
  try {
    const payloadBase64 = token.split(".")[0];
    // base64url → standard base64
    const standard = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(standard);
    const payload = JSON.parse(json) as Record<string, unknown>;
    const t = payload.topic;
    if (typeof t === "string" && (ALL_TOPIC_IDS as string[]).includes(t)) {
      return t as TopicId;
    }
    return null;
  } catch {
    return null;
  }
}

export function UnsubscribePage({ token, onBack }: UnsubscribePageProps) {
  const hintedTopic = decodeTokenTopic(token);
  const [selected, setSelected] = useState<TopicId[]>(
    hintedTopic ? [hintedTopic] : ALL_TOPIC_IDS,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const unsubscribeMutation = useUnsubscribeByToken();

  const toggle = (id: TopicId) => {
    setValidationError(null);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleSubmit = () => {
    if (selected.length === 0) {
      setValidationError("Select at least one topic to unsubscribe from.");
      return;
    }
    unsubscribeMutation.mutate({ token, topics: selected });
  };

  const isFullUnsub =
    unsubscribeMutation.isSuccess &&
    (unsubscribeMutation.data.remainingTopics?.length ?? 0) === 0;

  return (
    <PageLayout>
      <HeroSection
        heading={
          unsubscribeMutation.isSuccess
            ? isFullUnsub
              ? "YOU'VE BEEN UNSUBSCRIBED."
              : "PREFERENCES UPDATED."
            : "UNSUBSCRIBE."
        }
        description={
          unsubscribeMutation.isSuccess
            ? isFullUnsub
              ? "You'll no longer receive market updates from us."
              : `Remaining subscriptions: ${unsubscribeMutation.data.remainingTopics?.join(", ")}.`
            : "Choose the updates you'd like to stop receiving."
        }
      />

      <div className="bg-(--bg-card) border border-(--border-card) rounded-lg overflow-hidden p-6 transition-colors duration-300">
        {unsubscribeMutation.isSuccess ? (
          <p className="text-sm font-semibold text-green-500 text-center">
            {isFullUnsub ? "Unsubscribed successfully." : "Your preferences have been saved."}
          </p>
        ) : unsubscribeMutation.isError ? (
          <div className="text-center">
            <p className="text-sm text-red-400 mb-4">
              {getErrorMessage(unsubscribeMutation.error)}
            </p>
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-blue-400 underline cursor-pointer"
            >
              Back
            </button>
          </div>
        ) : (
          <>
            {TOPIC_GROUPS.map(({ group, topics }) => (
              <div key={group} className="mb-4">
                <p className="text-[10px] font-bold text-(--text-secondary) tracking-[0.15em] uppercase mb-3">
                  {group}
                </p>
                <div className="flex gap-3">
                  {topics.map(({ id, label }) => (
                    <Checkbox
                      key={id}
                      label={label}
                      checked={selected.includes(id)}
                      onChange={() => toggle(id)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {validationError && (
              <p className="text-xs text-red-400 mb-4">{validationError}</p>
            )}

            <button
              type="button"
              disabled={unsubscribeMutation.isPending}
              onClick={handleSubmit}
              className="w-full py-3 rounded text-sm font-semibold tracking-wide bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {unsubscribeMutation.isPending
                ? "Unsubscribing..."
                : selected.length === ALL_TOPIC_IDS.length
                  ? "Unsubscribe from All"
                  : "Unsubscribe from Selected"}
            </button>
          </>
        )}
      </div>
    </PageLayout>
  );
}

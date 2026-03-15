import { useConfirmSubscription, getErrorMessage } from "../hooks/useSubscription";
import { PageLayout } from "./PageLayout";
import { HeroSection } from "./HeroSection";

interface ConfirmPageProps {
  token: string;
  onBack: () => void;
}

const TOPIC_LABELS: Record<string, { label: string; group: string }> = {
  "530AM":  { label: "5:30 AM",  group: "AM Analysis" },
  "945AM":  { label: "9:45 AM",  group: "Sector Snapshot" },
  "10AM":   { label: "10:00 AM", group: "Sector Snapshot" },
};

function TopicBadges({ topics }: { topics: string }) {
  const ids = topics.split(",").map((t) => t.trim()).filter(Boolean);
  if (ids.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 justify-center mt-3">
      {ids.map((id) => {
        const meta = TOPIC_LABELS[id];
        return (
          <span
            key={id}
            className="inline-flex flex-col px-2.5 py-1 rounded border border-blue-500/30 bg-blue-600/10"
          >
            <span className="text-[9px] text-blue-400 font-semibold tracking-wider uppercase leading-none">
              {meta?.group ?? id}
            </span>
            <span className="text-xs text-(--text-heading) font-semibold mt-0.5">
              {meta?.label ?? id}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function ConfirmPage({ token, onBack }: ConfirmPageProps) {
  const confirmMutation = useConfirmSubscription();

  const successTopics = confirmMutation.isSuccess ? confirmMutation.data.topics : null;

  return (
    <PageLayout>
      <HeroSection
        heading={
          confirmMutation.isSuccess
            ? "YOU'RE ALL SET."
            : "CONFIRM YOUR SUBSCRIPTION."
        }
        description={
          confirmMutation.isSuccess
            ? "Your Market Snapshot updates have been activated."
            : "Click below to activate your Market Snapshot subscription."
        }
      />

      <div className="bg-(--bg-card) border border-(--border-card) rounded-lg overflow-hidden p-6 transition-colors duration-300">
        {confirmMutation.isSuccess ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-green-500">
              {confirmMutation.data.message === "already_confirmed"
                ? "Your subscription is already active."
                : "Subscription confirmed!"}
            </p>
            {successTopics && <TopicBadges topics={successTopics} />}
          </div>
        ) : confirmMutation.isError ? (
          <div className="text-center">
            <p className="text-sm text-red-400 mb-4">
              {getErrorMessage(confirmMutation.error)}
            </p>
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-blue-400 underline cursor-pointer"
            >
              Back to subscribe
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={confirmMutation.isPending}
            onClick={() => confirmMutation.mutate(token)}
            className="w-full py-3 rounded text-sm font-semibold tracking-wide bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmMutation.isPending
              ? "Confirming..."
              : "Confirm Subscription"}
          </button>
        )}
      </div>
    </PageLayout>
  );
}

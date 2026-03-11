import { useConfirmSubscription, getErrorMessage } from "../hooks/useSubscription";
import { PageLayout } from "./PageLayout";
import { HeroSection } from "./HeroSection";

interface ConfirmPageProps {
  token: string;
  onBack: () => void;
}

export function ConfirmPage({ token, onBack }: ConfirmPageProps) {
  const confirmMutation = useConfirmSubscription();

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
            ? "Pre-market chart updates will arrive every weekday at 5:30 AM EST."
            : "Click below to activate your Market Snapshot subscription."
        }
      />

      <div className="bg-(--bg-card) border border-(--border-card) rounded-lg overflow-hidden p-6 transition-colors duration-300">
        {confirmMutation.isSuccess ? (
          <p className="text-sm font-semibold text-green-500 text-center">
            {confirmMutation.data.message === "already_confirmed"
              ? "Your subscription is already active."
              : "Subscription confirmed!"}
          </p>
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

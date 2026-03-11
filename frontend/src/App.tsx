import { useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "react-toastify";
import type { TabItem, Tab, TopicId, Topic } from "./types/tabs";
import { Checkbox } from "./components/checkbox";
import { ThemeToggle } from "./components/ThemeToggle";
import {
  useSubscribe,
  useGetSubscription,
  useUnsubscribe,
  useConfirmSubscription,
  getErrorMessage,
} from "./hooks/useSubscription";
import { useConfirmRedirect } from "./hooks/useConfirmRedirect";
import { isValidEmail } from "./utils/validateEmail";

const TABS: Tab[] = [
  { id: "subscribe", label: "Subscribe" },
  { id: "status", label: "Check Status" },
  { id: "unsubscribe", label: "Unsubscribe" },
];

const CTA_LABEL: Record<TabItem, string> = {
  subscribe: "Subscribe",
  status: "Check Status",
  unsubscribe: "Unsubscribe",
};

const TOPICS: Topic[] = [
  { id: "945AM", label: "9:45 AM" },
  { id: "10AM", label: "10:00 AM" },
];

function App() {
  const initialPendingToken = useConfirmRedirect();
  const [pendingToken, setPendingToken] = useState<string | null>(initialPendingToken);
  const [tab, setTab] = useState<TabItem>("subscribe");
  const [email, setEmail] = useState("");
  const [topics, setTopics] = useState<TopicId[]>([]);
  const [statusSubmitted, setStatusSubmitted] = useState(false);

  const subscribeMutation = useSubscribe();
  const unsubscribeMutation = useUnsubscribe();
  const confirmMutation = useConfirmSubscription();
  const statusQuery = useGetSubscription(email);

  const toggleTopic = (id: TopicId) => {
    subscribeMutation.reset();
    setTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleTabChange = (id: TabItem) => {
    setTab(id);
    setEmail("");
    setStatusSubmitted(false);
    subscribeMutation.reset();
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setStatusSubmitted(false);
    subscribeMutation.reset();
  };

  const isLoading =
    subscribeMutation.isPending ||
    unsubscribeMutation.isPending ||
    statusQuery.isFetching;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !isValidEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (tab === "subscribe" && topics.length === 0) {
      toast.error("Please select at least one session (9:45 AM or 10:00 AM)");
      return;
    }

    if (tab === "subscribe") {
      subscribeMutation.mutate(
        { email, topics: topics.join(", "), source: "web" },
        {
          onSuccess: () => {
            setEmail("");
            setTopics([]);
          },
        },
      );
    } else if (tab === "status") {
      setStatusSubmitted(true);
      statusQuery.refetch();
    } else if (tab === "unsubscribe") {
      unsubscribeMutation.mutate(email, {
        onSuccess: () => setEmail(""),
      });
    }
  };

  if (pendingToken !== null) {
    return (
      <div className="min-h-screen bg-(--bg-page) text-(--text-body) flex flex-col transition-colors duration-300">
        {/* ── HEADER ── */}
        <header className="border-b border-(--border-subtle) px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold tracking-[0.18em] text-(--text-heading) uppercase">
                Market Snapshot
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-sm bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold tracking-widest uppercase">
                Newsletter
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-(--text-secondary) tracking-wide hidden sm:block">
                Daily Updates
              </span>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main className="flex-1 flex items-start justify-center px-6 pt-16 pb-28">
          <div className="w-full max-w-md">
            <div className="mb-10">
              <p className="text-[10px] font-bold tracking-[0.25em] text-blue-500 uppercase mb-4">
                Daily Chart Digest
              </p>
              <h1 className="text-[2rem] font-bold text-(--text-heading) leading-tight tracking-tight mb-3">
                {confirmMutation.isSuccess
                  ? "YOU'RE ALL SET."
                  : "CONFIRM YOUR SUBSCRIPTION."}
              </h1>
              <p className="text-sm text-(--text-secondary) leading-relaxed">
                {confirmMutation.isSuccess
                  ? "Pre-market chart updates will arrive every weekday at 5:30 AM EST."
                  : "Click below to activate your Market Snapshot subscription."}
              </p>
            </div>

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
                    onClick={() => setPendingToken(null)}
                    className="text-xs text-blue-400 underline cursor-pointer"
                  >
                    Back to subscribe
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate(pendingToken)}
                  className="w-full py-3 rounded text-sm font-semibold tracking-wide bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {confirmMutation.isPending ? "Confirming..." : "Confirm Subscription"}
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer className="border-t border-(--border-subtle) px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <p className="text-[11px] text-(--text-faint) text-center">
              Market Snapshot — Daily Trading Updates
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg-page) text-(--text-body) flex flex-col transition-colors duration-300">
      {/* ── HEADER ── */}
      <header className="border-b border-(--border-subtle) px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-[0.18em] text-(--text-heading) uppercase">
              Market Snapshot
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-sm bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold tracking-widest uppercase">
              Newsletter
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-(--text-secondary) tracking-wide hidden sm:block">
              Daily Updates
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 flex items-start justify-center px-6 pt-16 pb-28">
        <div className="w-full max-w-md">
          {/* Hero */}
          <div className="mb-10">
            <p className="text-[10px] font-bold tracking-[0.25em] text-blue-500 uppercase mb-4">
              Daily Chart Digest
            </p>
            <h1 className="text-[2rem] font-bold text-(--text-heading) leading-tight tracking-tight mb-3">
              STAY AHEAD OF THE MARKET.
            </h1>
            <p className="text-sm text-(--text-secondary) leading-relaxed">
              Chart snapshots delivered to your inbox every session.
            </p>
          </div>

          {/* Card */}
          <div className="bg-(--bg-card) border border-(--border-card) rounded-lg overflow-hidden transition-colors duration-300">
            {/* Tabs */}
            <div className="flex border-b border-(--border-card)">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTabChange(t.id)}
                  className={`flex-1 py-3 text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
                    tab === t.id
                      ? "text-(--text-heading) border-b-2 border-blue-500 bg-blue-600/5"
                      : "text-(--text-muted) hover:text-(--text-secondary)"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form className="p-6" onSubmit={handleSubmit}>
              <label className="block text-[10px] font-bold text-(--text-secondary) tracking-[0.15em] uppercase mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="you@example.com"
                className="w-full bg-(--bg-input) border border-(--border-input) rounded px-4 py-3 text-sm text-(--text-heading) placeholder-(--text-faint) outline-none focus:border-blue-600/60 transition-colors mb-4"
              />

              {tab === "subscribe" && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-(--text-secondary) tracking-[0.15em] uppercase mb-3">
                    Sessions
                  </p>
                  <div className="flex gap-3">
                    {TOPICS.map((topic) => (
                      <Checkbox
                        key={topic.id}
                        label={topic.label}
                        checked={topics.includes(topic.id)}
                        onChange={() => toggleTopic(topic.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded text-sm font-semibold tracking-wide transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  tab === "unsubscribe"
                    ? "bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                {isLoading ? "Loading..." : CTA_LABEL[tab]}
              </button>

              {tab === "status" && statusSubmitted && statusQuery.isError && (
                <div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-red-400 text-center">
                    {getErrorMessage(statusQuery.error)}
                  </p>
                </div>
              )}

              {tab === "status" && statusSubmitted && statusQuery.data && (
                <div className="mt-4 p-3 rounded bg-(--status-bg) border border-(--border-card)">
                  <p className="text-xs text-(--text-secondary)">
                    Status:{" "}
                    <span className="text-(--text-heading) font-semibold">
                      {statusQuery.data.status}
                    </span>
                  </p>
                  {statusQuery.data.topics && (
                    <p className="text-xs text-(--text-secondary) mt-1">
                      Topics:{" "}
                      <span className="text-(--text-heading)">
                        {statusQuery.data.topics}
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-(--text-muted) mt-1">
                    Since{" "}
                    {new Date(statusQuery.data.createdUtc).toLocaleDateString()}
                  </p>
                </div>
              )}

              {tab === "subscribe" && subscribeMutation.isSuccess && (
                <div className="mt-4 p-3 rounded bg-blue-600/10 border border-blue-500/30">
                  <p className="text-xs text-blue-300 text-center">
                    Check your email and click the confirmation link to activate your subscription.
                  </p>
                </div>
              )}

              {tab === "subscribe" && !subscribeMutation.isSuccess && (
                <p className="mt-4 text-[11px] text-(--text-faint) text-center">
                  No spam. Unsubscribe any time.
                </p>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-(--border-subtle) px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] text-(--text-faint) text-center">
            Market Snapshot — Daily Trading Updates
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

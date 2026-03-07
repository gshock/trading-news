import { useState } from "react";
import { toast } from "react-toastify";
import type { TabItem, Tab, TopicId, Topic } from "./types/tabs";
import { Checkbox } from "./components/checkbox";
import {
  useSubscribe,
  useGetSubscription,
  useUnsubscribe,
} from "./hooks/useSubscription";
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
  const [tab, setTab] = useState<TabItem>("subscribe");
  const [email, setEmail] = useState("");
  const [topics, setTopics] = useState<TopicId[]>([]);

  const subscribeMutation = useSubscribe();
  const unsubscribeMutation = useUnsubscribe();
  const statusQuery = useGetSubscription(email);

  const toggleTopic = (id: TopicId) => {
    setTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const isLoading =
    subscribeMutation.isPending ||
    unsubscribeMutation.isPending ||
    statusQuery.isFetching;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !isValidEmail(email)) {
      toast.error("Please enter a valid email address");
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
      statusQuery.refetch();
    } else if (tab === "unsubscribe") {
      unsubscribeMutation.mutate(email, {
        onSuccess: () => setEmail(""),
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#080d14] text-slate-100 flex flex-col">
      {/* ── HEADER ── */}
      <header className="border-b border-white/6 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-[0.18em] text-white uppercase">
              Market Snapshot
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-sm bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold tracking-widest uppercase">
              Newsletter
            </span>
          </div>
          <span className="text-xs text-slate-600 tracking-wide hidden sm:block">
            Daily Updates
          </span>
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
            <h1 className="text-[2rem] font-bold text-white leading-tight tracking-tight mb-3">
              STAY AHEAD OF THE MARKET.
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Chart snapshots delivered to your inbox every session.
            </p>
          </div>

          {/* Card */}
          <div className="bg-[#0c1420] border border-white/[0.07] rounded-lg overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/[0.07]">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-3 text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
                    tab === t.id
                      ? "text-white border-b-2 border-blue-500 bg-blue-600/5"
                      : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form className="p-6" onSubmit={handleSubmit}>
              <label className="block text-[10px] font-bold text-slate-500 tracking-[0.15em] uppercase mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#080d14] border border-white/9 rounded px-4 py-3 text-sm text-white placeholder-slate-700 outline-none focus:border-blue-600/60 transition-colors mb-4"
              />

              {tab === "subscribe" && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-slate-500 tracking-[0.15em] uppercase mb-3">
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

              {tab === "status" && statusQuery.data && (
                <div className="mt-4 p-3 rounded bg-[#080d14] border border-white/8">
                  <p className="text-xs text-slate-400">
                    Status:{" "}
                    <span className="text-white font-semibold">
                      {statusQuery.data.status}
                    </span>
                  </p>
                  {statusQuery.data.topics && (
                    <p className="text-xs text-slate-400 mt-1">
                      Topics:{" "}
                      <span className="text-white">
                        {statusQuery.data.topics}
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Since{" "}
                    {new Date(statusQuery.data.createdUtc).toLocaleDateString()}
                  </p>
                </div>
              )}

              {tab === "subscribe" && (
                <p className="mt-4 text-[11px] text-slate-700 text-center">
                  No spam. Unsubscribe any time.
                </p>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] text-slate-700 text-center">
            Market Snapshot — Daily Trading Updates
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

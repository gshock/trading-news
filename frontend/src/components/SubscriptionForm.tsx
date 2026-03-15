import { useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "react-toastify";
import type { TabItem, Tab, TopicId } from "../types/tabs";
import { Checkbox } from "./ui/checkbox";
import {
  useSubscribe,
  useGetSubscription,
  useUnsubscribe,
  getErrorMessage,
} from "../hooks/useSubscription";
import { isValidEmail } from "../utils/validateEmail";

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


const getInitialTab = (): TabItem => {
  if (typeof window === "undefined") {
    return "subscribe";
  }

  const searchParams = new URLSearchParams(window.location.search);
  const tabParam = searchParams.get("tab");

  if (TABS.some((t) => t.id === tabParam)) {
    return tabParam as TabItem;
  }

  return "subscribe";
};

const getInitialEmail = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  const searchParams = new URLSearchParams(window.location.search);
  const emailParam = searchParams.get("email");

  return emailParam ?? "";
};

export function SubscriptionForm() {
  const [tab, setTab] = useState<TabItem>(() => getInitialTab());
  const [email, setEmail] = useState<string>(() => getInitialEmail());
  const [topics, setTopics] = useState<TopicId[]>([]);
  const [statusSubmitted, setStatusSubmitted] = useState(false);

  const subscribeMutation = useSubscribe();
  const unsubscribeMutation = useUnsubscribe();
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !isValidEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (tab === "subscribe" && topics.length === 0) {
      toast.error("Please select at least one session");
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

  return (
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
          <>
            <div className="mb-4">
              <p className="text-[10px] font-bold text-(--text-secondary) tracking-[0.15em] uppercase mb-3">
                AM Analysis
              </p>
              <Checkbox
                label="5:30 AM"
                checked={topics.includes("530AM")}
                onChange={() => toggleTopic("530AM")}
              />
            </div>
            <div className="mb-4">
              <p className="text-[10px] font-bold text-(--text-secondary) tracking-[0.15em] uppercase mb-3">
                Sector Snapshot
              </p>
              <div className="flex gap-3">
                <Checkbox
                  label="9:45 AM"
                  checked={topics.includes("945AM")}
                  onChange={() => toggleTopic("945AM")}
                />
                <Checkbox
                  label="10:00 AM"
                  checked={topics.includes("10AM")}
                  onChange={() => toggleTopic("10AM")}
                />
              </div>
            </div>
          </>
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
              Since {new Date(statusQuery.data.createdUtc).toLocaleDateString()}
            </p>
          </div>
        )}

        {tab === "subscribe" && subscribeMutation.isSuccess && (
          <div className="mt-4 p-3 rounded bg-blue-600/10 border border-blue-500/30">
            <p className="text-xs text-blue-300 text-center">
              Check your email and click the confirmation link to activate your
              subscription.
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
  );
}

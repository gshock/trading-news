import { useState } from "react";
import type { TabItem, Tab } from "./types/tabs";

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

function App() {
  const [tab, setTab] = useState<TabItem>("subscribe");
  const [email, setEmail] = useState("");

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
            <form className="p-6">
              <label className="block text-[10px] font-bold text-slate-500 tracking-[0.15em] uppercase mb-2">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#080d14] border border-white/9 rounded px-4 py-3 text-sm text-white placeholder-slate-700 outline-none focus:border-blue-600/60 transition-colors mb-4"
              />

              <button
                type="submit"
                className={`w-full py-3 rounded text-sm font-semibold tracking-wide transition-colors cursor-pointer ${
                  tab === "unsubscribe"
                    ? "bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                {CTA_LABEL[tab]}
              </button>

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

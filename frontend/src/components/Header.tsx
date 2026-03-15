import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="border-b border-(--border-subtle) px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm font-bold tracking-[0.18em] text-(--text-heading) uppercase hover:opacity-80 transition-opacity">
            Market Snapshot
          </a>
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
  );
}

import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-(--bg-page) text-(--text-body) flex flex-col transition-colors duration-300">
      <Header />
      <main className="flex-1 flex items-start justify-center px-6 pt-16 pb-28">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

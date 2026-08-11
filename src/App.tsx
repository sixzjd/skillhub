import { useState } from "react";
import { useI18n } from "./hooks/useI18n";
import { LibraryPage } from "./pages/LibraryPage";
import { AgentsPage } from "./pages/AgentsPage";
import { MarketPage } from "./pages/MarketPage";
import { SettingsPage } from "./pages/SettingsPage";
import { cn } from "./lib/utils";

type PageKey = "library" | "agents" | "market" | "settings";

export default function App() {
  const { t } = useI18n();
  const [page, setPage] = useState<PageKey>("library");

  const nav: { key: PageKey; label: string }[] = [
    { key: "library", label: t.nav.library },
    { key: "agents", label: t.nav.agents },
    { key: "market", label: t.nav.market },
    { key: "settings", label: t.nav.settings },
  ];

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* 侧边栏 */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-200/70 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-5">
          {/* 品牌标记：单色块 */}
          <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-zinc-900 text-[15px] font-black text-white shadow-sm dark:bg-white dark:text-zinc-900">
            S
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight">SkillHub</div>
            <div className="text-[10px] font-medium tracking-wide text-zinc-400">{t.app.tagline}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-2.5 py-3">
          {nav.map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className={cn(
                "group relative flex w-full items-center rounded-lg px-3 py-[7px] text-[13px] font-medium transition-colors duration-150",
                page === item.key
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300"
                  : "text-zinc-500 hover:bg-zinc-100/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
              )}
            >
              {page === item.key && (
                <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-indigo-500" />
              )}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div className="font-mono text-[10px] leading-relaxed text-zinc-400">
            SSOT
            <br />~/.agents/skills
          </div>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="min-w-0 flex-1 overflow-y-auto p-6">
        {page === "library" && <LibraryPage />}
        {page === "agents" && <AgentsPage />}
        {page === "market" && <MarketPage />}
        {page === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}
import { useState } from "react";
import { useI18n } from "./hooks/useI18n";
import { AgentsPage } from "./pages/AgentsPage";
import { LibraryPage } from "./pages/LibraryPage";
import { MarketPage } from "./pages/MarketPage";
import { SettingsPage } from "./pages/SettingsPage";
import { cn } from "./lib/utils";

type PageKey = "agents" | "library" | "market" | "settings";

export default function App() {
  const { t } = useI18n();
  const [page, setPage] = useState<PageKey>("agents");

  const nav: { key: PageKey; label: string; icon: string }[] = [
    { key: "agents", label: t.nav.agents, icon: "🖥️" },
    { key: "library", label: t.nav.library, icon: "📦" },
    { key: "market", label: t.nav.market, icon: "🛒" },
    { key: "settings", label: t.nav.settings, icon: "⚙️" },
  ];

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* 侧边栏 */}
      <aside className="flex w-52 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="text-xl">🧩</span>
          <div>
            <div className="text-sm font-bold leading-none">SkillHub</div>
            <div className="mt-0.5 text-[10px] text-zinc-400">{t.app.tagline}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-2">
          {nav.map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                page === item.key
                  ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="text-[10px] text-zinc-400">
            SSOT: ~/.agents/skills
          </div>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 overflow-y-auto p-6">
        {page === "agents" && <AgentsPage />}
        {page === "library" && <LibraryPage />}
        {page === "market" && <MarketPage />}
        {page === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}
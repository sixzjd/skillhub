import { useEffect, useState } from "react";
import { Bot, Library, Store, Trash2, Settings as SettingsIcon } from "lucide-react";
import { useI18n } from "./hooks/useI18n";
import { appInfo } from "./lib/tauri";
import { LibraryPage } from "./pages/LibraryPage";
import { AgentsPage } from "./pages/AgentsPage";
import { MarketPage } from "./pages/MarketPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TrashPage } from "./pages/TrashPage";
import { cn } from "./lib/utils";
import skillhubIcon from "./assets/skillhub-icon.png";

type PageKey = "library" | "agents" | "market" | "settings" | "trash";

export default function App() {
  const { t } = useI18n();
  const [page, setPage] = useState<PageKey>("library");
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    appInfo()
      .then((info) => setVersion(info.version))
      .catch(() => setVersion(null));
  }, []);

  const nav: { key: PageKey; label: string; icon: typeof Library }[] = [
    { key: "library", label: t.nav.library, icon: Library },
    { key: "agents", label: t.nav.agents, icon: Bot },
    { key: "market", label: t.nav.market, icon: Store },
    { key: "settings", label: t.nav.settings, icon: SettingsIcon },
    { key: "trash", label: t.nav.trash, icon: Trash2 },
  ];

  return (
    <div data-tauri-drag-region className="flex h-dvh bg-[#faf8f5] text-[#2c2420] dark:bg-[#1c1714] dark:text-[#e8ddd4]">
      {/* 侧边栏 */}
      <aside data-tauri-drag-region className="flex w-60 shrink-0 flex-col border-r border-[#e8e0d8] bg-[#f2ede8] dark:border-[#2e2520] dark:bg-[#231c18]">
        <div className="flex items-center gap-3 px-5 pb-3 pt-9">
          {/* 品牌标记：应用图标 */}
          <img src={skillhubIcon} alt="SkillHub" className="size-9 rounded-[10px] object-contain" />
          <div className="leading-tight">
            <div className="text-[16px] font-bold tracking-tight">SkillHub</div>
            <div className="text-[11px] font-medium tracking-wide text-[#8a7e76]">{t.app.tagline}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setPage(item.key)}
                aria-current={page === item.key ? "page" : undefined}
                className={cn(
                  "group relative flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2 text-[14px] font-medium transition-colors duration-150",
                  page === item.key
                    ? "bg-[#c0543e]/8 text-[#c0543e] dark:bg-[#c0543e]/15 dark:text-[#e07a64]"
                    : "text-[#8a7e76] hover:bg-[#ebe5df]/70 hover:text-[#2c2420] dark:text-[#7a6b5c] dark:hover:bg-[#2e2520]/60 dark:hover:text-[#e8ddd4]"
                )}
              >
                {page === item.key && (
                  <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#c0543e]" />
                )}
                <Icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-[#e8e0d8]/60 px-5 py-3 dark:border-[#2e2520]">
          <div className="font-mono text-[11px] leading-relaxed text-[#8a7e76]">
            SSOT
            <br />~/.agents/skills
          </div>
          {version && (
            <div className="mt-1 text-[10px] text-[#a89b90] dark:text-[#6a5c50]">
              SkillHub v{version}
            </div>
          )}
        </div>
      </aside>

      {/* 主内容 */}
      <main className="min-w-0 flex-1 overflow-y-auto p-6">
        <div key={page} className="animate-page-in">
          {page === "library" && <LibraryPage onNavigate={setPage} />}
          {page === "agents" && <AgentsPage />}
          {page === "market" && <MarketPage />}
          {page === "settings" && <SettingsPage />}
          {page === "trash" && <TrashPage />}
        </div>
      </main>
    </div>
  );
}

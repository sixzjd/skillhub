import { useEffect, useState } from "react";
import { useI18n } from "../hooks/useI18n";
import { defaultMarketplaces, fetchMarketSkills, installMarketSkill, listLibrary } from "../lib/tauri";
import type { Marketplace, MarketSkill } from "../lib/tauri";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function MarketPage() {
  const { t } = useI18n();
  const [markets, setMarkets] = useState<Marketplace[]>([]);
  const [active, setActive] = useState<Marketplace | null>(null);
  const [skills, setSkills] = useState<MarketSkill[]>([]);
  const [installedNames, setInstalledNames] = useState<Set<string>>(new Set());
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    defaultMarketplaces().then(setMarkets).catch((e) => setError(String(e)));
  }, []);

  const loadInstalled = async () => {
    try {
      const lib = await listLibrary();
      setInstalledNames(new Set(lib.map((s) => s.name)));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadInstalled();
  }, [installing]);

  const openMarket = async (m: Marketplace) => {
    setActive(m);
    setLoadingMarket(true);
    setError(null);
    try {
      const list = await fetchMarketSkills(m);
      setSkills(list);
    } catch (e) {
      setError(`${t.market.loadError}: ${e}`);
      setSkills([]);
    } finally {
      setLoadingMarket(false);
    }
  };

  const doInstall = async (skill: MarketSkill) => {
    if (!active) return;
    setInstalling(skill.name);
    setError(null);
    setNotice(null);
    try {
      await installMarketSkill(active, skill.source, skill.name);
      setNotice(`✅ ${skill.name}`);
      setInstalledNames((s) => new Set(s).add(skill.name));
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t.market.title}</h1>
        <p className="text-sm text-zinc-500">{t.market.subtitle}</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="p-4 text-sm text-red-600 dark:text-red-300">{error}</CardContent>
        </Card>
      )}
      {notice && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="p-4 text-sm text-green-700 dark:text-green-300">{notice}</CardContent>
        </Card>
      )}

      {/* 市场列表 */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {markets.map((m) => (
          <Card
            key={m.id}
            className={`cursor-pointer transition-colors ${
              active?.id === m.id ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            }`}
            onClick={() => openMarket(m)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{m.name}</CardTitle>
                {m.official && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    {t.market.official}
                  </span>
                )}
              </div>
              <CardDescription>{m.description}</CardDescription>
              <CardDescription className="font-mono text-[10px]">
                {m.owner}/{m.repo}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* 技能列表 */}
      {active && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{active.name}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openMarket(active)}>
                {t.market.refresh}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingMarket ? (
              <p className="text-sm text-zinc-500">{t.common.loading}</p>
            ) : skills.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-400">{t.market.empty}</p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {skills.map((s) => {
                  const isInstalled = installedNames.has(s.name);
                  return (
                    <div key={`${s.repo}-${s.name}`} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">{s.name}</span>
                        {s.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{s.description}</p>
                        )}
                      </div>
                      {isInstalled ? (
                        <span className="shrink-0 text-xs text-zinc-400">{t.market.installed}</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={installing === s.name}
                          onClick={() => doInstall(s)}
                        >
                          {installing === s.name ? t.market.installing : t.market.install}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
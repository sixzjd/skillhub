import { useEffect, useState } from "react";
import { useI18n } from "../hooks/useI18n";
import { listAllMarkets, addMarket, removeMarket, fetchMarketSkills, installMarketSkill, listLibrary } from "../lib/tauri";
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
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [adding, setAdding] = useState(false);

  const loadMarkets = () =>
    listAllMarkets()
      .then((list) => {
        setMarkets(list);
        setActive((cur) => (cur && list.some((m) => m.id === cur.id) ? cur : null));
      })
      .catch((e) => setError(String(e)));

  useEffect(() => {
    loadMarkets();
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

  const isCustom = (m: Marketplace) => m.id.startsWith("custom-");

  const doAdd = async () => {
    setAdding(true);
    setError(null);
    setNotice(null);
    try {
      const m = await addMarket(owner, repo);
      await loadMarkets();
      setActive(m);
      setOwner("");
      setRepo("");
      await openMarket(m);
    } catch (e) {
      setError(String(e));
    } finally {
      setAdding(false);
    }
  };

  const doRemove = async (m: Marketplace) => {
    setError(null);
    try {
      await removeMarket(m.id);
      setActive((cur) => (cur?.id === m.id ? null : cur));
      await loadMarkets();
    } catch (e) {
      setError(String(e));
    }
  };

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
        <p className="text-sm text-[#8a7b6c]">{t.market.subtitle}</p>
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

      {/* 添加自定义市场 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.market.customMarket}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="rounded-md border border-[#d9cfc4] bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-[#9a8b7c] focus:border-[#231c18] dark:border-[#3e342c] dark:focus:border-[#e8dfd5]"
              placeholder={t.market.owner}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
            <input
              className="rounded-md border border-[#d9cfc4] bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-[#9a8b7c] focus:border-[#231c18] dark:border-[#3e342c] dark:focus:border-[#e8dfd5]"
              placeholder={t.market.repo}
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doAdd()}
            />
            <Button variant="accent" onClick={doAdd} disabled={adding || !owner.trim() || !repo.trim()}>
              {adding ? t.common.loading : t.market.addMarket}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 市场列表 */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {markets.map((m) => (
          <Card
            key={m.id}
            className={`cursor-pointer transition-colors ${
              active?.id === m.id ? "ring-2 ring-[#c0543e] dark:ring-[#e07a64]" : "hover:bg-[#f0e8df] dark:hover:bg-[#2e2520]/50"
            }`}
            onClick={() => openMarket(m)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{m.name}</CardTitle>
                <div className="flex items-center gap-1.5">
                  {m.official && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {t.market.official}
                    </span>
                  )}
                  {isCustom(m) && (
                    <button
                      className="rounded px-1 text-[#9a8b7c] transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50"
                      title={t.market.removeMarket}
                      onClick={(e) => {
                        e.stopPropagation();
                        void doRemove(m);
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
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
              <p className="text-sm text-[#8a7b6c]">{t.common.loading}</p>
            ) : skills.length === 0 ? (
              <p className="py-4 text-center text-sm text-[#9a8b7c]">{t.market.empty}</p>
            ) : (
              <div className="divide-y divide-[#e8dfd5] dark:divide-[#2e2520]">
                {skills.map((s) => {
                  const isInstalled = installedNames.has(s.name);
                  return (
                    <div key={`${s.repo}-${s.name}`} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">{s.name}</span>
                        {s.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-[#8a7b6c]">{s.description}</p>
                        )}
                      </div>
                      {isInstalled ? (
                        <span className="shrink-0 text-xs text-[#9a8b7c]">{t.market.installed}</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="accent"
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
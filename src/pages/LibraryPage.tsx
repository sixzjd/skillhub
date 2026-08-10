import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../hooks/useI18n";
import { listLibrary, runSync, removeFromLibrary, scanAll } from "../lib/tauri";
import type { LibrarySkill, SyncReport, AgentScan } from "../lib/tauri";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";

export function LibraryPage() {
  const { t } = useI18n();
  const [skills, setSkills] = useState<LibrarySkill[]>([]);
  const [agents, setAgents] = useState<AgentScan[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lib, scan] = await Promise.all([
        listLibrary(),
        scanAll().catch(() => ({ agents: [] })),
      ]);
      setSkills(lib);
      setAgents(scan.agents.filter((a) => a.installed));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAgent = (key: string) =>
    setSelectedAgents((s) => ({ ...s, [key]: !s[key] }));
  const allAgentsSelected =
    agents.length > 0 && agents.every((a) => selectedAgents[a.key]);
  const toggleAll = () => {
    if (allAgentsSelected) {
      setSelectedAgents({});
    } else {
      const next: Record<string, boolean> = {};
      agents.forEach((a) => (next[a.key] = true));
      setSelectedAgents(next);
    }
  };

  const doSync = async () => {
    const targets = agents.filter((a) => selectedAgents[a.key]).map((a) => a.key);
    if (targets.length === 0) {
      setError(t.sync.noTarget);
      return;
    }
    setSyncing(true);
    setError(null);
    try {
      const res = await runSync(targets);
      setReport(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setSyncing(false);
    }
  };

  const doRemove = async (name: string) => {
    try {
      await removeFromLibrary(name);
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const fmtSize = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t.library.title}</h1>
        <p className="text-sm text-zinc-500">{t.library.subtitle}</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="p-4 text-sm text-red-600 dark:text-red-300">{error}</CardContent>
        </Card>
      )}

      {/* 技能列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.library.title}</CardTitle>
            <span className="text-xs text-zinc-400">{skills.length} items</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-zinc-500">{t.common.loading}</p>
          ) : skills.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">{t.library.empty}</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {skills.map((s) => (
                <div key={s.name} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.name}</span>
                      {!s.has_skill_md && (
                        <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                          {t.library.noSkillMd}
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{s.description}</p>
                    )}
                    <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-400">{s.path}</p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">{fmtSize(s.size_bytes)}</span>
                  <Button variant="ghost" size="sm" onClick={() => doRemove(s.name)}>
                    {t.library.remove}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 同步区域 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.sync.title}</CardTitle>
          <CardDescription>{t.sync.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <p className="text-sm text-zinc-500">No agents detected</p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">{t.sync.chooseAgents}</span>
                <button
                  onClick={toggleAll}
                  className="text-xs text-zinc-500 underline-offset-2 hover:underline"
                >
                  {allAgentsSelected ? "取消全选" : t.sync.selectAll}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {agents.map((a) => (
                  <label
                    key={a.key}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors ${
                      selectedAgents[a.key]
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                        : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Checkbox
                      checked={!!selectedAgents[a.key]}
                      onChange={() => toggleAgent(a.key)}
                    />
                    <span className="truncate">{a.display}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <Button onClick={doSync} disabled={syncing}>
                  {syncing ? t.sync.syncing : t.sync.syncNow}
                </Button>
              </div>
            </>
          )}

          {report && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">{t.sync.resultTitle}</p>
              {report.orphaned.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t.sync.orphaned}: {report.orphaned.join(", ")}
                </p>
              )}
              {report.targets.map((r) => (
                <div
                  key={r.key}
                  className="rounded-md border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="font-medium">{r.key}</span>
                    <span className="text-green-600 dark:text-green-400">
                      {t.sync.linked} {r.linked}
                    </span>
                    {r.copied > 0 && <span className="text-blue-600 dark:text-blue-400">
                      {t.sync.copied} {r.copied}
                    </span>}
                    {r.skipped_builtin > 0 && <span className="text-zinc-500">
                      {t.sync.skipped} {r.skipped_builtin}
                    </span>}
                    {r.failed > 0 && <span className="text-red-600 dark:text-red-400">
                      {t.sync.failed} {r.failed}
                    </span>}
                  </div>
                  {r.errors.length > 0 && (
                    <p className="mt-1 text-red-500">{r.errors.join("; ")}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
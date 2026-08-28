import { useCallback, useEffect, useState } from "react";
import { Eye, RefreshCw, Trash2 } from "lucide-react";
import { useI18n } from "../hooks/useI18n";
import { listLibrary, runSync, removeFromLibrary, scanAll, importFromPath, readSkillMdAt } from "../lib/tauri";
import type { LibrarySkill, SyncReport, AgentScan } from "../lib/tauri";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { SkillPreview } from "../components/SkillPreview";

export function LibraryPage({ onNavigate }: { onNavigate?: (page: "agents" | "market") => void }) {
  const { t } = useI18n();
  const [skills, setSkills] = useState<LibrarySkill[]>([]);
  const [agents, setAgents] = useState<AgentScan[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Record<string, boolean>>({});
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; content: string | null } | null>(null);
  const [showSyncPanel, setShowSyncPanel] = useState(false);

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

  // Skill selection
  const toggleSkill = (name: string) =>
    setSelectedSkills((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const allSkillsSelected = skills.length > 0 && skills.every((s) => selectedSkills.has(s.name));
  const toggleAllSkills = () => {
    if (allSkillsSelected) {
      setSelectedSkills(new Set());
    } else {
      setSelectedSkills(new Set(skills.map((s) => s.name)));
    }
  };

  // Agent selection
  const toggleAgent = (key: string) =>
    setSelectedAgents((s) => ({ ...s, [key]: !s[key] }));
  const allAgentsSelected =
    agents.length > 0 && agents.every((a) => selectedAgents[a.key]);
  const toggleAllAgents = () => {
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
      const skillList = selectedSkills.size > 0 ? Array.from(selectedSkills) : [];
      const res = await runSync(targets, skillList);
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

  // 每个本地库技能：若某已安装 agent 有同名技能，则提供"更新"（从其重新拷贝覆盖）
  const agentSource: Record<string, string> = {};
  for (const a of agents) {
    for (const sk of a.skills) {
      if (!(sk.name in agentSource)) agentSource[sk.name] = sk.path;
    }
  }

  const openPreview = async (name: string, path: string) => {
    setPreview({ name, content: null });
    try {
      const content = await readSkillMdAt(path);
      setPreview({ name, content });
    } catch (e) {
      setPreview({ name, content: String(e) });
    }
  };

  const doUpdate = async (name: string) => {
    const src = agentSource[name];
    if (!src) return;
    try {
      await importFromPath(src, name);
      await load();
      setError(null);
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
    <div className="relative flex min-h-screen flex-col">
      <div className="flex-1 space-y-6 p-6 pb-24">
        <div>
          <h1 className="text-xl font-semibold text-balance">{t.library.title}</h1>
          <p className="text-sm text-[#8a7b6c]">{t.library.subtitle}</p>
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
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={allSkillsSelected}
                  onChange={toggleAllSkills}
                  aria-label="Select all skills"
                />
                <CardTitle>{t.library.title}</CardTitle>
              </div>
              <span className="text-xs text-[#8a7e76] tabular-nums">{skills.length} {t.common.items}</span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 py-2" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="size-4 shrink-0 animate-pulse rounded bg-[#ebe3da] dark:bg-[#2e2520]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-1/4 animate-pulse rounded bg-[#ebe3da] dark:bg-[#2e2520]" />
                      <div className="h-2.5 w-2/5 animate-pulse rounded bg-[#f2ede8] dark:bg-[#26201b]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : skills.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-[#8a7e76]">{t.library.empty}</p>
                <Button variant="outline" size="sm" onClick={() => onNavigate?.("agents")}>
                  {t.library.importFromAgent}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[#e8e0d8] dark:divide-[#2e2520]">
                {skills.map((s) => {
                  const hasSource = !!agentSource[s.name];
                  const checked = selectedSkills.has(s.name);
                  return (
                    <div
                      key={s.name}
                      className={`group flex items-center gap-3 rounded-md px-1 py-2 transition-colors ${
                        checked ? "bg-[#c0543e]/5 dark:bg-[#c0543e]/10" : ""
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onChange={() => toggleSkill(s.name)}
                        aria-label={s.name}
                      />
                      <div className="min-w-0 flex-1">
                        <button
                          className="text-left"
                          onClick={() => openPreview(s.name, s.path)}
                          title={t.library.preview}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium underline-offset-2 hover:underline">{s.name}</span>
                            {!s.has_skill_md && (
                              <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                {t.library.noSkillMd}
                              </span>
                            )}
                          </div>
                        </button>
                        {s.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-[#8a7b6c]">{s.description}</p>
                        )}
                        <p className="mt-0.5 truncate font-mono text-[10px] text-[#9a8b7c]">{s.path}</p>
                      </div>
                      <span className="shrink-0 text-xs text-[#9a8b7c] tabular-nums">{fmtSize(s.size_bytes)}</span>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => openPreview(s.name, s.path)}
                          aria-label={t.library.preview}
                          title={t.library.preview}
                        >
                          <Eye className="size-3.5" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={!hasSource}
                          onClick={() => doUpdate(s.name)}
                          aria-label={t.library.update}
                          title={hasSource ? t.library.update : `${t.library.update} (${t.library.noSkillMd})`}
                        >
                          <RefreshCw className="size-3.5" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                          onClick={() => doRemove(s.name)}
                          aria-label={t.library.remove}
                          title={t.library.remove}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 同步报告（内联显示） */}
        {report && (
          <Card>
            <CardHeader>
              <CardTitle>{t.sync.resultTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {report.orphaned.length > 0 && (
                <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
                  {t.sync.orphaned}: {report.orphaned.join(", ")}
                </p>
              )}
              {report.targets.map((r) => (
                <div
                  key={r.key}
                  className="mb-2 rounded-md border border-[#e8dfd5] bg-[#faf6f1] p-3 text-xs last:mb-0 dark:border-[#2e2520] dark:bg-[#1c1714]"
                >
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="font-medium">{r.key}</span>
                    <span className="text-green-600 dark:text-green-400">
                      {t.sync.linked} {r.linked}
                    </span>
                    {r.copied > 0 && <span className="text-blue-600 dark:text-blue-400">
                      {t.sync.copied} {r.copied}
                    </span>}
                    {r.skipped_builtin > 0 && <span className="text-[#8a7b6c]">
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* 底部 sticky 同步栏（紧凑） */}
      {agents.length > 0 && (
        <div
          className="fixed bottom-0 left-60 right-0 border-t border-[#e8e0d8] bg-[#faf8f5]/95 px-6 py-3 backdrop-blur-sm animate-slide-up dark:border-[#2e2520] dark:bg-[#1c1714]/95"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8a7e76] tabular-nums">
              {selectedSkills.size > 0
                ? `${selectedSkills.size} / ${skills.length} ${t.common.items}`
                : `${skills.length} ${t.common.items}`}
              {Object.values(selectedAgents).filter(Boolean).length > 0 && (
                <span className="ml-2">
                  → {agents.filter((a) => selectedAgents[a.key]).map((a) => a.display).join(", ")}
                </span>
              )}
            </span>
            <Button
              variant="accent"
              size="sm"
              onClick={() => {
                // 打开面板时自动全选已安装 agent
                const next: Record<string, boolean> = {};
                agents.forEach((a) => (next[a.key] = true));
                setSelectedAgents(next);
                setShowSyncPanel(true);
              }}
              disabled={syncing}
            >
              {syncing ? t.sync.syncing : t.sync.syncNow}
            </Button>
          </div>
        </div>
      )}

      {/* 居中同步面板（顶层） */}
      {showSyncPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in" onClick={() => setShowSyncPanel(false)}>
          <div
            className="w-[640px] rounded-xl border border-[#e8e0d8] bg-white p-6 shadow-xl animate-pop-in dark:border-[#2e2520] dark:bg-[#231c18]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-medium">{t.sync.chooseAgents}</span>
              <Button variant="ghost" size="sm" onClick={toggleAllAgents}>
                {allAgentsSelected ? t.sync.deselectAll : t.sync.selectAll}
              </Button>
            </div>
            <div className="mb-5 flex flex-wrap gap-2.5">
              {agents.map((a) => (
                <label
                  key={a.key}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors w-[180px] justify-center ${
                    selectedAgents[a.key]
                      ? "border-[#c0543e] bg-[#c0543e]/5 dark:border-[#e07a64] dark:bg-[#c0543e]/10"
                      : "border-[#e8e0d8] hover:bg-[#f5f0eb] dark:border-[#3e342c] dark:hover:bg-[#2e2520]"
                  }`}
                >
                  <Checkbox
                    checked={!!selectedAgents[a.key]}
                    onChange={() => toggleAgent(a.key)}
                  />
                  <span>{a.display}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowSyncPanel(false)}>
                {t.common.cancel}
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  setShowSyncPanel(false);
                  doSync();
                }}
                disabled={syncing || !Object.values(selectedAgents).some(Boolean)}
              >
                {syncing ? t.sync.syncing : t.sync.syncNow}
              </Button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <SkillPreview name={preview.name} content={preview.content} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

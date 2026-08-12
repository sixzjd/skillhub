import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../hooks/useI18n";
import { listLibrary, runSync, removeFromLibrary, scanAll, importFromPath, readSkillMdAt } from "../lib/tauri";
import type { LibrarySkill, SyncReport, AgentScan } from "../lib/tauri";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { SkillPreview } from "../components/SkillPreview";

export function LibraryPage() {
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
          <h1 className="text-xl font-semibold">{t.library.title}</h1>
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
              <span className="text-xs text-[#9a8b7c]">{skills.length} items</span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-[#8a7b6c]">{t.common.loading}</p>
            ) : skills.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#9a8b7c]">{t.library.empty}</p>
            ) : (
              <div className="divide-y divide-[#e8dfd5] dark:divide-[#2e2520]">
                {skills.map((s) => {
                  const hasSource = !!agentSource[s.name];
                  const checked = selectedSkills.has(s.name);
                  return (
                    <div
                      key={s.name}
                      className={`flex items-center gap-3 py-2 transition-colors ${
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
                      <span className="shrink-0 text-xs text-[#9a8b7c]">{fmtSize(s.size_bytes)}</span>
                      <Button variant="ghost" size="sm" onClick={() => openPreview(s.name, s.path)}>
                        {t.library.preview}
                      </Button>
                      {hasSource ? (
                        <Button variant="outline" size="sm" onClick={() => doUpdate(s.name)}>
                          {t.library.update}
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" disabled title="No agent source">
                          {t.library.update}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => doRemove(s.name)}>
                        {t.library.remove}
                      </Button>
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

      {/* 底部 sticky 同步栏 */}
      {agents.length > 0 && (
        <div className="fixed bottom-0 left-52 right-0 border-t border-[#d9cfc4] bg-[#f5efe8]/95 px-6 py-3 backdrop-blur-sm dark:border-[#2e2520] dark:bg-[#231c18]/95">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-xs text-[#8a7b6c]">
                {selectedSkills.size > 0
                  ? `${selectedSkills.size} / ${skills.length} skills selected`
                  : "All skills will be synced"}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#8a7b6c]">{t.sync.chooseAgents}:</span>
                <div className="flex gap-1.5">
                  {agents.map((a) => (
                    <label
                      key={a.key}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                        selectedAgents[a.key]
                          ? "border-[#c0543e] bg-[#c0543e]/5 dark:border-[#e07a64] dark:bg-[#c0543e]/10"
                          : "border-[#d9cfc4] hover:bg-[#f0e8df] dark:border-[#3e342c] dark:hover:bg-[#2e2520]"
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
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleAllAgents}>
                {allAgentsSelected ? "取消全选" : t.sync.selectAll}
              </Button>
              <Button variant="accent" size="sm" onClick={doSync} disabled={syncing}>
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

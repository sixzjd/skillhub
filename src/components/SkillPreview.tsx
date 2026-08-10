import { useI18n } from "../hooks/useI18n";
import { Button } from "./ui/button";

/**
 * SKILL.md 预览弹层。
 * 用法：SkillPreviewDialog.open(name, getContent?) —— 由父组件传入 name，
 * 本组件负责调用 read_skill_md 拉取并渲染。
 */
export function SkillPreview({
  name,
  content,
  onClose,
}: {
  name: string;
  content: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-700/80 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-b from-amber-400 to-amber-500" />
            <h3 className="truncate text-sm font-semibold">{name}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t.common.close}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {content === null ? (
            <p className="text-sm text-zinc-500">{t.common.loading}</p>
          ) : content.startsWith("⚠") || content.startsWith("错误") ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
              {content}
            </p>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
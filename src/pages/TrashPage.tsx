import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../hooks/useI18n";
import { listTrash, restoreTrashItem, emptyTrash } from "../lib/tauri";
import type { TrashItem } from "../lib/tauri";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function TrashPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listTrash());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const doRestore = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await restoreTrashItem(id);
      showToast(t.trash.restored);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  };

  const doEmpty = async () => {
    if (!confirm(t.trash.emptyConfirm)) return;
    setEmptying(true);
    setError(null);
    try {
      await emptyTrash();
      showToast(t.trash.emptied);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setEmptying(false);
    }
  };

  const formatTime = (stamp: string) => {
    if (stamp.length < 14) return stamp;
    const y = stamp.slice(0, 4);
    const mo = stamp.slice(4, 6);
    const d = stamp.slice(6, 8);
    const h = stamp.slice(8, 10);
    const mi = stamp.slice(10, 12);
    return `${y}-${mo}-${d} ${h}:${mi}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-balance">{t.trash.title}</h1>
          <p className="text-sm text-[#8a7b6c]">{t.trash.subtitle}</p>
        </div>
        {items.length > 0 && (
          <Button variant="outline" size="sm" onClick={doEmpty} disabled={emptying}>
            {emptying ? t.common.loading : t.trash.emptyAll}
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="p-4 text-sm text-red-600 dark:text-red-300">{error}</CardContent>
        </Card>
      )}

      {toast && (
        <div className="fixed right-6 top-6 z-50 rounded-lg bg-[#231c18] px-4 py-2 text-sm text-white shadow-lg animate-slide-up dark:bg-[#fdf9f5] dark:text-[#3a2e28]">
          {toast}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.trash.title}</CardTitle>
            <span className="text-xs text-[#9a8b7c] tabular-nums">{items.length} {t.common.items}</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[#8a7b6c]">{t.common.loading}</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#9a8b7c]">{t.trash.empty}</p>
          ) : (
            <div className="divide-y divide-[#e8dfd5] dark:divide-[#2e2520]">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="rounded bg-[#ebe3da] px-1.5 text-[10px] text-[#8a7b6c] dark:bg-[#2e2520] dark:text-[#7a6b5c]">
                        {item.agent_display ?? item.origin}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-[#9a8b7c]" title={item.original_path}>
                      {item.original_path}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#9a8b7c]">
                      {t.trash.deletedAt}: {formatTime(item.deleted_at)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => doRestore(item.id)}
                    disabled={busyId === item.id}
                  >
                    {busyId === item.id ? t.common.loading : t.trash.restore}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

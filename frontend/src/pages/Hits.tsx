import { useEffect, useState } from 'react';
import { Folder, Trash2, RefreshCw, Copy } from 'lucide-react';
import { getHits, clearHits, formatBalance, formatDate } from '../lib/tauri';

export default function HitsPage() {
  const [hits, setHits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHits();
  }, []);

  const loadHits = async () => {
    setLoading(true);
    try {
      const data = await getHits();
      setHits(data);
    } catch {
      setHits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Удалить все найденные записи?')) return;
    setLoading(true);
    try {
      await clearHits();
      setHits([]);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Найденные кошельки</h1>
          <p className="text-sm text-slate-400 mt-0.5">Кошельки с балансом или активностью сохраняются здесь и в results/hits.jsonl.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadHits}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw size={16} strokeWidth={2} />
          </button>
          <button
            onClick={handleClear}
            disabled={loading || hits.length === 0}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-400 bg-slate-800 border border-slate-700 hover:bg-red-900/30 hover:text-red-400 transition disabled:opacity-50"
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {hits.length === 0 ? (
        <div className="panel p-12 text-center">
          <Folder size={48} className="mx-auto mb-4 text-slate-600" />
          <h2 className="text-lg font-medium text-slate-200">Пока ничего не найдено</h2>
          <p className="text-sm text-slate-500 mt-1">Запустите сканер на панели. Найденные с балансом кошельки появятся здесь.</p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 text-xs uppercase text-slate-500">
                <th className="pb-3 pl-4 font-medium">Адрес</th>
                <th className="pb-3 font-medium">Мнемоника</th>
                <th className="pb-3 font-medium text-right">Баланс</th>
                <th className="pb-3 font-medium text-right">Получено</th>
                <th className="pb-3 font-medium">Время</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {hits.map((h) => (
                <tr key={h.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 pl-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-slate-200 truncate max-w-xs">{h.address}</span>
                      <button
                        className="ml-1 p-1 text-slate-500 hover:text-emerald-400 hover:bg-slate-700/50 rounded"
                        title="Копировать"
                      >
                        <Copy size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 pl-2">
                    <div className="text-xs text-slate-400 break-all font-mono max-w-xs">{h.mnemonic}</div>
                  </td>
                  <td className="py-3 text-right">
                    <span className={`text-sm font-mono ${h.balance > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                      {formatBalance(h.balance)} BTC
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-xs font-mono text-slate-400">{formatBalance(h.received)} BTC</span>
                  </td>
                  <td className="py-3 pl-2">
                    <span className="text-xs text-slate-500">{formatDate(h.timestamp)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useCallback } from 'react';
import {
  Play,
  StopCircle,
  RefreshCw,
  Monitor,
  Link,
  Smartphone,
  AlertCircle,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Toggle } from '../components/Toggle';
import { formatBalance, formatUptime, formatDate } from '../lib/tauri';

type DashboardProps = {
  config: any;
  stats: any;
  running: boolean;
  onStart: () => void;
  onStop: () => void;
  onTestApi: () => void;
  loading: boolean;
};

export default function Dashboard({ config, stats, running, onStart, onStop, onTestApi, loading }: DashboardProps) {
  const handleTestApi = useCallback(() => {
    onTestApi();
  }, [onTestApi]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Поиск кошельков</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Бесконечный фоновый поиск BTC-кошельков с балансом. Новые адреса всегда — без повторов.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={running ? onStop : onStart}
            disabled={loading}
            className={`w-full lg:w-auto flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-50 ${
              running
                ? 'bg-red-600 text-white hover:bg-red-500 active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.35)]'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-glow'
            }`}
          >
            {running ? <StopCircle size={18} strokeWidth={2} /> : <Play size={18} strokeWidth={2} />}
            {running ? 'Остановить сканер' : 'Запустить сканер'}
          </button>
          <button onClick={handleTestApi} disabled={loading} className="ml-2 flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white transition disabled:opacity-50">
            <RefreshCw size={18} strokeWidth={2} />
            <span className="hidden sm:inline">Проверить API</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard title="Всего проверено" value={stats?.total_checked ?? 0} trend="+новых" />
        <StatCard title="С балансом ( hits )" value={stats?.hits ?? 0} trend="сохранены" colorClass="text-emerald-400" />
        <StatCard title="Пустых" value={stats?.empty ?? 0} colorClass="text-slate-400" />
        <StatCard title="Были активны" value={stats?.received_but_empty ?? 0} colorClass="text-amber-400" />
        <StatCard title="Проверок / час" value={Math.round(stats?.checks_per_hour ?? 0).toLocaleString()} colorClass="text-blue-400" />
        <StatCard title="В работе" value={formatUptime(stats?.uptime_seconds ?? 0)} colorClass="text-purple-400" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <div className="stat-label">Последний адрес</div>
          <div className="mt-1 flex items-center gap-2">
            <Monitor size={16} className="text-slate-500" />
            <span className="text-sm text-slate-300 break-all font-mono">{stats?.last_address ?? '—'}</span>
          </div>
          {stats?.last_mnemonic && (
            <div className="mt-3">
              <div className="stat-label">Мнемоника</div>
              <div className="mt-1 text-xs text-slate-400 break-all font-mono bg-slate-800/50 p-2 rounded border border-slate-700/50">
                {stats.last_mnemonic}
              </div>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span className="stat-label">Баланс</span>
            <span className={`ml-auto text-sm font-mono ${stats?.last_balance! > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
              {formatBalance(stats?.last_balance ?? 0)} BTC
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Обновлено: {stats ? formatDate(new Date().toISOString()) : '—'}
          </div>
        </div>

        <div className="panel p-5">
          <div className="stat-label">Нагрузка</div>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Рабочих потоков</span>
              <span className="text-sm font-mono text-slate-100">{config?.workers ?? 2}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Размер批量</span>
              <span className="text-sm font-mono text-slate-100">{config?.batch_size ?? 100}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Задержка</span>
              <span className="text-sm font-mono text-slate-100">{config?.delay_ms ?? 15000} мс</span>
            </div>
            <Toggle
              checked={config?.save_empty ?? true}
              onChange={() => {}}
              label="Сохранять пустые адреса"
            />
          </div>
        </div>

        <div className="panel p-5">
          <div className="stat-label">Статус сети</div>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-800/40">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div>
                <div className="text-sm text-slate-200 font-medium">blockchain.info</div>
                <div className="text-xs text-slate-400">API баланса адресов</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-800/40">
              <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
              <div>
                <div className="text-sm text-slate-200 font-medium">Telegram уведомления</div>
                <div className="text-xs text-slate-400">{config?.telegram_token ? 'настроено' : 'не настроено'}</div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-500">Работает в трее Windows 11 — окно можно закрыть, сканер продолжит искать в фоне.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import {
  startScanner,
  stopScanner,
  getStats,
  saveConfig,
  loadConfig,
  toggleWindow,
  testApi,
<<<<<<< HEAD
  enableAutoStart,
  disableAutoStart,
  isAutoStartEnabled,
=======
>>>>>>> origin/arena/a5a5f752-happiness-for-parents
  type AppConfig,
  type ScanStats,
  DEFAULT_CONFIG,
} from './lib/tauri';
import { Nav } from './components/Nav';
import { StatCard } from './components/StatCard';
import { Toggle } from './components/Toggle';
import { Monitor, AlertTriangle } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/Settings';
import HitsPage from './pages/Hits';

type Page = 'dashboard' | 'settings' | 'hits';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [pollTimer, setPollTimer] = useState<ReturnType<typeof setInterval> | null>(null);
<<<<<<< HEAD
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);

  useEffect(() => {
    loadConfig().then(setConfig).catch(() => {});
    isAutoStartEnabled().then(setAutoStartEnabled).catch(() => {});
=======

  useEffect(() => {
    loadConfig().then(setConfig).catch(() => {});
>>>>>>> origin/arena/a5a5f752-happiness-for-parents
  }, []);

  const pollStats = useCallback(async () => {
    try {
      const s = await getStats();
      setStats(s);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    pollStats();
    const t = setInterval(pollStats, 3000);
    setPollTimer(t);
    return () => clearInterval(t);
  }, [pollStats]);

  const setStatusText = (text: string) => {
    setStatus(text);
    setTimeout(() => setStatus(''), 3000);
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await startScanner(config);
      setStatusText(res);
    } catch (e: any) {
      setStatusText(String(e ?? 'Ошибка запуска'));
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const res = await stopScanner();
      setStatusText(res);
    } catch (e: any) {
      setStatusText(String(e ?? 'Ошибка остановки'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await saveConfig(config);
      setStatusText(res);
    } catch (e: any) {
      setStatusText(String(e ?? 'Ошибка сохранения'));
    } finally {
      setLoading(false);
    }
  };

  const handleTestApi = async () => {
    setLoading(true);
    try {
      const res = await testApi(config);
      setStatusText(res.ok ? `API: ${res.message}` : `API ошибка: ${res.message}`);
    } catch (e: any) {
      setStatusText(String(e ?? 'Ошибка проверки API'));
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  const handleEnableAutoStart = async () => {
    setLoading(true);
    try {
      const res = await enableAutoStart();
      setAutoStartEnabled(true);
      setStatusText(res);
    } catch (e: any) {
      setStatusText(String(e ?? 'Ошибка включения автозапуска'));
    } finally {
      setLoading(false);
    }
  };

  const handleDisableAutoStart = async () => {
    setLoading(true);
    try {
      const res = await disableAutoStart();
      setAutoStartEnabled(false);
      setStatusText(res);
    } catch (e: any) {
      setStatusText(String(e ?? 'Ошибка выключения автозапуска'));
    } finally {
      setLoading(false);
    }
  };

=======
>>>>>>> origin/arena/a5a5f752-happiness-for-parents
  const running = stats?.running ?? false;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Nav active={page} onNavigate={(p: string) => setPage(p as Page)} toggle={() => setNavOpen(!navOpen)} />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${navOpen ? 'pl-16 lg:pl-0' : 'pl-16 lg:pl-64'}`}>
        <header className="h-16 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className="font-semibold text-slate-200">
              {running ? 'Сканер работает в фоне' : 'Сканер остановлен'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleWindow}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Свернуть/развернуть окно"
            >
              <Monitor size={18} strokeWidth={2} />
            </button>
            {status && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200 animate-in fade-in slide-in-from-right-2 duration-300">
                <AlertTriangle size={14} className="text-amber-400" />
                <span>{status}</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
<<<<<<< HEAD
          {page === 'dashboard' && <Dashboard config={config} stats={stats} running={running} onStart={handleStart} onStop={handleStop} onTestApi={handleTestApi} loading={loading} autoStartEnabled={autoStartEnabled} onEnableAutoStart={handleEnableAutoStart} onDisableAutoStart={handleDisableAutoStart} />}
=======
          {page === 'dashboard' && <Dashboard config={config} stats={stats} running={running} onStart={handleStart} onStop={handleStop} onTestApi={handleTestApi} loading={loading} />}
>>>>>>> origin/arena/a5a5f752-happiness-for-parents
          {page === 'settings' && <SettingsPage config={config} setConfig={setConfig} onSave={handleSave} onTestApi={handleTestApi} loading={loading} />}
          {page === 'hits' && <HitsPage />}
        </main>
      </div>
    </div>
  );
}

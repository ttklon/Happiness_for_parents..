import { useCallback, useState } from 'react';
import { Save, Smartphone, Globe, Cpu, RefreshCw, LayoutGrid, Link } from 'lucide-react';
import { Toggle } from '../components/Toggle';
import { formatBalance } from '../lib/tauri';

type SettingsProps = {
  config: any;
  setConfig: (v: any) => void;
  onSave: () => void;
  onTestApi: () => void;
  loading: boolean;
};

export default function SettingsPage({ config, setConfig, onSave, onTestApi, loading }: SettingsProps) {
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestApi = useCallback(() => {
    setTestResult(null);
    onTestApi();
  }, [onTestApi]);

  const fields = [
    {
      key: 'workers',
      label: 'Количество рабочих потоков',
      desc: 'Чем больше потоков — выше нагрузка и скорость поиска',
      type: 'number',
      min: 1,
      max: 32,
      step: 1,
      icon: <Cpu size={18} strokeWidth={2} />,
    },
    {
      key: 'batch_size',
      label: 'Размер批量 (адресов за запрос)',
      desc: 'Сколько адресов проверять за один запрос к API',
      type: 'number',
      min: 10,
      max: 1000,
      step: 10,
      icon: <LayoutGrid size={18} strokeWidth={2} />,
    },
    {
      key: 'delay_ms',
      label: 'Задержка между批量 (мс)',
      desc: 'Пауза между запросами, чтобы не получить бан по IP',
      type: 'number',
      min: 0,
      max: 3600000,
      step: 1000,
      icon: <RefreshCw size={18} strokeWidth={2} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Настройки</h1>
        <p className="text-sm text-slate-400 mt-0.5">Настройте степень нагрузки и уведомления перед запуском.</p>
      </div>

      <div className="panel p-6">
        <div className="stat-label mb-4">Степень нагрузки</div>
        <div className="grid gap-4 lg:grid-cols-3">
          {fields.map((f) => (
            <div key={f.key} className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
              <div className="flex items-center gap-2 mb-1">
                {f.icon}
                <span className="text-sm font-medium text-slate-200">{f.label}</span>
              </div>
              <div className="text-xs text-slate-500 mb-2">{f.desc}</div>
              <input
                type={f.type}
                min={f.min}
                max={f.max}
                step={f.step}
                value={config[f.key] ?? ''}
                onChange={(e) => setConfig({ ...config, [f.key]: Number(e.target.value) })}
                className="input"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-800/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Toggle
                checked={config.save_empty ?? true}
                onChange={(v: boolean) => setConfig({ ...config, save_empty: v })}
              />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-200">Сохранять пустые адреса</div>
              <div className="text-xs text-slate-500">Записывать нулевые балансы в results/empty.jsonl</div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel p-6">
        <div className="stat-label mb-4">API и сеть</div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Globe size={18} strokeWidth={2} />
              <span className="text-sm font-medium text-slate-200">URL API баланса</span>
            </div>
            <div className="text-xs text-slate-500 mb-2">blockchain.info по умолчанию</div>
            <input
              type="text"
              value={config.api_url ?? ''}
              onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
              className="input"
              placeholder="https://blockchain.info/multiaddr"
            />
          </div>
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <LayoutGrid size={18} strokeWidth={2} />
              <span className="text-sm font-medium text-slate-200">Сеть</span>
            </div>
            <select
              value={config.network ?? 'mainnet'}
              onChange={(e) => setConfig({ ...config, network: e.target.value })}
              className="input"
            >
              <option value="mainnet">Mainnet</option>
              <option value="testnet">Testnet</option>
            </select>
          </div>
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4 lg:col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <Link size={18} strokeWidth={2} />
              <span className="text-sm font-medium text-slate-200">Тип адреса</span>
            </div>
            <select
              value={config.address_type ?? 'legacy'}
              onChange={(e) => setConfig({ ...config, address_type: e.target.value })}
              className="input"
            >
              <option value="legacy">Legacy (1…)</option>
              <option value="segwit">SegWit P2SH (3…)</option>
              <option value="native">Native SegWit (bc1…)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="panel p-6">
        <div className="stat-label mb-4">Telegram уведомления</div>
        <p className="text-sm text-slate-500 mb-4">При нахождении кошелька с балансом придёт сообщение в Telegram.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone size={18} strokeWidth={2} />
              <span className="text-sm font-medium text-slate-200">Токен бота (@BotFather)</span>
            </div>
            <input
              type="text"
              value={config.telegram_token ?? ''}
              onChange={(e) => setConfig({ ...config, telegram_token: e.target.value })}
              className="input"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            />
          </div>
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone size={18} strokeWidth={2} />
              <span className="text-sm font-medium text-slate-200">ID чата (@userinfobot)</span>
            </div>
            <input
              type="text"
              value={config.telegram_chat_id ?? ''}
              onChange={(e) => setConfig({ ...config, telegram_chat_id: e.target.value })}
              className="input"
              placeholder="123456789"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleTestApi}
            disabled={loading}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
              loading ? 'bg-slate-700' : 'bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <RefreshCw size={16} strokeWidth={2} />
            {loading ? 'Проверка...' : 'Проверить API'}
          </button>
          {testResult && (
            <div className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${
              testResult.startsWith('API ошибка')
                ? 'bg-red-900/30 border-red-500/30 text-red-400'
                : 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400'
            }`}>
              {testResult}
            </div>
          )}
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={onSave}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3 bg-emerald-600 text-white font-semibold hover:bg-emerald-500 active:scale-95 shadow-glow transition disabled:opacity-50"
        >
          <Save size={18} strokeWidth={2} />
          {loading ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </div>
    </div>
  );
}

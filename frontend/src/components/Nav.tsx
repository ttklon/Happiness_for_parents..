import { useState } from 'react';
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  Folder,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

const items = [
  { to: 'dashboard', label: 'Панель', icon: LayoutDashboard },
  { to: 'settings', label: 'Настройки', icon: SettingsIcon },
  { to: 'hits', label: 'Найденные', icon: Folder },
];

export function Nav({
  active,
  onNavigate,
  toggle,
}: {
  active: string;
  onNavigate: (p: string) => void;
  toggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-16 lg:w-64 transition-all duration-300 ${
        open ? '' : 'translate-x-[-100%] lg:translate-x-0'
      } bg-slate-950 border-r border-slate-800/60`}
    >
      <div className="flex items-center justify-between h-14 px-4 lg:px-6 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-sm tracking-tight text-slate-100 lg:block hidden">Happiness Scanner</span>
        </div>
        <button
          onClick={toggle}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Открыть меню"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <nav className="mt-2 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.to;
          return (
            <button
              key={item.to}
              onClick={() => {
                onNavigate(item.to);
                setOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full text-left ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              <span className="lg:block hidden">{item.label}</span>
              <ChevronRight size={14} className="text-slate-500 ml-auto lg:hidden" />
            </button>
          );
        })}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800/60">
        <div className="text-xs text-slate-500 text-center">v0.1.0</div>
      </div>
    </aside>
  );
}

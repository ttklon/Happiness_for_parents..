import { useState } from 'react';

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </div>
      {label && <span className="text-sm text-slate-300">{label}</span>}
    </div>
  );
}

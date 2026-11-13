export function StatCard({ title, value, subtitle, trend, colorClass = 'text-slate-100' }: { title: string; value: React.ReactNode; subtitle?: string; trend?: string; colorClass?: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-1">
        <span className="stat-label">{title}</span>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {trend}
          </span>
        )}
      </div>
      <div className={`stat-value ${colorClass}`}>{value}</div>
      {subtitle && <div className="stat-label text-slate-500">{subtitle}</div>}
    </div>
  );
}

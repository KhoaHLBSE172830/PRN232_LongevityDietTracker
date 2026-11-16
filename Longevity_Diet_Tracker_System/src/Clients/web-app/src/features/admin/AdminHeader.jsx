import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function AdminHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white shadow-md md:flex-row md:items-center">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-200">Khu vực quản trị</p>
          <h2 className="text-xl font-extrabold">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-slate-300">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

export const primaryBtn =
  'rounded-xl bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-800 disabled:opacity-50';

export const ghostBtn =
  'rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50';

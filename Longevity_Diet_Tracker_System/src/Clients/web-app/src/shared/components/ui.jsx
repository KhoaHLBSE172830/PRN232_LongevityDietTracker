import React from 'react';

// Thành phần giao diện dùng chung cho các màn hình dựng theo Figma (palette longevity/sage).

export function Card({ title, action, className = '', children }) {
  return (
    <section className={`rounded-2xl border border-sage-100 bg-white p-5 shadow-sm ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-base font-bold text-sage-900">{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const BANNER_TONES = {
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  demo: 'border-amber-200 bg-amber-50 text-amber-800',
  offline: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-longevity-200 bg-longevity-50 text-longevity-800',
};

/** tone: info | demo | offline | success. Dùng cho nhãn "(Minh họa)", chế độ demo, mất kết nối. */
export function Banner({ tone = 'info', className = '', children }) {
  return (
    <div role="status" className={`rounded-xl border px-4 py-2.5 text-sm ${BANNER_TONES[tone] || BANNER_TONES.info} ${className}`}>
      {children}
    </div>
  );
}

export function StatPill({ label, value, unit, className = '' }) {
  return (
    <div className={`rounded-xl bg-sage-50 px-4 py-3 ${className}`}>
      <div className="text-xs font-medium text-sage-500">{label}</div>
      <div className="mt-0.5 text-xl font-bold text-sage-900">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-sage-500">{unit}</span>}
      </div>
    </div>
  );
}

/** Vòng tiến độ SVG. value/max -> phần trăm (giới hạn 0..100). */
export function ProgressRing({ value = 0, max = 100, size = 120, stroke = 10, className = '', children }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-sage-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="stroke-longevity-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

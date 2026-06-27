import React from 'react';

// Skeleton premium que imita el layout de una sección del dashboard
// (header + fila de KPIs + bloques de contenido) mientras carga su chunk lazy.
const Shimmer = ({ className = '' }) => (
  <div className={`relative overflow-hidden rounded-xl bg-slate-100 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
  </div>
);

const SectionSkeleton = () => {
  return (
    <div className="h-full w-full overflow-hidden px-6 py-6" data-testid="section-skeleton">
      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shimmer className="w-10 h-10 !rounded-lg" />
          <div className="space-y-2">
            <Shimmer className="h-5 w-48" />
            <Shimmer className="h-3 w-32 bg-slate-50" />
          </div>
        </div>
        <Shimmer className="h-9 w-32 !rounded-full" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Shimmer className="h-3 w-20 bg-slate-50" />
            <Shimmer className="h-7 w-24" />
            <Shimmer className="h-2 w-full bg-slate-50" />
          </div>
        ))}
      </div>

      {/* Main content blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-6 space-y-4">
          <Shimmer className="h-4 w-40" />
          <Shimmer className="h-48 w-full" />
          <div className="flex gap-3">
            <Shimmer className="h-3 w-24 bg-slate-50" />
            <Shimmer className="h-3 w-24 bg-slate-50" />
            <Shimmer className="h-3 w-24 bg-slate-50" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 space-y-3">
          <Shimmer className="h-4 w-32" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Shimmer key={i} className="h-9 w-full bg-slate-50" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionSkeleton;

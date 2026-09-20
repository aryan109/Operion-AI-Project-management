export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse pb-12">
      {/* Top Banner Skeleton */}
      <div className="rounded-3xl p-6 sm:p-8 bg-slate-900/60 border border-slate-800/80 skeleton-shimmer">
        <div className="w-32 h-5 rounded-full bg-slate-800 mb-4" />
        <div className="w-2/3 max-w-md h-8 sm:h-10 rounded-xl bg-slate-800 mb-3" />
        <div className="w-full max-w-xl h-4 rounded-lg bg-slate-800/80" />
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3 skeleton-shimmer">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="w-16 h-3 rounded bg-slate-800" />
              <div className="w-10 h-6 rounded bg-slate-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3 skeleton-shimmer">
          <div className="w-48 h-5 rounded bg-slate-800 mb-4" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/50 flex items-center justify-between">
              <div className="space-y-1.5 flex-1">
                <div className="w-3/4 max-w-xs h-4 rounded bg-slate-800" />
                <div className="w-1/3 h-3 rounded bg-slate-800/70" />
              </div>
              <div className="w-16 h-5 rounded bg-slate-800 shrink-0" />
            </div>
          ))}
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3 skeleton-shimmer">
          <div className="w-36 h-5 rounded bg-slate-800 mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="py-2.5 flex items-start gap-3 border-b border-slate-800/40">
              <div className="w-2 h-2 rounded-full bg-slate-800 mt-1.5 shrink-0" />
              <div className="space-y-1 flex-1">
                <div className="w-full h-3.5 rounded bg-slate-800" />
                <div className="w-16 h-2.5 rounded bg-slate-800/70" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

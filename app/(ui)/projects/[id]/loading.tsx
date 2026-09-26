export default function ProjectCockpitLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-pulse">
      {/* Project Header Banner Skeleton */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-800 skeleton-shimmer space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-20 h-5 rounded-md bg-slate-800" />
              <div className="w-16 h-5 rounded-md bg-slate-800" />
              <div className="w-24 h-5 rounded-md bg-slate-800" />
            </div>
            <div className="w-2/3 max-w-md h-8 sm:h-9 rounded-xl bg-slate-800" />
            <div className="w-full max-w-2xl h-4 rounded-lg bg-slate-800/80" />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-24 h-20 rounded-2xl bg-slate-800/80" />
            <div className="w-24 h-20 rounded-2xl bg-slate-800/80" />
          </div>
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="flex items-center gap-2 pt-6 border-t border-slate-800/60">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-28 h-9 rounded-xl bg-slate-800/70 shrink-0" />
          ))}
        </div>
      </div>

      {/* Sub-toolbar Skeleton */}
      <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-900/60 border border-slate-800 skeleton-shimmer">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-20 h-8 rounded-xl bg-slate-800" />
          ))}
        </div>
        <div className="w-24 h-8 rounded-xl bg-slate-800" />
      </div>

      {/* View Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 skeleton-shimmer">
        {[1, 2, 3, 4, 5].map((col) => (
          <div
            key={col}
            className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-3 min-h-[380px]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-20 h-4 rounded bg-slate-800" />
              <div className="w-6 h-4 rounded bg-slate-800" />
            </div>
            {[1, 2, 3].map((task) => (
              <div
                key={task}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/50 space-y-2"
              >
                <div className="w-full h-4 rounded bg-slate-800" />
                <div className="w-2/3 h-3 rounded bg-slate-800/60" />
                <div className="flex items-center justify-between pt-2">
                  <div className="w-12 h-3.5 rounded bg-slate-800" />
                  <div className="w-14 h-3.5 rounded bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

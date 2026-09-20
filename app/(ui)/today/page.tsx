import { getDefaultContext } from "@/lib/api/helper";
import * as taskService from "@/lib/domain/task.service";
import { Calendar, Clock, AlertTriangle, Flame, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const ctx = await getDefaultContext();
  const res = await taskService.getTodayView(ctx);
  const data = res.ok ? res.data : { dueToday: [], overdue: [], highPriority: [], blocked: [], totalPending: 0 };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
          <Calendar className="w-6 h-6 text-cyan-400" />
          Today's Operational Cockpit
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Laser-focused view on deadlines, blockers, and high-velocity deliverables.
        </p>
      </div>

      {/* Metrics Row (2 cols on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold">Due Today</p>
          <p className="text-xl sm:text-2xl font-bold text-cyan-400 mt-1">{data.dueToday.length}</p>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold">Overdue</p>
          <p className="text-xl sm:text-2xl font-bold text-rose-400 mt-1">{data.overdue.length}</p>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold">Blocked</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">{data.blocked.length}</p>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold">Total Active</p>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1">{data.totalPending}</p>
        </div>
      </div>

      {/* 1. DUE TODAY */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Deliverables Due Today ({data.dueToday.length})
        </h2>
        {data.dueToday.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No tasks due today.</p>
        ) : (
          <div className="space-y-2">
            {data.dueToday.map((t: any) => (
              <div key={t.id} className="p-3 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                  <p className="text-xs text-slate-400 truncate">{t.projectName}</p>
                </div>
                <Link
                  href={`/projects/${t.projectId}`}
                  prefetch={true}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold shrink-0"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. OVERDUE ITEMS */}
      {data.overdue.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-rose-900/50 bg-rose-950/10 space-y-4">
          <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Overdue Tasks ({data.overdue.length})
          </h2>
          <div className="space-y-2">
            {data.overdue.map((t: any) => (
              <div key={t.id} className="p-3.5 rounded-xl bg-slate-900 border border-rose-900/40 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  <p className="text-xs text-rose-400 font-mono">Due on {t.dueDate} ({t.projectName})</p>
                </div>
                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                  {t.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. HIGH PRIORITY TASKS */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          Urgent & High Priority Tasks ({data.highPriority.length})
        </h2>
        {data.highPriority.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No urgent tasks.</p>
        ) : (
          <div className="space-y-2">
            {data.highPriority.map((t: any) => (
              <div key={t.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  <p className="text-xs text-slate-400">{t.projectName}</p>
                </div>
                <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  {t.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

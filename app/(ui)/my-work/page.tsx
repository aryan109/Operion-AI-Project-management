import { getDefaultContext } from "@/lib/api/helper";
import * as taskService from "@/lib/domain/task.service";
import { CheckSquare, Clock, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
  const ctx = await getDefaultContext();
  const res = await taskService.getMyWork(ctx);
  const work = res.ok ? res.data : { today: [], upcoming: [], overdue: [], blocked: [], recentlyCompleted: [] };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
          <CheckSquare className="w-6 h-6 text-indigo-400" />
          My Work
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Your personal execution center across all workspace projects.
        </p>
      </div>

      {/* 1. OVERDUE ALERT */}
      {work.overdue.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30">
          <h2 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4" />
            Overdue Deliverables ({work.overdue.length})
          </h2>
          <div className="space-y-2">
            {work.overdue.map((t: any) => (
              <div key={t.id} className="p-3 rounded-xl bg-slate-900 border border-rose-900/50 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  <p className="text-xs text-slate-400">{t.projectName} • Due {t.dueDate}</p>
                </div>
                <Link
                  href={`/projects/${t.projectId}`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  View Project
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. TODAY'S COMMITTED DELIVERABLES */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Due Today ({work.today.length})
        </h2>
        {work.today.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No tasks due today. You are caught up!</p>
        ) : (
          <div className="space-y-2">
            {work.today.map((t: any) => (
              <div key={t.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  <p className="text-xs text-slate-400">{t.projectName}</p>
                </div>
                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  {t.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. BLOCKED TASKS */}
      {work.blocked.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Blocked Work Items ({work.blocked.length})
          </h2>
          <div className="space-y-2">
            {work.blocked.map((t: any) => (
              <div key={t.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  <p className="text-xs text-slate-400">{t.projectName}</p>
                </div>
                <span className="text-xs uppercase font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Blocked
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. UPCOMING DELIVERABLES */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-indigo-400" />
          Upcoming Tasks ({work.upcoming.length})
        </h2>
        {work.upcoming.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No upcoming tasks scheduled.</p>
        ) : (
          <div className="space-y-2">
            {work.upcoming.map((t: any) => (
              <div key={t.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{t.title}</p>
                  <p className="text-xs text-slate-400">{t.projectName} • {t.dueDate ? `Due ${t.dueDate}` : "No due date"}</p>
                </div>
                <span className="text-xs font-semibold capitalize text-slate-400">
                  {t.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. RECENTLY COMPLETED */}
      {work.recentlyCompleted.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Recently Completed ({work.recentlyCompleted.length})
          </h2>
          <div className="space-y-2">
            {work.recentlyCompleted.map((t: any) => (
              <div key={t.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-400 line-through">{t.title}</p>
                <span className="text-[10px] text-emerald-400 font-semibold">Done</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

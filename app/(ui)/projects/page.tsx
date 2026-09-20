import Link from "next/link";
import { getDefaultContext } from "@/lib/api/helper";
import * as projectService from "@/lib/domain/project.service";
import {
  FolderKanban,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Filter,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; health?: string }>;
}) {
  const ctx = await getDefaultContext();
  const params = await searchParams;

  const res = await projectService.getPortfolioAggregate(ctx);
  let projects = res.ok ? res.data : [];

  if (params.status) {
    projects = projects.filter((p: any) => p.status === params.status);
  }
  if (params.health) {
    projects = projects.filter((p: any) => p.health === params.health);
  }

  const statuses = [
    { label: "All Status", value: "" },
    { label: "Active", value: "active" },
    { label: "Planning", value: "planning" },
    { label: "On Hold", value: "on_hold" },
    { label: "Completed", value: "completed" },
  ];

  const healthFilters = [
    { label: "All Health", value: "" },
    { label: "On Track", value: "on_track" },
    { label: "At Risk", value: "at_risk" },
    { label: "Blocked", value: "blocked" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-indigo-400" />
            Projects Portfolio
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time status, health diagnostics, and deliverables across all initiatives.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400 px-2 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            {statuses.map((s) => (
              <Link
                key={s.label}
                href={`/projects?${s.value ? `status=${s.value}` : ""}${params.health ? `&health=${params.health}` : ""}`}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  (params.status || "") === s.value
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400 px-2 flex items-center gap-1">Health:</span>
            {healthFilters.map((h) => (
              <Link
                key={h.label}
                href={`/projects?${params.status ? `status=${params.status}&` : ""}${h.value ? `health=${h.value}` : ""}`}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  (params.health || "") === h.value
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {h.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
          <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-white">No projects match the selected filters</p>
          <p className="text-xs text-slate-400 mt-1">Create a new project or reset your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p: any) => {
            const healthBadge =
              p.health === "blocked"
                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                : p.health === "at_risk"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="glass-card p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${healthBadge}`}>
                      {p.health?.replace("_", " ")}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 capitalize px-2 py-0.5 rounded bg-slate-800/80">
                      {p.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {p.objective || p.description || "No strategic objective stated."}
                  </p>

                  {/* Progress Bar */}
                  <div className="mt-5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-white">{p.progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${p.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Task Status Breakdown */}
                  <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800/60 text-center text-xs">
                    <div className="p-1.5 rounded-lg bg-slate-900/60">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Todo</p>
                      <p className="font-bold text-slate-200 mt-0.5">{p.taskCounts?.todo || 0}</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900/60">
                      <p className="text-[10px] text-indigo-400 uppercase font-semibold">Active</p>
                      <p className="font-bold text-indigo-300 mt-0.5">{p.taskCounts?.in_progress || 0}</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900/60">
                      <p className="text-[10px] text-rose-400 uppercase font-semibold">Blocked</p>
                      <p className="font-bold text-rose-300 mt-0.5">{p.taskCounts?.blocked || 0}</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900/60">
                      <p className="text-[10px] text-emerald-400 uppercase font-semibold">Done</p>
                      <p className="font-bold text-emerald-300 mt-0.5">{p.taskCounts?.done || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-400">
                    {p.totalTasks} total tasks
                  </span>
                  {p.targetDate ? (
                    <span className="flex items-center gap-1 font-mono text-slate-400">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      {p.targetDate}
                    </span>
                  ) : (
                    <span>No target date</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

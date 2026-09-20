import Link from "next/link";
import { getDefaultContext } from "@/lib/api/helper";
import * as projectService from "@/lib/domain/project.service";
import * as taskService from "@/lib/domain/task.service";
import * as activityService from "@/lib/domain/activity.service";
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const ctx = await getDefaultContext();

  const [portfolioRes, todayRes, activityRes] = await Promise.all([
    projectService.getPortfolioAggregate(ctx),
    taskService.getTodayView(ctx),
    activityService.listActivity(ctx, { limit: 8 }),
  ]);

  const projects = portfolioRes.ok ? portfolioRes.data : [];
  const today = todayRes.ok ? todayRes.data : { dueToday: [], overdue: [], blocked: [], highPriority: [] };
  const activities = activityRes.ok ? activityRes.data : [];

  const onTrackCount = projects.filter((p) => p.health === "on_track").length;
  const atRiskCount = projects.filter((p) => p.health === "at_risk").length;
  const blockedCount = projects.filter((p) => p.health === "blocked").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-indigo-950/60 via-[#0e1424] to-[#07090e] border border-indigo-500/20 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            AI-Native Project Operating System
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl mb-3">
            Welcome to <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">Operion</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            The UI gives you visibility into every deliverable. Connect your AI agents to our MCP Server to autonomously plan, execute, and steer projects.
          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-600/10 to-transparent pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Projects</p>
            <p className="text-2xl font-bold text-white mt-0.5">{projects.length}</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">On Track</p>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">{onTrackCount}</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">At Risk</p>
            <p className="text-2xl font-bold text-amber-400 mt-0.5">{atRiskCount}</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Blockers</p>
            <p className="text-2xl font-bold text-rose-400 mt-0.5">{blockedCount + today.blocked.length}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Projects & Today's Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active Projects Portfolio */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Active Project Portfolio
            </h2>
            <Link
              href="/projects"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
            >
              View all ({projects.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.slice(0, 6).map((proj: any) => {
              const healthColors = {
                on_track: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                at_risk: "bg-amber-500/15 text-amber-400 border-amber-500/30",
                blocked: "bg-rose-500/15 text-rose-400 border-rose-500/30",
              };
              const healthBadge = healthColors[proj.health as keyof typeof healthColors] || healthColors.on_track;

              return (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  className="glass-card p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md border ${healthBadge}`}>
                        {proj.health?.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {proj.progressPercent}%
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-white group-hover:text-indigo-300 transition line-clamp-1">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {proj.objective || proj.description || "No objective set."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <span>{proj.totalTasks} tasks</span>
                    {proj.targetDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {proj.targetDate}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Today's High Priority & Blockers */}
        <div className="space-y-6">
          {/* Urgent Blockers Alert */}
          {today.blocked.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 shadow-lg shadow-rose-950/20">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Immediate Blockers ({today.blocked.length})</span>
              </div>
              <div className="space-y-2">
                {today.blocked.slice(0, 4).map((t: any) => (
                  <div key={t.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                    <p className="font-semibold text-white line-clamp-1">{t.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t.projectName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Priorities */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Today's Focus
              </h3>
              <Link href="/today" className="text-xs text-cyan-400 hover:underline">
                View all
              </Link>
            </div>

            {today.dueToday.length === 0 && today.highPriority.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                All clear! No urgent tasks due today.
              </p>
            ) : (
              <div className="space-y-2">
                {[...today.dueToday, ...today.highPriority].slice(0, 5).map((t: any) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium text-white truncate">{t.title}</p>
                      <p className="text-[10px] text-slate-400">{t.projectName}</p>
                    </div>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity Audit */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-purple-400" />
              Activity Audit Stream
            </h3>
            <div className="space-y-3">
              {activities.slice(0, 5).map((act: any) => (
                <div key={act.id} className="text-xs flex items-start gap-2 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-slate-200 font-medium capitalize">{act.action} </span>
                    <span>{act.entityType}</span>
                    <p className="text-[10px] text-slate-400">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Layers,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Check,
  Plus,
  GitMerge,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface OverviewViewProps {
  project: any;
  milestones: any[];
  workstreams: any[];
  tasks: any[];
  dependencies: any[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onNavigateToTab: (tabId: string) => void;
}

export function OverviewView({
  project,
  milestones,
  workstreams,
  tasks,
  dependencies,
  onStatusChange,
  onNavigateToTab,
}: OverviewViewProps) {
  // Track which milestone card is expanded in overview
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(
    milestones[0]?.id || null
  );

  // Track which track card is expanded in overview
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  const milestoneMap = new Map(milestones.map((m) => [m.id, m]));
  const workstreamMap = new Map(workstreams.map((w) => [w.id, w]));

  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const blockedTasks = tasks.filter((t) => t.status === "blocked");

  const healthColors: Record<string, string> = {
    on_track: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    at_risk: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    blocked: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };

  const milestoneStatusColors: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    active: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    upcoming: "bg-slate-800 text-slate-400 border-slate-700",
    at_risk: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };

  const priorityColors: Record<string, string> = {
    urgent: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    high: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    medium: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    low: "bg-slate-700/50 text-slate-400 border-slate-700",
  };

  return (
    <div className="space-y-6">
      {/* 1. Project High-Level Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Overall Progress</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{progressPercent}%</p>
          <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Tasks</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">
            {completedTasks}/{tasks.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {tasks.filter((t) => t.status === "in_progress").length} in flight
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Milestones / Gates</span>
            <Target className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{milestones.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {milestones.filter((m) => m.status === "completed").length} completed
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Strategic Tracks</span>
            <Layers className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{workstreams.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {dependencies.length} active dependencies
          </p>
        </div>
      </div>

      {/* 2. Interactive Milestone Phase Progression Deck */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              Milestone Phase Progression
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any milestone card to inspect the tasks assigned to that phase
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab("milestones")}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Manage Milestones <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Milestone Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {milestones.map((ms) => {
            const msTasks = tasks.filter((t) => t.milestoneId === ms.id);
            const msCompleted = msTasks.filter((t) => t.status === "done").length;
            const msPercent = msTasks.length > 0 ? Math.round((msCompleted / msTasks.length) * 100) : 0;
            const isSelected = expandedMilestoneId === ms.id;

            return (
              <div
                key={ms.id}
                onClick={() => setExpandedMilestoneId(isSelected ? null : ms.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer select-none text-left flex flex-col justify-between ${
                  isSelected
                    ? "bg-indigo-950/30 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        milestoneStatusColors[ms.status] || milestoneStatusColors.upcoming
                      }`}
                    >
                      {ms.status}
                    </span>
                    {ms.targetDate && (
                      <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ms.targetDate}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                    {ms.name}
                  </h4>
                  {ms.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{ms.description}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400 font-medium">Deliverables</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {msCompleted}/{msTasks.length} ({msPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${msPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-indigo-400 mt-2 flex items-center gap-1">
                    {isSelected ? "Click to collapse" : "Click to view tasks"}
                    {isSelected ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Milestone Tasks Drawer */}
        {expandedMilestoneId && (() => {
          const selectedMs = milestoneMap.get(expandedMilestoneId);
          if (!selectedMs) return null;
          const msTasks = tasks.filter((t) => t.milestoneId === selectedMs.id);

          return (
            <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-indigo-500/30 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-sm font-bold text-white">
                    Tasks under <span className="text-indigo-300">"{selectedMs.name}"</span>
                  </h4>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {msTasks.length} tasks
                  </span>
                </div>
                <button
                  onClick={() => onNavigateToTab("tasks")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  Open in Task List <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {msTasks.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  No deliverables scheduled for this milestone yet. Go to Tasks tab to assign work packages.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                  {msTasks.map((t) => {
                    const isDone = t.status === "done";
                    const ws = t.workstreamId ? workstreamMap.get(t.workstreamId) : null;

                    return (
                      <div
                        key={t.id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button
                            onClick={() => onStatusChange(t.id, isDone ? "todo" : "done")}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                              isDone
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-slate-600 hover:border-indigo-400 text-transparent"
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                          <span
                            className={`font-medium truncate ${
                              isDone ? "line-through text-slate-500" : "text-slate-200"
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {ws && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              🛤️ {ws.name}
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              priorityColors[t.priority] || priorityColors.medium
                            }`}
                          >
                            {t.priority}
                          </span>
                          <span className="capitalize text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            {t.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* 3. Interactive Strategic Tracks (Workstreams) Deck */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Strategic Tracks (Workstreams)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any track to view its deliverables organized by Milestone
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab("tracks")}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            All Tracks <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Tracks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {workstreams.map((ws) => {
            const wsTasks = tasks.filter((t) => t.workstreamId === ws.id);
            const wsDone = wsTasks.filter((t) => t.status === "done").length;
            const wsPercent = wsTasks.length > 0 ? Math.round((wsDone / wsTasks.length) * 100) : 0;
            const isExpanded = expandedTrackId === ws.id;

            // Find which milestones this track spans
            const distinctMilestoneIds = Array.from(
              new Set(wsTasks.map((t) => t.milestoneId).filter(Boolean))
            );

            return (
              <div
                key={ws.id}
                onClick={() => setExpandedTrackId(isExpanded ? null : ws.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer select-none text-left flex flex-col justify-between ${
                  isExpanded
                    ? "bg-purple-950/30 border-purple-500/80 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/50"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      Track
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {wsDone}/{wsTasks.length} Done
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{ws.name}</h4>
                  
                  {/* Spanned Milestones Preview */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {distinctMilestoneIds.map((mId) => {
                      const m = milestoneMap.get(mId);
                      return m ? (
                        <span
                          key={mId}
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700"
                        >
                          🎯 {m.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-400"
                      style={{ width: `${wsPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-purple-400 flex items-center gap-1">
                    {isExpanded ? "Click to collapse" : "Click to view tasks by milestone"}
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Track Tasks Grouped by Milestone Drawer */}
        {expandedTrackId && (() => {
          const selectedWs = workstreamMap.get(expandedTrackId);
          if (!selectedWs) return null;
          const wsTasks = tasks.filter((t) => t.workstreamId === selectedWs.id);

          // Group by milestone
          const trackMilestoneGroups = milestones.map((m) => ({
            milestone: m,
            tasks: wsTasks.filter((t) => t.milestoneId === m.id),
          })).filter((g) => g.tasks.length > 0);

          const unassignedTrackTasks = wsTasks.filter(
            (t) => !t.milestoneId || !milestoneMap.has(t.milestoneId)
          );

          return (
            <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-purple-500/30 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-bold text-white">
                    Deliverables in Track <span className="text-purple-300">"{selectedWs.name}"</span> (Grouped by Milestone)
                  </h4>
                </div>
              </div>

              {wsTasks.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  No deliverables associated with this track yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {trackMilestoneGroups.map(({ milestone, tasks: mTasks }) => (
                    <div
                      key={milestone.id}
                      className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden"
                    >
                      <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" />
                          🎯 {milestone.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {mTasks.filter((t) => t.status === "done").length}/{mTasks.length} Done
                        </span>
                      </div>
                      <div className="divide-y divide-slate-800/50">
                        {mTasks.map((t) => {
                          const isDone = t.status === "done";
                          return (
                            <div
                              key={t.id}
                              className="p-2.5 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  onClick={() => onStatusChange(t.id, isDone ? "todo" : "done")}
                                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition shrink-0 ${
                                    isDone
                                      ? "bg-emerald-500 border-emerald-500 text-white"
                                      : "border-slate-600 text-transparent"
                                  }`}
                                >
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </button>
                                <span
                                  className={`truncate ${
                                    isDone ? "line-through text-slate-500" : "text-slate-200"
                                  }`}
                                >
                                  {t.title}
                                </span>
                              </div>
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                  priorityColors[t.priority] || priorityColors.medium
                                }`}
                              >
                                {t.priority}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {unassignedTrackTasks.length > 0 && (
                    <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                      <div className="p-2.5 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-400">
                        Unscheduled / No Milestone
                      </div>
                      <div className="divide-y divide-slate-800/50">
                        {unassignedTrackTasks.map((t) => (
                          <div
                            key={t.id}
                            className="p-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="text-slate-300">{t.title}</span>
                            <span className="capitalize text-[10px] text-slate-500">
                              {t.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* 4. Strategic Objectives & Health Diagnostic Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Project Strategic Objective
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {project.objective || project.description || "No formal objective stated in charter."}
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Health Diagnostic & Telemetry
            </h4>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                healthColors[project.health] || healthColors.on_track
              }`}
            >
              {project.health?.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {project.healthReason ||
              "Telemetry indicates positive task completion velocity without deadlocks or unmitigated blockers."}
          </p>
          {blockedTasks.length > 0 && (
            <div className="pt-2 border-t border-slate-800/60 text-xs text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{blockedTasks.length} task(s) currently marked as blocked.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

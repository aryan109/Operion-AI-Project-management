"use client";

import { useState } from "react";
import {
  GitMerge,
  ArrowRight,
  Target,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Clock,
  Filter,
} from "lucide-react";

interface DependenciesViewProps {
  dependencies: any[];
  tasks: any[];
  milestones: any[];
  workstreams: any[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onCreateDependency: (blockingTaskId: string, blockedTaskId: string) => Promise<void>;
  onRemoveDependency: (dependencyId: string) => Promise<void>;
}

export function DependenciesView({
  dependencies,
  tasks,
  milestones,
  workstreams,
  onStatusChange,
  onCreateDependency,
  onRemoveDependency,
}: DependenciesViewProps) {
  const [filterMode, setFilterMode] = useState<"all" | "cross_milestone" | "active_blockers">("all");
  const [isLinking, setIsLinking] = useState(false);
  const [selectedBlockingId, setSelectedBlockingId] = useState("");
  const [selectedBlockedId, setSelectedBlockedId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const milestoneMap = new Map(milestones.map((m) => [m.id, m]));
  const workstreamMap = new Map(workstreams.map((w) => [w.id, w]));

  const priorityColors: Record<string, string> = {
    urgent: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    high: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    medium: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    low: "bg-slate-700/50 text-slate-400 border-slate-700",
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!selectedBlockingId || !selectedBlockedId) {
      setErrorMsg("Please select both a blocking task and a blocked task.");
      return;
    }
    if (selectedBlockingId === selectedBlockedId) {
      setErrorMsg("A deliverable cannot depend on itself.");
      return;
    }

    try {
      await onCreateDependency(selectedBlockingId, selectedBlockedId);
      setSelectedBlockingId("");
      setSelectedBlockedId("");
      setIsLinking(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to link dependency.");
    }
  };

  // Enhance dependencies with task and milestone data
  const enhancedDeps = dependencies.map((dep) => {
    const blockerTask = taskMap.get(dep.blockingTaskId);
    const blockedTask = taskMap.get(dep.blockedTaskId);

    const blockerMilestone = blockerTask?.milestoneId
      ? milestoneMap.get(blockerTask.milestoneId)
      : null;
    const blockedMilestone = blockedTask?.milestoneId
      ? milestoneMap.get(blockedTask.milestoneId)
      : null;

    const blockerWorkstream = blockerTask?.workstreamId
      ? workstreamMap.get(blockerTask.workstreamId)
      : null;
    const blockedWorkstream = blockedTask?.workstreamId
      ? workstreamMap.get(blockedTask.workstreamId)
      : null;

    const isResolved = blockerTask?.status === "done";
    const isCrossMilestone =
      blockerTask?.milestoneId &&
      blockedTask?.milestoneId &&
      blockerTask.milestoneId !== blockedTask.milestoneId;

    return {
      id: dep.id,
      blockerTask,
      blockedTask,
      blockerMilestone,
      blockedMilestone,
      blockerWorkstream,
      blockedWorkstream,
      isResolved,
      isCrossMilestone,
    };
  });

  const filteredDeps = enhancedDeps.filter((d) => {
    if (filterMode === "cross_milestone") return d.isCrossMilestone;
    if (filterMode === "active_blockers") return !d.isResolved;
    return true;
  });

  const activeBlockersCount = enhancedDeps.filter((d) => !d.isResolved).length;
  const crossMilestoneCount = enhancedDeps.filter((d) => d.isCrossMilestone).length;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-cyan-400" />
            Dependency Network & Critical Path Handoffs
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-milestone deliverables handoffs and precedence constraints
          </p>
        </div>

        <button
          onClick={() => setIsLinking(!isLinking)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Link Dependency
        </button>
      </div>

      {/* Link New Dependency Form */}
      {isLinking && (
        <form
          onSubmit={handleCreate}
          className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 space-y-3 animate-in fade-in duration-150"
        >
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Define Deliverable Precedence (FS: Finish-to-Start)
          </h4>

          {errorMsg && (
            <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Blocking Task (Must Finish First)
              </label>
              <select
                value={selectedBlockingId}
                onChange={(e) => setSelectedBlockingId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select Prerequisite Task...</option>
                {tasks.map((t) => {
                  const m = t.milestoneId ? milestoneMap.get(t.milestoneId) : null;
                  return (
                    <option key={t.id} value={t.id}>
                      [{m ? m.name : "No Milestone"}] {t.title} ({t.status})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Blocked Task (Cannot Start Until Blocker Completes)
              </label>
              <select
                value={selectedBlockedId}
                onChange={(e) => setSelectedBlockedId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select Dependent Task...</option>
                {tasks.map((t) => {
                  const m = t.milestoneId ? milestoneMap.get(t.milestoneId) : null;
                  return (
                    <option key={t.id} value={t.id}>
                      [{m ? m.name : "No Milestone"}] {t.title} ({t.status})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsLinking(false)}
              className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              Confirm Dependency Link
            </button>
          </div>
        </form>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
          {[
            { id: "all", label: `All (${dependencies.length})` },
            { id: "cross_milestone", label: `Cross-Milestone Handoffs (${crossMilestoneCount})` },
            { id: "active_blockers", label: `Active Blockers (${activeBlockersCount})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id as any)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                filterMode === f.id
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dependencies Cards List */}
      <div className="space-y-3">
        {filteredDeps.length === 0 ? (
          <div className="glass-panel p-8 text-center text-slate-400 text-sm rounded-2xl border border-slate-800">
            {dependencies.length === 0
              ? "No cross-task dependencies linked yet. Click 'Link Dependency' to create one."
              : "No dependencies match the active filter."}
          </div>
        ) : (
          filteredDeps.map((dep) => {
            const blocker = dep.blockerTask;
            const blocked = dep.blockedTask;

            return (
              <div
                key={dep.id}
                className={`p-4 rounded-2xl border transition-all ${
                  dep.isResolved
                    ? "bg-slate-900/40 border-slate-800/80 opacity-80"
                    : "bg-slate-900/80 border-slate-800 shadow-md"
                }`}
              >
                {/* Header classification badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {dep.isCrossMilestone ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Cross-Milestone Phase Handoff
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        Intra-Milestone Dependency
                      </span>
                    )}

                    {dep.isResolved ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Resolved
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        Active Blocker
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onRemoveDependency(dep.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                    title="Remove dependency link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Precedence Link Layout: Blocker -> Blocks -> Blocked */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3">
                  {/* Blocker Card */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold uppercase text-slate-400">Prerequisite</span>
                      <span
                        className={`capitalize font-semibold px-1.5 py-0.2 rounded ${
                          blocker?.status === "done" ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {blocker?.status || "Unknown"}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {blocker?.title || `Task ${dep.id.slice(0, 8)}`}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {dep.blockerMilestone ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                          🎯 {dep.blockerMilestone.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">No Milestone</span>
                      )}

                      {dep.blockerWorkstream && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          🛤️ {dep.blockerWorkstream.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Center Arrow */}
                  <div className="flex items-center justify-center p-1 text-slate-500">
                    <div className="flex md:flex-col items-center gap-1 font-mono text-[10px] text-cyan-400 font-bold">
                      <span className="hidden md:inline">BLOCKS</span>
                      <ArrowRight className="w-5 h-5 text-cyan-400 stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Blocked Card */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold uppercase text-slate-400">Dependent Deliverable</span>
                      <span className="capitalize font-semibold text-slate-300">
                        {blocked?.status || "Unknown"}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {blocked?.title || "Unknown Deliverable"}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {dep.blockedMilestone ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                          🎯 {dep.blockedMilestone.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">No Milestone</span>
                      )}

                      {dep.blockedWorkstream && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          🛤️ {dep.blockedWorkstream.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

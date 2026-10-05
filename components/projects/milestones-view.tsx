"use client";

import { useState } from "react";
import {
  Target,
  Clock,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface MilestonesViewProps {
  milestones: any[];
  workstreams: any[];
  tasks: any[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onCreateTask: (data: {
    title: string;
    milestoneId: string;
    workstreamId?: string;
    priority?: string;
    dueDate?: string;
  }) => Promise<void>;
}

export function MilestonesView({
  milestones,
  workstreams,
  tasks,
  onStatusChange,
  onCreateTask,
}: MilestonesViewProps) {
  // Expanded milestone cards: default all open
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({
    [milestones[0]?.id || ""]: true,
  });

  // Adding task inside milestone state
  const [activeAddMilestoneId, setActiveAddMilestoneId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newWorkstreamId, setNewWorkstreamId] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDueDate, setNewDueDate] = useState("");

  const workstreamMap = new Map(workstreams.map((w) => [w.id, w]));

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

  const toggleMilestone = (id: string) => {
    setExpandedMilestones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveMilestoneTask = async (milestoneId: string) => {
    if (!newTitle.trim()) return;
    await onCreateTask({
      title: newTitle.trim(),
      milestoneId,
      workstreamId: newWorkstreamId || undefined,
      priority: newPriority,
      dueDate: newDueDate || undefined,
    });
    setNewTitle("");
    setActiveAddMilestoneId(null);
    setNewWorkstreamId("");
    setNewDueDate("");
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-400" />
            Project Milestones & Stage-Gates
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sequential phase gates and deliverable packages. Click any milestone card to inspect its tasks.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          <strong className="text-white">{milestones.length}</strong> Milestones defined
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="glass-panel p-8 text-center text-slate-400 text-sm rounded-2xl border border-slate-800">
          No milestones defined for this project yet. Use AI planning or add milestones to govern stages.
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((ms, index) => {
            const msTasks = tasks.filter((t) => t.milestoneId === ms.id);
            const msDone = msTasks.filter((t) => t.status === "done").length;
            const msPercent = msTasks.length > 0 ? Math.round((msDone / msTasks.length) * 100) : 0;
            const isExpanded = expandedMilestones[ms.id] ?? false;
            const isAddingHere = activeAddMilestoneId === ms.id;

            // Find tracks active in this milestone
            const distinctWorkstreamIds = Array.from(
              new Set(msTasks.map((t) => t.workstreamId).filter(Boolean))
            );

            return (
              <div
                key={ms.id}
                className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-lg transition-all"
              >
                {/* Milestone Card Header */}
                <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleMilestone(ms.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                      <Target className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          Phase {index + 1}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-white truncate">
                          {ms.name}
                        </h4>
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
                            Target: {ms.targetDate}
                          </span>
                        )}
                      </div>

                      {ms.description && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {ms.description}
                        </p>
                      )}

                      {/* Involved Tracks badges */}
                      {distinctWorkstreamIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {distinctWorkstreamIds.map((wsId) => {
                            const ws = workstreamMap.get(wsId);
                            return ws ? (
                              <span
                                key={wsId}
                                className="text-[9px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20"
                              >
                                🛤️ {ws.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Progress & Add Task button */}
                  <div className="flex items-center gap-3 shrink-0 pl-10 sm:pl-0">
                    <div className="flex items-center gap-2">
                      <div className="w-24 sm:w-32 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${msPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {msDone}/{msTasks.length} ({msPercent}%)
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveAddMilestoneId(isAddingHere ? null : ms.id);
                        setExpandedMilestones((prev) => ({ ...prev, [ms.id]: true }));
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 transition"
                      title="Add deliverable to this milestone"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Task
                    </button>
                  </div>
                </div>

                {/* Inline Add Task Form for Milestone */}
                {isAddingHere && (
                  <div className="p-4 bg-slate-950/80 border-b border-indigo-500/30 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newTitle}
                      autoFocus
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveMilestoneTask(ms.id);
                        if (e.key === "Escape") setActiveAddMilestoneId(null);
                      }}
                      placeholder={`New deliverable for "${ms.name}"...`}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                    />

                    {/* Track picker */}
                    <select
                      value={newWorkstreamId}
                      onChange={(e) => setNewWorkstreamId(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="">Select Track (Optional)</option>
                      {workstreams.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          🛤️ {ws.name}
                        </option>
                      ))}
                    </select>

                    {/* Priority */}
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none capitalize"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveMilestoneTask(ms.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setActiveAddMilestoneId(null)}
                        className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Milestone Tasks Content */}
                {isExpanded && (
                  <div className="divide-y divide-slate-800/50">
                    {msTasks.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-xs">
                        No tasks assigned to this milestone yet. Click "Add Task" to create one.
                      </div>
                    ) : (
                      msTasks.map((t) => {
                        const isDone = t.status === "done";
                        const ws = t.workstreamId ? workstreamMap.get(t.workstreamId) : null;

                        return (
                          <div
                            key={t.id}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/25 transition text-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                onClick={() => onStatusChange(t.id, isDone ? "todo" : "done")}
                                className={`w-4.5 h-4.5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                                  isDone
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : "border-slate-600 hover:border-indigo-400 text-transparent"
                                }`}
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </button>
                              <div className="min-w-0 flex-1">
                                <span
                                  className={`font-medium ${
                                    isDone ? "line-through text-slate-500" : "text-slate-100"
                                  }`}
                                >
                                  {t.title}
                                </span>
                                {t.description && (
                                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                    {t.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 pl-7 sm:pl-0">
                              {ws && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                  🛤️ {ws.name}
                                </span>
                              )}
                              <span
                                className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                                  priorityColors[t.priority] || priorityColors.medium
                                }`}
                              >
                                {t.priority}
                              </span>
                              <span className="capitalize text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                {t.status.replace("_", " ")}
                              </span>
                              {t.dueDate && (
                                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-cyan-400" />
                                  {t.dueDate}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

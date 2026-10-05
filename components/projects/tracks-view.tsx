"use client";

import { useState } from "react";
import {
  Layers,
  Target,
  Clock,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  Calendar,
  AlertCircle,
} from "lucide-react";

interface TracksViewProps {
  workstreams: any[];
  milestones: any[];
  tasks: any[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onCreateTask: (data: {
    title: string;
    workstreamId?: string;
    milestoneId?: string;
    priority?: string;
    dueDate?: string;
  }) => Promise<void>;
}

export function TracksView({
  workstreams,
  milestones,
  tasks,
  onStatusChange,
  onCreateTask,
}: TracksViewProps) {
  // Expanded tracks: default first one or all open
  const [expandedTracks, setExpandedTracks] = useState<Record<string, boolean>>({
    [workstreams[0]?.id || ""]: true,
  });

  // Adding task inside track state
  const [activeAddTrackId, setActiveAddTrackId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newMilestoneId, setNewMilestoneId] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDueDate, setNewDueDate] = useState("");

  const milestoneMap = new Map(milestones.map((m) => [m.id, m]));

  const priorityColors: Record<string, string> = {
    urgent: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    high: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    medium: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    low: "bg-slate-700/50 text-slate-400 border-slate-700",
  };

  const toggleTrack = (id: string) => {
    setExpandedTracks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveTrackTask = async (workstreamId: string) => {
    if (!newTitle.trim()) return;
    await onCreateTask({
      title: newTitle.trim(),
      workstreamId,
      milestoneId: newMilestoneId || undefined,
      priority: newPriority,
      dueDate: newDueDate || undefined,
    });
    setNewTitle("");
    setActiveAddTrackId(null);
    setNewMilestoneId("");
    setNewDueDate("");
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            Strategic Tracks & Workstreams
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-functional workstreams organized by Milestone / Phase deliverables
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          <strong className="text-white">{workstreams.length}</strong> Tracks active
        </div>
      </div>

      {workstreams.length === 0 ? (
        <div className="glass-panel p-8 text-center text-slate-400 text-sm rounded-2xl border border-slate-800">
          No workstreams created yet. Use AI planning or create a workstream to organize tracks.
        </div>
      ) : (
        <div className="space-y-4">
          {workstreams.map((ws) => {
            const wsTasks = tasks.filter((t) => t.workstreamId === ws.id);
            const wsDone = wsTasks.filter((t) => t.status === "done").length;
            const wsPercent = wsTasks.length > 0 ? Math.round((wsDone / wsTasks.length) * 100) : 0;
            const isExpanded = expandedTracks[ws.id] ?? false;
            const isAddingHere = activeAddTrackId === ws.id;

            // Group tasks inside this track by Milestone
            const trackMilestoneGroups = milestones.map((m) => ({
              milestone: m,
              tasks: wsTasks.filter((t) => t.milestoneId === m.id),
            })).filter((g) => g.tasks.length > 0);

            const unassignedTrackTasks = wsTasks.filter(
              (t) => !t.milestoneId || !milestoneMap.has(t.milestoneId)
            );

            return (
              <div
                key={ws.id}
                className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-lg transition-all"
              >
                {/* Track Card Header */}
                <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleTrack(ws.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-purple-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-bold text-white truncate">
                        {ws.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {trackMilestoneGroups.length} Milestone(s) engaged • {wsTasks.length} deliverables
                      </p>
                    </div>
                  </div>

                  {/* Right: Progress & Add Task button */}
                  <div className="flex items-center gap-3 shrink-0 pl-10 sm:pl-0">
                    <div className="flex items-center gap-2">
                      <div className="w-24 sm:w-32 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-300"
                          style={{ width: `${wsPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {wsDone}/{wsTasks.length} ({wsPercent}%)
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveAddTrackId(isAddingHere ? null : ws.id);
                        setExpandedTracks((prev) => ({ ...prev, [ws.id]: true }));
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-semibold border border-purple-500/30 transition"
                      title="Add deliverable to this track"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Task
                    </button>
                  </div>
                </div>

                {/* Inline Add Task Form for Track */}
                {isAddingHere && (
                  <div className="p-4 bg-slate-950/80 border-b border-purple-500/30 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newTitle}
                      autoFocus
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTrackTask(ws.id);
                        if (e.key === "Escape") setActiveAddTrackId(null);
                      }}
                      placeholder={`New deliverable for track "${ws.name}"...`}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                    />

                    {/* Milestone selector */}
                    <select
                      value={newMilestoneId}
                      onChange={(e) => setNewMilestoneId(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="">Assign Milestone / Phase</option>
                      {milestones.map((m) => (
                        <option key={m.id} value={m.id}>
                          🎯 {m.name}
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
                        onClick={() => handleSaveTrackTask(ws.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setActiveAddTrackId(null)}
                        className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Track Content: Tasks grouped by Milestone */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {wsTasks.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-xs">
                        No tasks assigned to this track yet. Click "Add Task" to schedule deliverables.
                      </div>
                    ) : (
                      <>
                        {trackMilestoneGroups.map(({ milestone, tasks: mTasks }) => {
                          const mDone = mTasks.filter((t) => t.status === "done").length;
                          return (
                            <div
                              key={milestone.id}
                              className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden"
                            >
                              {/* Milestone Sub-header */}
                              <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                                  <span className="font-bold text-white">
                                    🎯 {milestone.name}
                                  </span>
                                  {milestone.targetDate && (
                                    <span className="text-[10px] font-mono text-cyan-300">
                                      Due {milestone.targetDate}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-slate-400 font-semibold">
                                  {mDone}/{mTasks.length} Done
                                </span>
                              </div>

                              {/* Deliverables List under this milestone */}
                              <div className="divide-y divide-slate-800/50">
                                {mTasks.map((t) => {
                                  const isDone = t.status === "done";
                                  return (
                                    <div
                                      key={t.id}
                                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition text-xs"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <button
                                          onClick={() =>
                                            onStatusChange(t.id, isDone ? "todo" : "done")
                                          }
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
                                            isDone ? "line-through text-slate-500" : "text-slate-100"
                                          }`}
                                        >
                                          {t.title}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span
                                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
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
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Unscheduled / No Milestone Tasks in this Track */}
                        {unassignedTrackTasks.length > 0 && (
                          <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                            <div className="p-3 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-400">
                              Unscheduled Deliverables (No Milestone Assigned)
                            </div>
                            <div className="divide-y divide-slate-800/50">
                              {unassignedTrackTasks.map((t) => {
                                const isDone = t.status === "done";
                                return (
                                  <div
                                    key={t.id}
                                    className="p-3 flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <button
                                        onClick={() =>
                                          onStatusChange(t.id, isDone ? "todo" : "done")
                                        }
                                        className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                                          isDone
                                            ? "bg-emerald-500 border-emerald-500 text-white"
                                            : "border-slate-600 text-transparent"
                                        }`}
                                      >
                                        <Check className="w-3 h-3 stroke-[3]" />
                                      </button>
                                      <span
                                        className={`truncate ${
                                          isDone ? "line-through text-slate-500" : "text-slate-200"
                                        }`}
                                      >
                                        {t.title}
                                      </span>
                                    </div>
                                    <span className="capitalize text-[10px] text-slate-400">
                                      {t.status.replace("_", " ")}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
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

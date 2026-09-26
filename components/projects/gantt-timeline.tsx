"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronRight,
  Filter,
  Info,
} from "lucide-react";

interface GanttTask {
  id: string;
  title: string;
  status: string;
  priority?: string;
  dueDate?: string | null;
  milestoneId?: string | null;
  workstreamId?: string | null;
  description?: string | null;
}

interface GanttMilestone {
  id: string;
  name: string;
  status: string;
  targetDate?: string | null;
  description?: string | null;
}

interface GanttDependency {
  id: string;
  blockingTaskId: string;
  blockedTaskId: string;
}

interface GanttTimelineProps {
  tasks: GanttTask[];
  milestones: GanttMilestone[];
  dependencies: GanttDependency[];
  onStatusChange?: (taskId: string, newStatus: string) => void;
}

export function GanttTimeline({
  tasks,
  milestones,
  dependencies,
  onStatusChange,
}: GanttTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState<"days" | "weeks">("weeks");
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
  const [collapsedMilestones, setCollapsedMilestones] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const taskRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Dependency mapping for quick lookups
  const blockingTaskIds = useMemo(() => {
    const set = new Set<string>();
    dependencies.forEach((d) => set.add(d.blockingTaskId));
    return set;
  }, [dependencies]);

  const blockedTaskIds = useMemo(() => {
    const set = new Set<string>();
    dependencies.forEach((d) => set.add(d.blockedTaskId));
    return set;
  }, [dependencies]);

  // Determine timeline date boundaries
  const { startDate, endDate, totalDays, timeColumns } = useMemo(() => {
    let minTime = Infinity;
    let maxTime = -Infinity;

    // Inspect milestone target dates
    milestones.forEach((m) => {
      if (m.targetDate) {
        const t = new Date(m.targetDate).getTime();
        if (!isNaN(t)) {
          minTime = Math.min(minTime, t);
          maxTime = Math.max(maxTime, t);
        }
      }
    });

    // Inspect task due dates
    tasks.forEach((t) => {
      if (t.dueDate) {
        const tm = new Date(t.dueDate).getTime();
        if (!isNaN(tm)) {
          minTime = Math.min(minTime, tm);
          maxTime = Math.max(maxTime, tm);
        }
      }
    });

    // Fallback if no valid dates exist
    const now = new Date();
    if (minTime === Infinity) {
      minTime = now.getTime() - 7 * 86400000;
    } else {
      minTime -= 3 * 86400000; // Pad 3 days before
    }

    if (maxTime === -Infinity || maxTime <= minTime) {
      maxTime = minTime + 45 * 86400000; // 45 days span
    } else {
      maxTime += 7 * 86400000; // Pad 7 days after
    }

    const start = new Date(minTime);
    start.setHours(0, 0, 0, 0);

    const end = new Date(maxTime);
    end.setHours(23, 59, 59, 999);

    const diffDays = Math.max(14, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    // Generate columns
    const cols: { label: string; subLabel: string; percent: number }[] = [];
    if (zoomLevel === "weeks") {
      const totalWeeks = Math.ceil(diffDays / 7);
      for (let i = 0; i < totalWeeks; i++) {
        const colDate = new Date(start.getTime() + i * 7 * 86400000);
        cols.push({
          label: `W${i + 1}`,
          subLabel: colDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          percent: 100 / totalWeeks,
        });
      }
    } else {
      // Days mode (capped to max 30 columns for readability)
      const step = Math.max(1, Math.floor(diffDays / 25));
      const colCount = Math.ceil(diffDays / step);
      for (let i = 0; i < colCount; i++) {
        const colDate = new Date(start.getTime() + i * step * 86400000);
        cols.push({
          label: colDate.toLocaleDateString("en-US", { weekday: "narrow" }),
          subLabel: colDate.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
          percent: 100 / colCount,
        });
      }
    }

    return {
      startDate: start,
      endDate: end,
      totalDays: diffDays,
      timeColumns: cols,
    };
  }, [tasks, milestones, zoomLevel]);

  // Compute position for each task bar
  const taskPositions = useMemo(() => {
    const posMap: Record<string, { left: number; width: number; isEstimated: boolean }> = {};
    const startMs = startDate.getTime();
    const totalMs = endDate.getTime() - startMs;

    tasks.forEach((task, index) => {
      let taskStartMs: number;
      let taskEndMs: number;
      let isEstimated = false;

      if (task.dueDate) {
        const dueMs = new Date(task.dueDate).getTime();
        if (!isNaN(dueMs)) {
          // Duration: 4 days before due date
          taskEndMs = Math.min(endDate.getTime(), dueMs);
          taskStartMs = Math.max(startMs, taskEndMs - 4 * 86400000);
        } else {
          isEstimated = true;
          taskStartMs = startMs + ((index % 6) * 4 + 2) * 86400000;
          taskEndMs = taskStartMs + 4 * 86400000;
        }
      } else {
        isEstimated = true;
        // Distribute estimated tasks across timeline
        taskStartMs = startMs + ((index % 8) * 3 + 1) * 86400000;
        taskEndMs = taskStartMs + 4 * 86400000;
      }

      const left = Math.max(0, Math.min(95, ((taskStartMs - startMs) / totalMs) * 100));
      const right = Math.max(left + 3, Math.min(100, ((taskEndMs - startMs) / totalMs) * 100));
      const width = Math.max(4, right - left);

      posMap[task.id] = { left, width, isEstimated };
    });

    return posMap;
  }, [tasks, startDate, endDate]);

  // Calculate dependency SVG paths
  const [dependencyCurves, setDependencyCurves] = useState<
    { id: string; path: string; isHighlighted: boolean; isBlockedActive: boolean }[]
  >([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const curves: { id: string; path: string; isHighlighted: boolean; isBlockedActive: boolean }[] = [];

    dependencies.forEach((dep) => {
      const fromEl = taskRowRefs.current[dep.blockingTaskId];
      const toEl = taskRowRefs.current[dep.blockedTaskId];
      if (!fromEl || !toEl) return;

      const fromPos = taskPositions[dep.blockingTaskId];
      const toPos = taskPositions[dep.blockedTaskId];
      if (!fromPos || !toPos) return;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      // Track relative coordinates in timeline right section (after 280px left pane)
      const trackWidth = containerRect.width - 280;
      const x1 = 280 + (fromPos.left + fromPos.width) * (trackWidth / 100);
      const y1 = fromRect.top - containerRect.top + fromRect.height / 2;

      const x2 = 280 + toPos.left * (trackWidth / 100);
      const y2 = toRect.top - containerRect.top + toRect.height / 2;

      const dx = Math.max(20, Math.abs(x2 - x1) * 0.4);
      const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      const isHighlighted =
        hoveredTaskId === dep.blockingTaskId || hoveredTaskId === dep.blockedTaskId;

      const blockedTask = tasks.find((t) => t.id === dep.blockedTaskId);
      const isBlockedActive = blockedTask?.status !== "done";

      curves.push({
        id: dep.id,
        path,
        isHighlighted,
        isBlockedActive,
      });
    });

    setDependencyCurves(curves);
  }, [dependencies, taskPositions, hoveredTaskId, tasks, zoomLevel, collapsedMilestones]);

  // Group tasks by milestone
  const groupedMilestones = useMemo(() => {
    const list: { milestone: GanttMilestone | null; tasks: GanttTask[] }[] = [];
    const usedTaskIds = new Set<string>();

    milestones.forEach((m) => {
      let mTasks = tasks.filter((t) => t.milestoneId === m.id);
      if (filterCriticalOnly) {
        mTasks = mTasks.filter(
          (t) => blockingTaskIds.has(t.id) || blockedTaskIds.has(t.id) || t.priority === "urgent"
        );
      }
      mTasks.forEach((t) => usedTaskIds.add(t.id));
      list.push({ milestone: m, tasks: mTasks });
    });

    // Unassigned tasks
    let unassigned = tasks.filter((t) => !usedTaskIds.has(t.id));
    if (filterCriticalOnly) {
      unassigned = unassigned.filter(
        (t) => blockingTaskIds.has(t.id) || blockedTaskIds.has(t.id) || t.priority === "urgent"
      );
    }
    if (unassigned.length > 0) {
      list.push({ milestone: null, tasks: unassigned });
    }

    return list;
  }, [milestones, tasks, filterCriticalOnly, blockingTaskIds, blockedTaskIds]);

  const toggleMilestone = (msId: string) => {
    setCollapsedMilestones((prev) => ({ ...prev, [msId]: !prev[msId] }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "from-emerald-500 to-teal-400 border-emerald-400/40 text-emerald-100 shadow-emerald-500/20";
      case "in_progress":
        return "from-indigo-500 to-cyan-400 border-cyan-400/40 text-white shadow-indigo-500/25";
      case "blocked":
        return "from-rose-600 to-red-500 border-rose-400/50 text-white shadow-rose-500/25 animate-pulse";
      case "todo":
        return "from-blue-600 to-indigo-600 border-blue-400/30 text-slate-100";
      default:
        return "from-slate-700 to-slate-800 border-slate-600/40 text-slate-300";
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Gantt Control Toolbar */}
      <div className="p-4 bg-slate-900/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Interactive Gantt Timeline & Dependency Network
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {tasks.length} deliverables
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Horizontal phase progression with active dependency links and milestone anchors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Critical Path Toggle */}
          <button
            onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              filterCriticalOnly
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/15"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Filter className="w-3 h-3" />
            {filterCriticalOnly ? "Showing Critical Path" : "All Tasks"}
          </button>

          {/* Zoom Toggle */}
          <div className="flex items-center bg-slate-950 rounded-xl p-0.5 border border-slate-800 text-xs">
            <button
              onClick={() => setZoomLevel("weeks")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                zoomLevel === "weeks" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Weeks
            </button>
            <button
              onClick={() => setZoomLevel("days")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                zoomLevel === "days" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Days
            </button>
          </div>
        </div>
      </div>

      {/* Main Gantt Grid Container */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto select-none min-h-[420px] max-h-[700px] overflow-y-auto"
      >
        {/* SVG Dependency Lines Layer */}
        <svg
          className="absolute inset-0 pointer-events-none z-20 w-full h-full"
          style={{ minWidth: "900px" }}
        >
          <defs>
            <marker
              id="gantt-arrow-default"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#6366f1" />
            </marker>
            <marker
              id="gantt-arrow-highlight"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <marker
              id="gantt-arrow-blocked"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#f43f5e" />
            </marker>
          </defs>

          {dependencyCurves.map((dep) => {
            const marker = dep.isHighlighted
              ? "url(#gantt-arrow-highlight)"
              : dep.isBlockedActive
              ? "url(#gantt-arrow-blocked)"
              : "url(#gantt-arrow-default)";

            const strokeColor = dep.isHighlighted
              ? "#38bdf8"
              : dep.isBlockedActive
              ? "#f43f5e"
              : "rgba(99, 102, 241, 0.4)";

            return (
              <path
                key={dep.id}
                d={dep.path}
                fill="none"
                stroke={strokeColor}
                strokeWidth={dep.isHighlighted ? 2.5 : 1.5}
                strokeDasharray={dep.isBlockedActive ? "4 3" : undefined}
                markerEnd={marker}
                className="transition-all duration-200"
              />
            );
          })}
        </svg>

        {/* Gantt Header: Left Pane Header + Time Column Axis */}
        <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 flex min-w-[900px]">
          {/* Left Title Header */}
          <div className="w-72 shrink-0 p-3 text-xs font-bold text-slate-300 border-r border-slate-800/80 flex items-center justify-between">
            <span>Milestones & Deliverables</span>
            <span className="text-[10px] text-slate-500">Status</span>
          </div>

          {/* Time Columns Header */}
          <div className="flex-1 flex divide-x divide-slate-800/50">
            {timeColumns.map((col, idx) => (
              <div
                key={idx}
                style={{ width: `${col.percent}%` }}
                className="p-2 text-center text-slate-400 font-mono flex flex-col justify-center min-w-10"
              >
                <span className="text-[10px] font-bold text-slate-300">{col.label}</span>
                <span className="text-[9px] text-slate-500">{col.subLabel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Milestone Rows & Tasks */}
        <div className="min-w-[900px] divide-y divide-slate-800/40">
          {groupedMilestones.map((group, gIdx) => {
            const ms = group.milestone;
            const msId = ms ? ms.id : "unassigned";
            const isCollapsed = !!collapsedMilestones[msId];
            const msTasks = group.tasks;
            const isCompleted = ms?.status === "completed";

            return (
              <div key={msId} className="group/ms">
                {/* Milestone Band Header */}
                <div
                  onClick={() => toggleMilestone(msId)}
                  className="flex items-center bg-slate-900/90 hover:bg-slate-800/80 cursor-pointer transition border-t border-slate-800/60 sticky z-10"
                  style={{ top: "45px" }}
                >
                  <div className="w-72 shrink-0 p-2.5 pl-3 flex items-center gap-2 border-r border-slate-800/80 text-xs">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    )}
                    <span className="font-bold text-white truncate flex-1">
                      {ms ? ms.name : "Ad-hoc Deliverables"}
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                        isCompleted
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      }`}
                    >
                      {isCompleted ? "Completed" : `${msTasks.length} tasks`}
                    </span>
                  </div>

                  {/* Milestone Track Horizon Marker */}
                  <div className="flex-1 relative h-9 flex items-center">
                    {ms?.targetDate && (
                      <div
                        className="absolute flex items-center gap-1.5 -translate-x-1/2 z-10"
                        style={{
                          left: `${Math.min(
                            95,
                            Math.max(
                              5,
                              ((new Date(ms.targetDate).getTime() - startDate.getTime()) /
                                (endDate.getTime() - startDate.getTime())) *
                                100
                            )
                          )}%`,
                        }}
                      >
                        <div
                          className={`w-3.5 h-3.5 rotate-45 border shadow-sm ${
                            isCompleted
                              ? "bg-emerald-400 border-emerald-200"
                              : "bg-indigo-500 border-indigo-200 animate-pulse"
                          }`}
                        />
                        <span className="text-[10px] font-mono text-slate-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 whitespace-nowrap">
                          {new Date(ms.targetDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Task Rows Under Milestone */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-900/60">
                    {msTasks.map((task) => {
                      const pos = taskPositions[task.id] || { left: 10, width: 20, isEstimated: false };
                      const isHovered = hoveredTaskId === task.id;
                      const isDone = task.status === "done";
                      const isBlocked = blockedTaskIds.has(task.id) && !isDone;
                      const isBlocking = blockingTaskIds.has(task.id);

                      return (
                        <div
                          key={task.id}
                          ref={(el) => {
                            taskRowRefs.current[task.id] = el;
                          }}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                          onClick={() => setSelectedTask(task)}
                          className={`flex items-center hover:bg-slate-900/50 transition cursor-pointer relative ${
                            isHovered ? "bg-indigo-950/20" : ""
                          }`}
                        >
                          {/* Left Task Label Pane */}
                          <div className="w-72 shrink-0 p-2.5 pl-6 border-r border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStatusChange?.(task.id, isDone ? "todo" : "done");
                                }}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                                  isDone
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : "border-slate-600 hover:border-indigo-400 text-transparent"
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                              </button>
                              <span
                                className={`truncate font-medium ${
                                  isDone ? "line-through text-slate-500" : "text-slate-200"
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isBlocked && (
                                <span title="Blocked by dependency">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                </span>
                              )}
                              {isBlocking && (
                                <span title="Blocks subsequent tasks">
                                  <GitMerge className="w-3 h-3 text-cyan-400" />
                                </span>
                              )}
                              <span
                                className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold ${
                                  task.priority === "urgent"
                                    ? "bg-rose-500/20 text-rose-400"
                                    : task.priority === "high"
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {task.priority || "med"}
                              </span>
                            </div>
                          </div>

                          {/* Right Gantt Horizon Track */}
                          <div className="flex-1 relative h-9 flex items-center px-1">
                            {/* Task Bar */}
                            <div
                              style={{
                                left: `${pos.left}%`,
                                width: `${pos.width}%`,
                              }}
                              className={`absolute h-6 rounded-lg bg-gradient-to-r border text-[11px] font-medium px-2 flex items-center justify-between shadow-sm transition-all duration-150 ${getStatusColor(
                                task.status
                              )} ${isHovered ? "ring-2 ring-cyan-400/80 scale-[1.02] z-30" : "z-10"}`}
                            >
                              <span className="truncate pr-1 drop-shadow-sm font-semibold">
                                {task.title}
                              </span>
                              {task.dueDate && (
                                <span className="text-[9px] font-mono shrink-0 opacity-80">
                                  {new Date(task.dueDate).toLocaleDateString("en-US", {
                                    month: "numeric",
                                    day: "numeric",
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Details Drawer / Inspector Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedTask.status}
                </span>
                <h4 className="text-base font-bold text-white mt-1.5">{selectedTask.title}</h4>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {selectedTask.description && (
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                {selectedTask.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Priority</span>
                <span className="font-semibold text-slate-200 capitalize">{selectedTask.priority || "Medium"}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Due Date</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {selectedTask.dueDate
                    ? new Date(selectedTask.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Unscheduled"}
                </span>
              </div>
            </div>

            {/* Quick Status Transition Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Quick Change Status:</span>
              <div className="flex items-center gap-1.5">
                {["todo", "in_progress", "blocked", "done"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      onStatusChange?.(selectedTask.id, st);
                      setSelectedTask({ ...selectedTask, status: st });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                      selectedTask.status === st
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  Edit2,
  Trash2,
  Target,
  Layers,
  CornerDownRight,
  Filter,
  ArrowUpDown,
  AlertCircle,
} from "lucide-react";

interface NestedTaskListProps {
  tasks: any[];
  milestones: any[];
  workstreams: any[];
  dependencies: any[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onPriorityChange: (taskId: string, newPriority: string) => void;
  onTitleChange: (taskId: string, newTitle: string) => void;
  onMilestoneChange: (taskId: string, milestoneId: string | null) => void;
  onWorkstreamChange: (taskId: string, workstreamId: string | null) => void;
  onCreateTask: (data: {
    title: string;
    milestoneId?: string;
    workstreamId?: string;
    parentTaskId?: string;
    priority?: string;
    dueDate?: string;
  }) => Promise<void>;
  onDeleteTask?: (taskId: string) => void;
}

export function NestedTaskList({
  tasks,
  milestones,
  workstreams,
  dependencies = [],
  onStatusChange,
  onPriorityChange,
  onTitleChange,
  onMilestoneChange,
  onWorkstreamChange,
  onCreateTask,
  onDeleteTask,
}: NestedTaskListProps) {
  // Collapsed milestone state: default all open
  const [collapsedMilestones, setCollapsedMilestones] = useState<Record<string, boolean>>({});
  // Expanded subtasks state: default all open
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  
  // Inline edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Adding subtask state
  const [addingSubtaskParentId, setAddingSubtaskParentId] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  // Quick add per milestone
  const [activeAddMilestoneId, setActiveAddMilestoneId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newWorkstreamId, setNewWorkstreamId] = useState<string>("");
  const [newPriority, setNewPriority] = useState<string>("medium");
  const [newDueDate, setNewDueDate] = useState<string>("");

  // Filter & view mode: "grouped" (by milestone) vs "flat"
  const [viewGrouping, setViewGrouping] = useState<"milestone" | "flat">("milestone");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const milestoneMap = new Map(milestones.map((m) => [m.id, m]));
  const workstreamMap = new Map(workstreams.map((w) => [w.id, w]));

  const priorityColors: Record<string, string> = {
    urgent: "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30",
    high: "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30",
    medium: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30",
    low: "bg-slate-700/50 text-slate-400 border-slate-700 hover:bg-slate-700",
  };

  const milestoneStatusColors: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    active: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    upcoming: "bg-slate-800 text-slate-400 border-slate-700",
    at_risk: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };

  const toggleMilestone = (id: string) => {
    setCollapsedMilestones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubtasks = (parentId: string) => {
    setExpandedSubtasks((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const handleSaveSubtask = async (parentTask: any) => {
    if (!subtaskTitle.trim()) return;
    await onCreateTask({
      title: subtaskTitle.trim(),
      parentTaskId: parentTask.id,
      milestoneId: parentTask.milestoneId || undefined,
      workstreamId: parentTask.workstreamId || undefined,
      priority: parentTask.priority || "medium",
    });
    setSubtaskTitle("");
    setAddingSubtaskParentId(null);
    setExpandedSubtasks((prev) => ({ ...prev, [parentTask.id]: true }));
  };

  const handleSaveMilestoneTask = async (milestoneId?: string) => {
    if (!newTitle.trim()) return;
    await onCreateTask({
      title: newTitle.trim(),
      milestoneId: milestoneId || undefined,
      workstreamId: newWorkstreamId || undefined,
      priority: newPriority,
      dueDate: newDueDate || undefined,
    });
    setNewTitle("");
    setActiveAddMilestoneId(null);
    setNewWorkstreamId("");
    setNewDueDate("");
  };

  // Grouping logic
  const filteredTasks = statusFilter === "all" ? tasks : tasks.filter((t) => t.status === statusFilter);

  // Map subtasks to their parents
  const subtasksByParent = new Map<string, any[]>();
  filteredTasks.forEach((t) => {
    if (t.parentTaskId) {
      const list = subtasksByParent.get(t.parentTaskId) || [];
      list.push(t);
      subtasksByParent.set(t.parentTaskId, list);
    }
  });

  // Top level tasks only
  const topLevelTasks = filteredTasks.filter(
    (t) => !t.parentTaskId || !tasks.some((p) => p.id === t.parentTaskId)
  );

  // Group top-level tasks by milestone
  const groups: { milestone: any | null; tasks: any[] }[] = [];
  
  milestones.forEach((m) => {
    const mTasks = topLevelTasks.filter((t) => t.milestoneId === m.id);
    groups.push({ milestone: m, tasks: mTasks });
  });

  const unassignedTasks = topLevelTasks.filter(
    (t) => !t.milestoneId || !milestoneMap.has(t.milestoneId)
  );
  if (unassignedTasks.length > 0 || milestones.length === 0) {
    groups.push({ milestone: null, tasks: unassignedTasks });
  }

  // Render an individual task row
  const renderTaskRow = (task: any, isSubtask = false) => {
    const isDone = task.status === "done";
    const isEditing = editingTaskId === task.id;
    const childSubtasks = subtasksByParent.get(task.id) || [];
    const hasSubtasks = childSubtasks.length > 0;
    const areSubtasksExpanded = expandedSubtasks[task.id] ?? true;
    const taskMilestone = task.milestoneId ? milestoneMap.get(task.milestoneId) : null;
    const taskWorkstream = task.workstreamId ? workstreamMap.get(task.workstreamId) : null;

    const completedSubtasks = childSubtasks.filter((s) => s.status === "done").length;

    return (
      <div key={task.id} className="group/item">
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:px-4 sm:py-3 transition-colors ${
            isSubtask
              ? "bg-slate-950/40 hover:bg-slate-800/30 rounded-xl my-1 border border-slate-800/60"
              : "hover:bg-slate-800/25 border-b border-slate-800/50 last:border-0"
          }`}
        >
          {/* Left section: Checkbox, Hierarchy guide, Title */}
          <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
            {isSubtask ? (
              <div className="w-5 flex items-center justify-center shrink-0 text-slate-500">
                <CornerDownRight className="w-3.5 h-3.5" />
              </div>
            ) : hasSubtasks ? (
              <button
                onClick={() => toggleSubtasks(task.id)}
                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white shrink-0"
                title={areSubtasksExpanded ? "Collapse subtasks" : "Expand subtasks"}
              >
                {areSubtasksExpanded ? (
                  <ChevronDown className="w-4 h-4 text-indigo-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
            ) : (
              <div className="w-5 shrink-0" />
            )}

            {/* Status toggle checkbox */}
            <button
              onClick={() => onStatusChange(task.id, isDone ? "todo" : "done")}
              className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-lg border flex items-center justify-center transition shrink-0 mt-0.5 sm:mt-0 ${
                isDone
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-slate-600 hover:border-indigo-400 text-transparent"
              }`}
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </button>

            {/* Task Title & Inline Edit */}
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editingTitle}
                  autoFocus
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => {
                    if (editingTitle.trim()) onTitleChange(task.id, editingTitle.trim());
                    setEditingTaskId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (editingTitle.trim()) onTitleChange(task.id, editingTitle.trim());
                      setEditingTaskId(null);
                    }
                    if (e.key === "Escape") setEditingTaskId(null);
                  }}
                  className="text-xs sm:text-sm font-semibold text-white bg-slate-900 px-2 py-0.5 rounded-lg border border-indigo-500 outline-none w-full max-w-md"
                />
              ) : (
                <div className="flex items-center gap-2 group/title flex-wrap">
                  <span
                    onClick={() => {
                      setEditingTaskId(task.id);
                      setEditingTitle(task.title);
                    }}
                    className={`text-xs sm:text-sm font-medium cursor-text hover:text-indigo-300 transition ${
                      isDone ? "line-through text-slate-500" : "text-slate-100"
                    }`}
                    title="Click to rename"
                  >
                    {task.title}
                  </span>

                  <button
                    onClick={() => {
                      setEditingTaskId(task.id);
                      setEditingTitle(task.title);
                    }}
                    className="opacity-0 group-hover/title:opacity-100 text-slate-500 hover:text-slate-300 p-0.5 transition"
                    title="Edit task name"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>

                  {/* Subtask count badge */}
                  {hasSubtasks && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                      {completedSubtasks}/{childSubtasks.length} subtasks
                    </span>
                  )}
                </div>
              )}

              {task.description && (
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{task.description}</p>
              )}
            </div>
          </div>

          {/* Right section: Badges (Milestone, Track, Priority, Status, Due Date, Subtask action) */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 text-xs pl-7 sm:pl-0">
            {/* Milestone Badge with selector */}
            <div className="relative group/ms">
              <select
                value={task.milestoneId || ""}
                onChange={(e) => onMilestoneChange(task.id, e.target.value || null)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border appearance-none pr-4 cursor-pointer focus:outline-none transition ${
                  taskMilestone
                    ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
                    : "bg-slate-800/70 text-slate-400 border-slate-700 hover:text-slate-300"
                }`}
                title="Change Milestone / Phase"
              >
                <option value="">No Milestone</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    🎯 {m.name}
                  </option>
                ))}
              </select>
              <Target className="w-2.5 h-2.5 absolute right-1.5 top-1.5 pointer-events-none text-slate-400" />
            </div>

            {/* Track / Workstream Badge with selector */}
            <div className="relative group/ws">
              <select
                value={task.workstreamId || ""}
                onChange={(e) => onWorkstreamChange(task.id, e.target.value || null)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border appearance-none pr-4 cursor-pointer focus:outline-none transition ${
                  taskWorkstream
                    ? "bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20"
                    : "bg-slate-800/70 text-slate-400 border-slate-700 hover:text-slate-300"
                }`}
                title="Change Workstream Track"
              >
                <option value="">No Track</option>
                {workstreams.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    🛤️ {ws.name}
                  </option>
                ))}
              </select>
              <Layers className="w-2.5 h-2.5 absolute right-1.5 top-1.5 pointer-events-none text-slate-400" />
            </div>

            {/* Priority Button - click to cycle */}
            <button
              onClick={() => {
                const cycle = ["low", "medium", "high", "urgent"];
                const nextIdx = (cycle.indexOf(task.priority || "medium") + 1) % cycle.length;
                onPriorityChange(task.id, cycle[nextIdx]);
              }}
              className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase cursor-pointer transition ${
                priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium
              }`}
              title="Click to cycle priority"
            >
              {task.priority || "medium"}
            </button>

            {/* Status Select */}
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value)}
              className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 capitalize"
            >
              <option value="backlog">Backlog</option>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>

            {/* Due date */}
            {task.dueDate && (
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                {task.dueDate}
              </span>
            )}

            {/* Add Subtask Button (only for top-level tasks) */}
            {!isSubtask && (
              <button
                onClick={() => {
                  setAddingSubtaskParentId(task.id);
                  setExpandedSubtasks((prev) => ({ ...prev, [task.id]: true }));
                }}
                className="opacity-0 group-hover/item:opacity-100 text-[10px] font-semibold text-slate-400 hover:text-indigo-300 px-2 py-0.5 rounded hover:bg-slate-800 transition flex items-center gap-1"
                title="Add child subtask"
              >
                <Plus className="w-3 h-3" />
                Subtask
              </button>
            )}

            {/* Delete Task */}
            {onDeleteTask && (
              <button
                onClick={() => onDeleteTask(task.id)}
                className="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition"
                title="Delete task"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Inline Add Subtask Input Form */}
        {addingSubtaskParentId === task.id && (
          <div className="ml-8 pl-4 border-l-2 border-indigo-500/40 py-2 pr-4 flex gap-2">
            <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 mt-2 shrink-0" />
            <input
              type="text"
              value={subtaskTitle}
              autoFocus
              onChange={(e) => setSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveSubtask(task);
                if (e.key === "Escape") setAddingSubtaskParentId(null);
              }}
              placeholder={`Add subtask to "${task.title}"...`}
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-indigo-500 text-xs text-white focus:outline-none"
            />
            <button
              onClick={() => handleSaveSubtask(task)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Add
            </button>
            <button
              onClick={() => setAddingSubtaskParentId(null)}
              className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Render child subtasks nested under parent */}
        {!isSubtask && hasSubtasks && areSubtasksExpanded && (
          <div className="ml-6 sm:ml-8 pl-3 border-l-2 border-slate-800/80 space-y-0.5 my-1">
            {childSubtasks.map((subtask) => renderTaskRow(subtask, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Grouping Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          {/* Grouping switcher */}
          <div className="flex items-center bg-slate-950 rounded-xl p-0.5 border border-slate-800 text-xs">
            <button
              onClick={() => setViewGrouping("milestone")}
              className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                viewGrouping === "milestone"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              Grouped by Milestone
            </button>
            <button
              onClick={() => setViewGrouping("flat")}
              className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                viewGrouping === "flat"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Flat List
            </button>
          </div>

          {/* Quick status filter pills */}
          <div className="hidden md:flex items-center gap-1 text-xs">
            {["all", "todo", "in_progress", "blocked", "done"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition ${
                  statusFilter === status
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Global summary stats */}
        <div className="text-xs text-slate-400 flex items-center gap-3">
          <span>
            <strong className="text-white">{tasks.filter((t) => t.status === "done").length}</strong>/
            {tasks.length} Done
          </span>
          <span className="text-slate-600">•</span>
          <span>
            <strong className="text-indigo-400">{milestones.length}</strong> Milestones
          </span>
        </div>
      </div>

      {/* VIEW: GROUPED BY MILESTONE */}
      {viewGrouping === "milestone" ? (
        <div className="space-y-4">
          {groups.map(({ milestone, tasks: groupTasks }) => {
            const isMilestone = !!milestone;
            const groupId = isMilestone ? milestone.id : "unassigned";
            const isCollapsed = collapsedMilestones[groupId] || false;
            const isAddingHere = activeAddMilestoneId === groupId;

            // Compute completion for this milestone group (including subtasks)
            const allGroupTaskIds = new Set(groupTasks.map((t) => t.id));
            const allRelatedTasks = tasks.filter(
              (t) =>
                (isMilestone && t.milestoneId === milestone.id) ||
                (!isMilestone && (!t.milestoneId || !milestoneMap.has(t.milestoneId)))
            );
            const completedCount = allRelatedTasks.filter((t) => t.status === "done").length;
            const groupPercent =
              allRelatedTasks.length > 0
                ? Math.round((completedCount / allRelatedTasks.length) * 100)
                : 0;

            return (
              <div
                key={groupId}
                className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-lg"
              >
                {/* Milestone Section Header */}
                <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleMilestone(groupId)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-indigo-400" />
                      )}
                    </button>

                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                      <Target className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white truncate">
                          {isMilestone ? milestone.name : "General Backlog / Unassigned Phase"}
                        </h3>
                        {isMilestone && (
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                              milestoneStatusColors[milestone.status] || milestoneStatusColors.upcoming
                            }`}
                          >
                            {milestone.status}
                          </span>
                        )}
                        {isMilestone && milestone.targetDate && (
                          <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Target: {milestone.targetDate}
                          </span>
                        )}
                      </div>
                      {isMilestone && milestone.description && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Progress bar & Quick Add button */}
                  <div className="flex items-center gap-3 shrink-0 pl-10 sm:pl-0">
                    <div className="flex items-center gap-2">
                      <div className="w-20 sm:w-28 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${groupPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-300">
                        {completedCount}/{allRelatedTasks.length} ({groupPercent}%)
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveAddMilestoneId(isAddingHere ? null : groupId);
                        setCollapsedMilestones((prev) => ({ ...prev, [groupId]: false }));
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 transition"
                      title="Add task directly under this milestone"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add Task</span>
                    </button>
                  </div>
                </div>

                {/* Inline Task Creation Form for this Milestone */}
                {isAddingHere && (
                  <div className="p-3 sm:p-4 bg-slate-950/80 border-b border-indigo-500/30 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newTitle}
                      autoFocus
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveMilestoneTask(isMilestone ? milestone.id : undefined);
                        if (e.key === "Escape") setActiveAddMilestoneId(null);
                      }}
                      placeholder={`New task in "${isMilestone ? milestone.name : "General Backlog"}"...`}
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
                          {ws.name}
                        </option>
                      ))}
                    </select>

                    {/* Priority picker */}
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
                        onClick={() => handleSaveMilestoneTask(isMilestone ? milestone.id : undefined)}
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

                {/* Tasks List within this Milestone Group */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-800/40">
                    {groupTasks.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-xs">
                        No deliverables scheduled under this milestone yet. Click "Add Task" to create one.
                      </div>
                    ) : (
                      groupTasks.map((task) => renderTaskRow(task))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW: FLAT TASK LIST */
        <div className="glass-panel rounded-2xl border border-slate-800 divide-y divide-slate-800/60 overflow-hidden">
          {topLevelTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No tasks match the active filter.
            </div>
          ) : (
            topLevelTasks.map((task) => renderTaskRow(task))
          )}
        </div>
      )}
    </div>
  );
}

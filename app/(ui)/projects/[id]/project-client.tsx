"use client";

import { useState } from "react";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Plus,
  Calendar as CalendarIcon,
  LayoutList,
  Kanban,
  GitMerge,
  Activity,
  ChevronRight,
  MoreVertical,
  Check,
  Edit2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { GanttTimeline } from "@/components/projects/gantt-timeline";

interface ProjectClientProps {
  project: any;
  workstreams: any[];
  milestones: any[];
  tasks: any[];
  dependencies: any[];
  activityLogs: any[];
}

export function ProjectClient({
  project,
  workstreams,
  milestones,
  tasks: initialTasks,
  dependencies,
  activityLogs,
}: ProjectClientProps) {
  const [activeTab, setActiveTab] = useState<"tasks" | "overview" | "milestones" | "dependencies" | "activity">("tasks");
  const [taskView, setTaskView] = useState<"list" | "board" | "calendar" | "timeline">("list");
  const [tasks, setTasks] = useState(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const router = useRouter();

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await fetch(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handlePriorityChange = async (taskId: string, newPriority: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t))
    );

    try {
      await fetch(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to update priority", err);
    }
  };

  const handleTitleChange = async (taskId: string, newTitle: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t))
    );

    try {
      await fetch(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to update title", err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await fetch(`/api/v1/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: newTaskTitle.trim(),
          priority: "medium",
          status: "todo",
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setTasks((prev) => [created, ...prev]);
        setNewTaskTitle("");
        setIsCreatingTask(false);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  const completedCount = tasks.filter((t) => t.status === "done").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const healthColors = {
    on_track: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    at_risk: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    blocked: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Project Header Banner */}
      <div className="glass-panel p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${healthColors[project.health as keyof typeof healthColors] || healthColors.on_track}`}>
                {project.health?.replace("_", " ")}
              </span>
              <span className="text-[11px] text-slate-400 uppercase font-semibold px-2 py-0.5 rounded bg-slate-800">
                {project.status}
              </span>
              <span className="text-[11px] text-indigo-400 font-semibold uppercase px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/20">
                {project.priority} priority
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-white">{project.name}</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 sm:mt-2 max-w-3xl leading-relaxed">
              {project.objective || project.description || "No strategic objective stated."}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 text-center min-w-20 sm:min-w-24">
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold">Progress</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{progressPercent}%</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 text-center min-w-20 sm:min-w-24">
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold">Tasks</p>
              <p className="text-xl sm:text-2xl font-bold text-indigo-400 mt-0.5">{tasks.length}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation (scrollable on mobile) */}
        <div className="flex items-center gap-2 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-800/60 overflow-x-auto scrollbar-none flex-nowrap">
          {[
            { id: "tasks", label: `Tasks (${tasks.length})`, icon: CheckCircle2 },
            { id: "overview", label: "Overview & Tracks", icon: Layers },
            { id: "milestones", label: `Milestones (${milestones.length})`, icon: Clock },
            { id: "dependencies", label: `Dependencies (${dependencies.length})`, icon: GitMerge },
            { id: "activity", label: `Activity (${activityLogs.length})`, icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT: TASKS */}
      {activeTab === "tasks" && (
        <div className="space-y-5">
          {/* Sub-toolbar: View Switcher (List, Board, Calendar, Timeline) & Add Task */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
            {/* View switcher */}
            <div className="flex items-center gap-1">
              {[
                { id: "list", label: "List", icon: LayoutList },
                { id: "board", label: "Kanban Board", icon: Kanban },
                { id: "calendar", label: "Calendar", icon: CalendarIcon },
                { id: "timeline", label: "Timeline", icon: Clock },
              ].map((v) => {
                const Icon = v.icon;
                const isSelected = taskView === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setTaskView(v.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      isSelected
                        ? "bg-indigo-600/25 text-indigo-300 border border-indigo-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {v.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Add Button */}
            <button
              onClick={() => setIsCreatingTask(!isCreatingTask)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
          </div>

          {/* Inline Create Task Form */}
          {isCreatingTask && (
            <form onSubmit={handleCreateTask} className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/30 flex gap-3 animate-in fade-in duration-150">
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="What needs to be done?..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
              >
                Save Task
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingTask(false)}
                className="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </form>
          )}

          {/* VIEW 1: LIST VIEW */}
          {taskView === "list" && (
            <div className="glass-panel rounded-2xl border border-slate-800 divide-y divide-slate-800/70 overflow-hidden">
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No tasks created yet. Click "Add Task" or use the AI Command Bar.
                </div>
              ) : (
                tasks.map((task) => {
                  const isDone = task.status === "done";
                  const priorityColors = {
                    urgent: "bg-rose-500/20 text-rose-400 border-rose-500/30",
                    high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
                    medium: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
                    low: "bg-slate-700/50 text-slate-400 border-slate-700",
                  };

                  return (
                    <div
                      key={task.id}
                      className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition group border-b border-slate-800/40 last:border-0"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        {/* Status Checkbox */}
                        <button
                          onClick={() => handleStatusChange(task.id, isDone ? "todo" : "done")}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 mt-0.5 sm:mt-0 ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-slate-600 hover:border-indigo-400 text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>

                        <div className="min-w-0 flex-1">
                          {editingTaskId === task.id ? (
                            <input
                              type="text"
                              value={editingTitle}
                              autoFocus
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => {
                                if (editingTitle.trim()) handleTitleChange(task.id, editingTitle.trim());
                                setEditingTaskId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (editingTitle.trim()) handleTitleChange(task.id, editingTitle.trim());
                                  setEditingTaskId(null);
                                }
                                if (e.key === "Escape") setEditingTaskId(null);
                              }}
                              className="text-sm font-semibold text-white bg-slate-900 px-2 py-1 rounded-lg border border-indigo-500 outline-none w-full max-w-md"
                            />
                          ) : (
                            <div className="flex items-center gap-2 group/title">
                              <p
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setEditingTitle(task.title);
                                }}
                                className={`text-sm font-medium cursor-text hover:text-indigo-300 transition ${
                                  isDone ? "line-through text-slate-500" : "text-slate-100"
                                }`}
                                title="Click to rename"
                              >
                                {task.title}
                              </p>
                              <button
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setEditingTitle(task.title);
                                }}
                                className="opacity-0 group-hover/title:opacity-100 text-slate-500 hover:text-slate-300 p-0.5 transition"
                                title="Edit title"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {task.description && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">{task.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Right Meta badges */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 text-xs pl-8 sm:pl-0">
                        {/* Priority - Click to cycle */}
                        <button
                          onClick={() => {
                            const cycle = ["low", "medium", "high", "urgent"];
                            const nextIdx = (cycle.indexOf(task.priority || "medium") + 1) % cycle.length;
                            handlePriorityChange(task.id, cycle[nextIdx]);
                          }}
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase cursor-pointer transition ${
                            priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium
                          }`}
                          title="Click to cycle priority"
                        >
                          {task.priority}
                        </button>

                        {/* Status pill */}
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] sm:text-xs text-slate-300 focus:outline-none focus:border-indigo-500 capitalize"
                        >
                          <option value="backlog">Backlog</option>
                          <option value="todo">Todo</option>
                          <option value="in_progress">In Progress</option>
                          <option value="blocked">Blocked</option>
                          <option value="done">Done</option>
                        </select>

                        {/* Due date */}
                        {task.dueDate && (
                          <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            {task.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW 2: KANBAN BOARD (Interactive Drag-and-Drop) */}
          {taskView === "board" && (
            <KanbanBoard
              tasks={tasks}
              dependencies={dependencies}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onTitleChange={handleTitleChange}
            />
          )}

          {/* VIEW 3: CALENDAR VIEW */}
          {taskView === "calendar" && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-cyan-400" />
                Deliverables & Deadlines Calendar
              </h3>
              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="p-2 font-bold text-slate-400 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 31 }, (_, i) => {
                  const dayNum = i + 1;
                  const dayStr = `2026-10-${String(dayNum).padStart(2, "0")}`;
                  const dayTasks = tasks.filter((t) => t.dueDate === dayStr);

                  return (
                    <div
                      key={dayNum}
                      className="p-2 min-h-20 rounded-xl bg-slate-900/60 border border-slate-800/80 text-left flex flex-col justify-between"
                    >
                      <span className="text-[10px] font-bold text-slate-400">{dayNum}</span>
                      <div className="space-y-1 mt-1">
                        {dayTasks.map((t) => (
                          <div key={t.id} className="text-[10px] p-1 rounded bg-indigo-500/20 text-indigo-300 truncate">
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 4: INTERACTIVE GANTT TIMELINE & DEPENDENCY NETWORK */}
          {taskView === "timeline" && (
            <GanttTimeline
              tasks={tasks}
              milestones={milestones}
              dependencies={dependencies}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>
      )}

      {/* TAB CONTENT: OVERVIEW & WORKSTREAMS */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Strategic Tracks (Workstreams)
            </h3>
            <div className="space-y-2">
              {workstreams.map((ws) => (
                <div key={ws.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{ws.name}</span>
                  <span className="text-slate-400">
                    {tasks.filter((t) => t.workstreamId === ws.id).length} tasks
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Health Diagnostic & Rationale
            </h3>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs leading-relaxed text-slate-300">
              <p className="font-semibold text-white mb-1">Current State: {project.health}</p>
              <p>{project.healthReason || "Project telemetry shows steady task completion velocity with zero circular blockers."}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: MILESTONES */}
      {activeTab === "milestones" && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white">Target Milestones</h3>
          <div className="divide-y divide-slate-800">
            {milestones.map((ms) => (
              <div key={ms.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{ms.name}</p>
                  <p className="text-xs text-slate-400">{ms.targetDate || "No target date"}</p>
                </div>
                <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded bg-slate-800 text-indigo-400">
                  {ms.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: DEPENDENCIES */}
      {activeTab === "dependencies" && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white">Task Dependencies (Acyclic Graph)</h3>
          <div className="space-y-2">
            {dependencies.length === 0 ? (
              <p className="text-xs text-slate-400">No cross-task dependencies linked yet.</p>
            ) : (
              dependencies.map((dep) => (
                <div key={dep.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3 text-xs">
                  <span className="font-semibold text-rose-400">Blocker ID: {dep.blockingTaskId.slice(0, 8)}...</span>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                  <span className="font-semibold text-indigo-300">Blocks ID: {dep.blockedTaskId.slice(0, 8)}...</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ACTIVITY FEED */}
      {activeTab === "activity" && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white">Project Activity Audit Stream</h3>
          <div className="space-y-3">
            {activityLogs.map((log) => (
              <div key={log.id} className="text-xs flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-indigo-400 mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-slate-200">
                    <span className="font-bold capitalize">{log.action} </span>
                    <span className="text-slate-400">({log.entityType})</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

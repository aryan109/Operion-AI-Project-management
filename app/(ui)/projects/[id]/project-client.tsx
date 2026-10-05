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
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { GanttTimeline } from "@/components/projects/gantt-timeline";
import { NestedTaskList } from "@/components/projects/nested-task-list";
import { OverviewView } from "@/components/projects/overview-view";
import { TracksView } from "@/components/projects/tracks-view";
import { MilestonesView } from "@/components/projects/milestones-view";
import { DependenciesView } from "@/components/projects/dependencies-view";

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
  dependencies: initialDependencies,
  activityLogs,
}: ProjectClientProps) {
  const [activeTab, setActiveTab] = useState<
    "tasks" | "overview" | "tracks" | "milestones" | "dependencies" | "activity"
  >("tasks");
  const [taskView, setTaskView] = useState<"list" | "board" | "calendar" | "timeline">("list");
  const [tasks, setTasks] = useState(initialTasks);
  const [dependencies, setDependencies] = useState(initialDependencies);

  // Quick Task Creation form state
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState("");
  const [newTaskWorkstreamId, setNewTaskWorkstreamId] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskDueDate, setNewDueDate] = useState("");

  const router = useRouter();

  // Status mutation with optimistic update
  const handleStatusChange = async (taskId: string, newStatus: string) => {
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

  // Priority mutation with optimistic update
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

  // Title mutation with optimistic update
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

  // Milestone assignment mutation
  const handleMilestoneChange = async (taskId: string, milestoneId: string | null) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, milestoneId } : t))
    );

    try {
      await fetch(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId: milestoneId || null }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to update milestone", err);
    }
  };

  // Workstream/Track assignment mutation
  const handleWorkstreamChange = async (taskId: string, workstreamId: string | null) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, workstreamId } : t))
    );

    try {
      await fetch(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workstreamId: workstreamId || null }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to update track", err);
    }
  };

  // Detailed task creation handler (used across nested list, tracks, and milestones)
  const handleCreateTaskDetailed = async (data: {
    title: string;
    milestoneId?: string;
    workstreamId?: string;
    parentTaskId?: string;
    priority?: string;
    dueDate?: string;
  }) => {
    try {
      const res = await fetch(`/api/v1/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: data.title.trim(),
          milestoneId: data.milestoneId || undefined,
          workstreamId: data.workstreamId || undefined,
          parentTaskId: data.parentTaskId || undefined,
          priority: data.priority || "medium",
          dueDate: data.dueDate || undefined,
          status: "todo",
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setTasks((prev) => [created, ...prev]);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  // Top-bar Quick Create Task form submit
  const handleTopCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    await handleCreateTaskDetailed({
      title: newTaskTitle.trim(),
      milestoneId: newTaskMilestoneId || undefined,
      workstreamId: newTaskWorkstreamId || undefined,
      priority: newTaskPriority,
      dueDate: newTaskDueDate || undefined,
    });

    setNewTaskTitle("");
    setNewTaskMilestoneId("");
    setNewTaskWorkstreamId("");
    setNewDueDate("");
    setIsCreatingTask(false);
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId && t.parentTaskId !== taskId));

    try {
      await fetch(`/api/v1/tasks/${taskId}`, {
        method: "DELETE",
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  // Create dependency
  const handleCreateDependency = async (blockingTaskId: string, blockedTaskId: string) => {
    const res = await fetch(`/api/v1/tasks/${blockingTaskId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedTaskId }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "Failed to link dependency.");
    }

    const created = await res.json();
    setDependencies((prev) => [...prev, created]);
    router.refresh();
  };

  // Remove dependency
  const handleRemoveDependency = async (dependencyId: string) => {
    setDependencies((prev) => prev.filter((d) => d.id !== dependencyId));

    try {
      await fetch(`/api/v1/dependencies/${dependencyId}`, {
        method: "DELETE",
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to remove dependency", err);
    }
  };

  const completedCount = tasks.filter((t) => t.status === "done").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const healthColors: Record<string, string> = {
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
              <span
                className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                  healthColors[project.health] || healthColors.on_track
                }`}
              >
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

        {/* Tab Navigation (Exact order specified: Tasks, Overview, Tracks, Milestone, Dependency, Activity) */}
        <div className="flex items-center gap-2 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-800/60 overflow-x-auto scrollbar-none flex-nowrap">
          {[
            { id: "tasks", label: `Tasks (${tasks.length})`, icon: CheckCircle2 },
            { id: "overview", label: "Overview", icon: LayoutList },
            { id: "tracks", label: `Tracks (${workstreams.length})`, icon: Layers },
            { id: "milestones", label: `Milestones (${milestones.length})`, icon: Target },
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

      {/* ========================================================================= */}
      {/* TAB 1: TASKS (Nested Hierarchical List & Alternative Views) */}
      {/* ========================================================================= */}
      {activeTab === "tasks" && (
        <div className="space-y-5">
          {/* Sub-toolbar: View Switcher (List, Board, Calendar, Timeline) & Quick Add */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
            {/* View switcher */}
            <div className="flex items-center gap-1">
              {[
                { id: "list", label: "Nested List", icon: LayoutList },
                { id: "board", label: "Kanban Board", icon: Kanban },
                { id: "calendar", label: "Calendar", icon: CalendarIcon },
                { id: "timeline", label: "Timeline (Gantt)", icon: Clock },
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
            <form
              onSubmit={handleTopCreateTask}
              className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 flex flex-col md:flex-row gap-2.5 animate-in fade-in duration-150"
            >
              <input
                type="text"
                required
                value={newTaskTitle}
                autoFocus
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="What deliverable needs to be done?..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
              />

              {/* Milestone Selector */}
              <select
                value={newTaskMilestoneId}
                onChange={(e) => setNewTaskMilestoneId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select Milestone / Phase</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    🎯 {m.name}
                  </option>
                ))}
              </select>

              {/* Track Selector */}
              <select
                value={newTaskWorkstreamId}
                onChange={(e) => setNewTaskWorkstreamId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select Track (Optional)</option>
                {workstreams.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    🛤️ {ws.name}
                  </option>
                ))}
              </select>

              {/* Priority Selector */}
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 capitalize"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>

              <div className="flex gap-2">
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
              </div>
            </form>
          )}

          {/* VIEW 1: NESTED LIST VIEW */}
          {taskView === "list" && (
            <NestedTaskList
              tasks={tasks}
              milestones={milestones}
              workstreams={workstreams}
              dependencies={dependencies}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onTitleChange={handleTitleChange}
              onMilestoneChange={handleMilestoneChange}
              onWorkstreamChange={handleWorkstreamChange}
              onCreateTask={handleCreateTaskDetailed}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {/* VIEW 2: KANBAN BOARD */}
          {taskView === "board" && (
            <KanbanBoard
              tasks={tasks}
              dependencies={dependencies}
              milestones={milestones}
              workstreams={workstreams}
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
                          <div
                            key={t.id}
                            className="text-[10px] p-1 rounded bg-indigo-500/20 text-indigo-300 truncate"
                            title={t.title}
                          >
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

          {/* VIEW 4: GANTT TIMELINE */}
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

      {/* ========================================================================= */}
      {/* TAB 2: OVERVIEW (Interactive Milestone & Track Cards) */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <OverviewView
          project={project}
          milestones={milestones}
          workstreams={workstreams}
          tasks={tasks}
          dependencies={dependencies}
          onStatusChange={handleStatusChange}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRACKS (Workstreams with Tasks Grouped by Milestone) */}
      {/* ========================================================================= */}
      {activeTab === "tracks" && (
        <TracksView
          workstreams={workstreams}
          milestones={milestones}
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onCreateTask={handleCreateTaskDetailed}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MILESTONES (Phase Progression & Tasks Drilldown) */}
      {/* ========================================================================= */}
      {activeTab === "milestones" && (
        <MilestonesView
          milestones={milestones}
          workstreams={workstreams}
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onCreateTask={handleCreateTaskDetailed}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DEPENDENCIES (Deliverables Precedence & Cross-Milestone Links) */}
      {/* ========================================================================= */}
      {activeTab === "dependencies" && (
        <DependenciesView
          dependencies={dependencies}
          tasks={tasks}
          milestones={milestones}
          workstreams={workstreams}
          onStatusChange={handleStatusChange}
          onCreateDependency={handleCreateDependency}
          onRemoveDependency={handleRemoveDependency}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 6: ACTIVITY FEED */}
      {/* ========================================================================= */}
      {activeTab === "activity" && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Project Activity Audit Stream
          </h3>
          <div className="space-y-3">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-400">No activity recorded for this project yet.</p>
            ) : (
              activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="text-xs flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-900/90 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-slate-200">
                      <span className="font-bold capitalize">{log.action} </span>
                      <span className="text-indigo-400 font-semibold">({log.entityType})</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

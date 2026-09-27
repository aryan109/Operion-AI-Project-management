"use client";

import { useState } from "react";
import {
  FolderGit2,
  Calendar,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  ArrowRight,
  Loader2,
  Sparkles,
  Layers,
  Flag,
  CheckCircle2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

export interface PlanTaskItem {
  title: string;
  workstream: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "backlog" | "todo" | "in_progress" | "blocked" | "done";
  selected?: boolean;
}

export interface ProjectPlanTree {
  projectName: string;
  objective: string;
  workstreams: string[];
  milestones: Array<{ name: string; targetDate?: string }>;
  tasks: PlanTaskItem[];
}

interface ProjectTreePreviewProps {
  isOpen: boolean;
  plan: ProjectPlanTree | null;
  onClose: () => void;
  onCommitted?: (createdProject: any) => void;
}

export function ProjectTreePreview({
  isOpen,
  plan: initialPlan,
  onClose,
  onCommitted,
}: ProjectTreePreviewProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<ProjectPlanTree | null>(initialPlan);
  const [committing, setCommitting] = useState(false);
  const [committedProject, setCommittedProject] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedWorkstreamForNewTask, setSelectedWorkstreamForNewTask] = useState("");

  if (!isOpen || !plan) return null;

  const currentPlan = plan;
  const selectedTasksCount = currentPlan.tasks.filter((t) => t.selected !== false).length;

  const toggleTaskSelection = (idx: number) => {
    setPlan((prev) => {
      if (!prev) return null;
      const updated = [...prev.tasks];
      updated[idx] = {
        ...updated[idx],
        selected: updated[idx].selected === false ? true : false,
      };
      return { ...prev, tasks: updated };
    });
  };

  const toggleAll = (select: boolean) => {
    setPlan((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map((t) => ({ ...t, selected: select })),
      };
    });
  };

  const removeTask = (idx: number) => {
    setPlan((prev) => {
      if (!prev) return null;
      const updated = prev.tasks.filter((_, i) => i !== idx);
      return { ...prev, tasks: updated };
    });
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const ws =
      selectedWorkstreamForNewTask ||
      currentPlan.workstreams[0] ||
      "General";

    setPlan((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: [
          ...prev.tasks,
          {
            title: newTaskTitle.trim(),
            workstream: ws,
            priority: "medium",
            status: "todo",
            selected: true,
          },
        ],
      };
    });
    setNewTaskTitle("");
  };

  const handleCommit = async () => {
    setCommitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          plan: currentPlan,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Failed to commit project plan");
      }

      setCommittedProject(data.project);
      if (onCommitted) {
        onCommitted(data.project);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred while creating project tree");
    } finally {
      setCommitting(false);
    }
  };

  // Group tasks by workstream
  const workstreamGroups: Record<string, Array<{ task: PlanTaskItem; originalIndex: number }>> = {};
  for (const ws of currentPlan.workstreams) {
    workstreamGroups[ws] = [];
  }
  currentPlan.tasks.forEach((task, idx) => {
    const ws = task.workstream || currentPlan.workstreams[0] || "General";
    if (!workstreamGroups[ws]) {
      workstreamGroups[ws] = [];
    }
    workstreamGroups[ws].push({ task, originalIndex: idx });
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#0f1420] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                AI Project Proposal Preview
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Dry-Run Verification
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Inspect, modify, and approve proposed workstreams and deliverables before committing to database.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {committedProject ? (
            /* Success View */
            <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-4">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 mb-1">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Project Successfully Instantiated!</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Created <strong>{committedProject.name}</strong> along with all selected workstreams, milestones, and deliverables.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    router.push(`/projects/${committedProject.id}`);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition"
                >
                  Open Project Cockpit <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Project Meta Card */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={currentPlan.projectName}
                    onChange={(e) =>
                      setPlan((prev) => (prev ? { ...prev, projectName: e.target.value } : null))
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Core Objective
                  </label>
                  <textarea
                    rows={2}
                    value={currentPlan.objective}
                    onChange={(e) =>
                      setPlan((prev) => (prev ? { ...prev, objective: e.target.value } : null))
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Workstreams & Milestones Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Workstreams ({currentPlan.workstreams.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentPlan.workstreams.map((ws, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium"
                      >
                        {ws}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Flag className="w-4 h-4 text-emerald-400" />
                    <span>Milestones ({currentPlan.milestones.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentPlan.milestones.length > 0 ? (
                      currentPlan.milestones.map((ms, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-1"
                        >
                          <span>{ms.name}</span>
                          {ms.targetDate && (
                            <span className="text-[10px] text-emerald-400/80 font-mono">
                              ({ms.targetDate})
                            </span>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">No milestones defined</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tasks Tree */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Proposed Tasks Tree ({selectedTasksCount}/{currentPlan.tasks.length} selected)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => toggleAll(true)}
                      className="text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      onClick={() => toggleAll(false)}
                      className="text-slate-400 hover:text-slate-300 font-medium"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Workstream Groups */}
                <div className="space-y-4">
                  {Object.entries(workstreamGroups).map(([wsName, groupItems]) => (
                    <div
                      key={wsName}
                      className="rounded-xl border border-slate-800/80 bg-slate-950/40 overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-300">{wsName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {groupItems.length} deliverable(s)
                        </span>
                      </div>
                      <div className="divide-y divide-slate-800/40">
                        {groupItems.map(({ task, originalIndex }) => {
                          const isSelected = task.selected !== false;
                          return (
                            <div
                              key={originalIndex}
                              className={`p-2.5 flex items-center justify-between gap-3 text-xs transition ${
                                isSelected ? "bg-slate-900/20 text-slate-200" : "bg-slate-950/80 text-slate-500 opacity-60"
                              }`}
                            >
                              <div
                                className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
                                onClick={() => toggleTaskSelection(originalIndex)}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-600 shrink-0" />
                                )}
                                <span className={`font-medium ${isSelected ? "" : "line-through"}`}>
                                  {task.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                    task.priority === "urgent"
                                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                      : task.priority === "high"
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  }`}
                                >
                                  {task.priority || "medium"}
                                </span>
                                <button
                                  onClick={() => removeTask(originalIndex)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                                  title="Remove deliverable"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Add Task */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    placeholder="Add custom deliverable to plan..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={selectedWorkstreamForNewTask}
                    onChange={(e) => setSelectedWorkstreamForNewTask(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    {currentPlan.workstreams.map((ws, i) => (
                      <option key={i} value={ws}>
                        {ws}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addTask}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/50 text-xs text-rose-400">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!committedProject && (
          <div className="px-5 py-3.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              Ready to create: <strong>1 Project</strong>,{" "}
              <strong>{currentPlan.workstreams.length} Workstreams</strong>,{" "}
              <strong>{selectedTasksCount} Tasks</strong>
            </span>

            <div className="flex items-center gap-2.5">
              <button
                onClick={onClose}
                disabled={committing}
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={committing || selectedTasksCount === 0}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition"
              >
                {committing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Committing...
                  </>
                ) : (
                  <>
                    Commit to Workspace <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

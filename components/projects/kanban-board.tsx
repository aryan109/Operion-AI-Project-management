"use client";

import { useState } from "react";
import {
  Clock,
  AlertTriangle,
  GitMerge,
  CheckCircle2,
  Check,
  Edit2,
  GripVertical,
} from "lucide-react";

interface KanbanTask {
  id: string;
  title: string;
  status: string;
  priority?: string;
  dueDate?: string | null;
  milestoneId?: string | null;
  workstreamId?: string | null;
  description?: string | null;
}

interface KanbanBoardProps {
  tasks: KanbanTask[];
  dependencies?: { blockingTaskId: string; blockedTaskId: string }[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onPriorityChange?: (taskId: string, newPriority: string) => void;
  onTitleChange?: (taskId: string, newTitle: string) => void;
}

const COLUMNS = [
  { id: "backlog", label: "Backlog", color: "border-slate-700 text-slate-400 bg-slate-900/40" },
  { id: "todo", label: "To Do", color: "border-blue-500/40 text-blue-400 bg-blue-950/10" },
  { id: "in_progress", label: "In Progress", color: "border-indigo-500/40 text-indigo-400 bg-indigo-950/10" },
  { id: "blocked", label: "Blocked", color: "border-rose-500/40 text-rose-400 bg-rose-950/15" },
  { id: "done", label: "Done", color: "border-emerald-500/40 text-emerald-400 bg-emerald-950/10" },
];

export function KanbanBoard({
  tasks,
  dependencies = [],
  onStatusChange,
  onPriorityChange,
  onTitleChange,
}: KanbanBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropColId, setActiveDropColId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const blockedTaskIds = new Set(dependencies.map((d) => d.blockedTaskId));
  const blockingTaskIds = new Set(dependencies.map((d) => d.blockingTaskId));

  const priorityColors = {
    urgent: "bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30",
    high: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30",
    medium: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30",
    low: "bg-slate-700/50 text-slate-400 border-slate-700 hover:bg-slate-700",
  };

  const cyclePriority = (taskId: string, currentPriority: string = "medium") => {
    const cycle = ["low", "medium", "high", "urgent"];
    const nextIdx = (cycle.indexOf(currentPriority) + 1) % cycle.length;
    onPriorityChange?.(taskId, cycle[nextIdx]);
  };

  const handleStartEdit = (task: KanbanTask) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const handleSaveEdit = (taskId: string) => {
    if (editingTitle.trim()) {
      onTitleChange?.(taskId, editingTitle.trim());
    }
    setEditingTaskId(null);
  };

  return (
    <div className="flex md:grid md:grid-cols-5 overflow-x-auto snap-x snap-mandatory gap-3.5 pb-4 scrollbar-none">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        const isTargetActive = activeDropColId === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (activeDropColId !== col.id) {
                setActiveDropColId(col.id);
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                if (activeDropColId === col.id) {
                  setActiveDropColId(null);
                }
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
              setActiveDropColId(null);
              setDraggedTaskId(null);
              if (taskId) {
                onStatusChange(taskId, col.id);
              }
            }}
            className={`w-[82vw] max-w-[320px] md:w-auto snap-center shrink-0 md:shrink p-3.5 rounded-2xl border transition-all duration-200 flex flex-col min-h-[460px] ${
              col.color
            } ${
              isTargetActive
                ? "ring-2 ring-indigo-500/70 bg-indigo-950/30 border-indigo-500 shadow-lg shadow-indigo-500/10 scale-[1.01]"
                : "bg-slate-900/60 border-slate-800"
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                {col.label}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                {colTasks.length}
              </span>
            </div>

            {/* Tasks Container */}
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
              {colTasks.length === 0 ? (
                <div
                  className={`h-24 border border-dashed rounded-xl flex items-center justify-center text-xs transition ${
                    isTargetActive
                      ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300 font-semibold"
                      : "border-slate-800/80 text-slate-500"
                  }`}
                >
                  {isTargetActive ? "Drop here to move" : "Empty column"}
                </div>
              ) : (
                colTasks.map((t) => {
                  const isDraggingThis = draggedTaskId === t.id;
                  const isBlocked = blockedTaskIds.has(t.id) && t.status !== "done";
                  const isBlocking = blockingTaskIds.has(t.id);
                  const isEditing = editingTaskId === t.id;

                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", t.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggedTaskId(t.id);
                      }}
                      onDragEnd={() => {
                        setDraggedTaskId(null);
                        setActiveDropColId(null);
                      }}
                      className={`p-3.5 rounded-xl bg-slate-950/90 border transition-all duration-150 shadow-sm group select-none ${
                        isDraggingThis
                          ? "opacity-30 border-dashed border-indigo-400 scale-95"
                          : "border-slate-800 hover:border-indigo-500/50 hover:shadow-md hover:shadow-indigo-500/5 hover:-translate-y-0.5"
                      }`}
                    >
                      {/* Top Action & Drag Handle Bar */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 cursor-grab shrink-0" />

                          {/* Quick Toggle Checkbox */}
                          <button
                            onClick={() => onStatusChange(t.id, t.status === "done" ? "todo" : "done")}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                              t.status === "done"
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-slate-600 hover:border-indigo-400 text-transparent"
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>

                          {/* Inline Title or Input */}
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingTitle}
                              autoFocus
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => handleSaveEdit(t.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit(t.id);
                                if (e.key === "Escape") setEditingTaskId(null);
                              }}
                              className="text-xs font-semibold text-white bg-slate-900 px-2 py-0.5 rounded border border-indigo-500 outline-none w-full"
                            />
                          ) : (
                            <span
                              onClick={() => handleStartEdit(t)}
                              className={`text-xs font-semibold cursor-text truncate flex-1 hover:text-indigo-300 transition ${
                                t.status === "done" ? "line-through text-slate-500" : "text-white"
                              }`}
                              title="Click to rename"
                            >
                              {t.title}
                            </span>
                          )}
                        </div>

                        {/* Edit Icon on Hover */}
                        {!isEditing && (
                          <button
                            onClick={() => handleStartEdit(t)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 p-0.5 transition shrink-0"
                            title="Edit task"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {t.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 pl-5">
                          {t.description}
                        </p>
                      )}

                      {/* Card Footer Badges */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs pl-5">
                        {/* Priority Pill - Clickable to cycle */}
                        <button
                          onClick={() => cyclePriority(t.id, t.priority)}
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border transition ${
                            priorityColors[t.priority as keyof typeof priorityColors] || priorityColors.medium
                          }`}
                          title="Click to cycle priority"
                        >
                          {t.priority || "medium"}
                        </button>

                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                          {isBlocked && (
                            <span className="flex items-center gap-0.5 text-rose-400 font-bold" title="Blocked by predecessor">
                              <AlertTriangle className="w-3 h-3" />
                            </span>
                          )}
                          {isBlocking && (
                            <span className="flex items-center gap-0.5 text-cyan-400 font-bold" title="Blocks dependent task">
                              <GitMerge className="w-3 h-3" />
                            </span>
                          )}
                          {t.dueDate && (
                            <span className="font-mono text-slate-400 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-slate-500" />
                              {new Date(t.dueDate).toLocaleDateString("en-US", {
                                month: "numeric",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Dynamic Drop Zone Indicator at bottom of column */}
              {isTargetActive && colTasks.length > 0 && (
                <div className="h-10 rounded-xl border-2 border-dashed border-indigo-400/80 bg-indigo-500/10 flex items-center justify-center text-[11px] text-indigo-300 font-semibold animate-pulse">
                  Drop to move to {col.label}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

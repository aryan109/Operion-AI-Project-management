"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickActionModal({ isOpen, onClose }: QuickActionModalProps) {
  const [tab, setTab] = useState<"task" | "project">("task");
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDueDate, setTaskDueDate] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectObjective, setProjectObjective] = useState("");
  const [projectPriority, setProjectPriority] = useState("medium");

  const router = useRouter();

  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      try {
        const res = await fetch("/api/v1/projects");
        const data = await res.json();
        if (Array.isArray(data)) {
          setProjects(data);
          if (data.length > 0) setSelectedProjectId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load projects", err);
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !selectedProjectId) return;
    setSubmitting(true);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          title: taskTitle,
          priority: taskPriority,
          dueDate: taskDueDate || undefined,
          status: "todo",
        }),
      });
      if (res.ok) {
        setSuccessMessage("Task created successfully!");
        setTaskTitle("");
        router.refresh();
        setTimeout(() => onClose(), 1000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName) return;
    setSubmitting(true);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          objective: projectObjective || undefined,
          priority: projectPriority,
          status: "active",
        }),
      });
      if (res.ok) {
        setSuccessMessage("Project created successfully!");
        setProjectName("");
        router.refresh();
        setTimeout(() => onClose(), 1000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0f1420] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex gap-2">
            <button
              onClick={() => setTab("task")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                tab === "task"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              New Task
            </button>
            <button
              onClick={() => setTab("project")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                tab === "project"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              New Project
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          )}

          {tab === "task" ? (
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Deploy staging infrastructure"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Due Date (optional)
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Task"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Enterprise Client Onboarding"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Strategic Objective
                </label>
                <textarea
                  value={projectObjective}
                  onChange={(e) => setProjectObjective(e.target.value)}
                  rows={2}
                  placeholder="Primary goal of this project..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Priority
                </label>
                <select
                  value={projectPriority}
                  onChange={(e) => setProjectPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Project"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, X, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandBar({ isOpen, onClose }: CommandBarProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleExecute = async (promptText?: string) => {
    const textToRun = promptText || query;
    if (!textToRun.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Determine intent
      const lower = textToRun.toLowerCase();

      if (lower.includes("plan") || lower.includes("create project") || lower.includes("launch")) {
        // AI Project Planning
        const res = await fetch("/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method: "tools/call",
            params: {
              name: "planProject",
              arguments: { objective: textToRun, projectName: textToRun.slice(0, 40) },
            },
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const parsed = JSON.parse(data.result.content[0].text);
        setResult({
          type: "project_planned",
          message: `Successfully planned and created project: "${parsed.project.name}" with ${parsed.workstreamsCreated} workstreams, ${parsed.milestonesCreated} milestones, and ${parsed.tasksCreated} tasks!`,
          projectId: parsed.project.id,
        });
        router.refresh();
      } else if (lower.includes("blocked")) {
        // Blockers inquiry
        const res = await fetch("/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method: "tools/call",
            params: { name: "findBlockers", arguments: {} },
          }),
        });
        const data = await res.json();
        const blockers = JSON.parse(data.result.content[0].text);
        setResult({
          type: "blockers",
          items: blockers,
          message: `Found ${blockers.length} task(s) currently blocked by dependencies.`,
        });
      } else if (lower.startsWith("search:") || lower.startsWith("find:")) {
        // Explicit search
        const searchTerm = textToRun.replace(/^(search|find):\s*/i, "");
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(searchTerm)}`);
        const data = await res.json();
        setResult({
          type: "search",
          data,
          message: `Found ${data.projects?.length || 0} projects, ${data.tasks?.length || 0} tasks.`,
        });
      } else {
        // Conversational AI Assistant powered by Groq
        const res = await fetch("/api/v1/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: textToRun }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Failed to generate AI response");
        setResult({
          type: "ai_chat",
          answer: data.answer,
          provider: data.provider,
          model: data.model,
          message: `Operion AI (${data.provider} · ${data.model})`,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute AI command");
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Plan a project for Launching an AI Search Engine",
    "What tasks are currently blocked across all active projects?",
    "Suggest priority focus areas for this week's milestone",
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-start justify-center pt-4 sm:pt-20 px-3 sm:px-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0f1420] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-900/50">
          <Sparkles className="w-5 h-5 text-indigo-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleExecute()}
            placeholder="Command Operion AI (e.g., 'Plan a project for...', 'What is blocked?')..."
            className="flex-1 bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin mr-2" />
          ) : (
            <button
              onClick={() => handleExecute()}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition mr-2"
            >
              Run <ArrowRight className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestions */}
        {!result && !error && (
          <div className="p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
              Suggested AI Commands
            </p>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(s);
                  handleExecute(s);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-indigo-600/15 hover:border-indigo-500/30 border border-transparent transition flex items-center justify-between group"
              >
                <span>{s}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
              </button>
            ))}
          </div>
        )}

        {/* Result Area */}
        {result && (
          <div className="p-5 space-y-3 bg-slate-900/40">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{result.message}</span>
            </div>

            {result.type === "ai_chat" && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/20 text-xs text-slate-200 leading-relaxed space-y-2 whitespace-pre-wrap max-h-72 overflow-y-auto">
                {result.answer}
              </div>
            )}

            {result.projectId && (
              <button
                onClick={() => {
                  onClose();
                  router.push(`/projects/${result.projectId}`);
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30 text-xs font-semibold transition"
              >
                Open Project Details <ArrowRight className="w-3 h-3" />
              </button>
            )}

            {result.items && result.items.length > 0 && (
              <div className="space-y-1 mt-2">
                {result.items.map((item: any) => (
                  <div key={item.id} className="text-xs p-2 rounded bg-slate-800/60 text-slate-300">
                    <span className="font-semibold text-rose-400 mr-2">[BLOCKED]</span>
                    {item.title} <span className="text-slate-500">({item.projectName})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-rose-950/30 border-t border-rose-900/50 flex items-center gap-2.5 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>AI Provider: <strong className="text-slate-200">Groq</strong> (openai/gpt-oss-120b)</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
            <span>Esc to close</span>
            <span>•</span>
            <span>Enter to run</span>
          </div>
        </div>
      </div>
    </div>
  );
}

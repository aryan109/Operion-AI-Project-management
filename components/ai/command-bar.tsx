"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  RotateCcw,
  Calendar,
  UserCheck,
  CheckSquare,
  AlertTriangle,
  Send,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ProjectTreePreview, ProjectPlanTree } from "./project-tree-preview";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export function CommandBar({ isOpen, onClose, projectId }: CommandBarProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [activePlan, setActivePlan] = useState<ProjectPlanTree | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load chat history from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("operion_command_chat_session");
      if (stored) {
        setChatMessages(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Sync chat history to sessionStorage
  useEffect(() => {
    try {
      if (chatMessages.length > 0) {
        sessionStorage.setItem("operion_command_chat_session", JSON.stringify(chatMessages));
      }
    } catch {}
  }, [chatMessages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showPreviewModal) {
          setShowPreviewModal(false);
        } else {
          onClose();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showPreviewModal, onClose]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, streamingContent]);

  if (!isOpen) return null;

  const handleStreamChat = async (userPrompt: string, history: ChatMessage[]) => {
    setIsStreaming(true);
    setStreamingContent("");

    const newHistory: ChatMessage[] = [
      ...history,
      {
        id: `msg-${Date.now()}`,
        role: "user",
        content: userPrompt,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
    setChatMessages(newHistory);

    try {
      const messagesForApi = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForApi,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `AI Chat error (${res.status})`);
      }

      if (!res.body) {
        throw new Error("ReadableStream not supported by response");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.replace(/^data:\s*/, "");
          if (dataStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.token) {
              accumulated += parsed.token;
              setStreamingContent(accumulated);
            }
          } catch {}
        }
      }

      // Append assistant response to chat history
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          content: accumulated || "Completed response.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setStreamingContent("");
    } catch (err: any) {
      setError(err.message || "Conversational streaming failed");
    } finally {
      setIsStreaming(false);
      setLoading(false);
    }
  };

  const handleExecute = async (promptText?: string) => {
    const textToRun = promptText || query;
    if (!textToRun.trim() || loading || isStreaming) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setQuery("");

    try {
      // 1. Natural Language Command Dispatcher
      const res = await fetch("/api/v1/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: textToRun,
          projectId,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Command execution failed");

      if (data.intent === "plan_project" && data.plan) {
        // Trigger Interactive Multi-Step Project Tree Preview Modal
        setActivePlan(data.plan);
        setShowPreviewModal(true);
        setResult({
          type: "plan_preview",
          message: `Generated project plan preview for "${data.plan.projectName}". Reviewing tree...`,
        });
      } else if (data.intent === "chat") {
        // Enter Conversational Streaming Mode
        await handleStreamChat(textToRun, chatMessages);
      } else {
        // Operational intent executed (assign, reschedule, status, priority, filter, blockers)
        setResult({
          type: data.intent,
          executed: data.executed,
          message: data.message,
          data: data.data,
          task: data.data?.task,
          tasks: data.data?.tasks,
        });
        if (data.executed) {
          router.refresh();
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute AI command");
    } finally {
      setLoading(false);
    }
  };

  const clearChatSession = () => {
    setChatMessages([]);
    try {
      sessionStorage.removeItem("operion_command_chat_session");
    } catch {}
  };

  const suggestions = [
    "Plan a project for Autonomous CI/CD Pipeline",
    "Assign task 'Configure Smithery MCP' to Sarah",
    "Reschedule task 'Universal OAuth' to next Friday",
    "Mark task 'Setup database' as done",
    "Filter tasks by urgent",
    "What tasks are currently blocked across workspace?",
    "Suggest top focus areas for this week",
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-start justify-center pt-4 sm:pt-16 px-3 sm:px-4 animate-in fade-in duration-200">
        <div className="w-full max-w-2xl bg-[#0f1420] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
          {/* Top Bar with Mode & Clear actions */}
          <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-slate-900/60">
            <Sparkles className="w-5 h-5 text-indigo-400 mr-2.5 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleExecute()}
              placeholder="Command Operion AI (e.g., 'Assign X to Sarah', 'Plan project for...', 'Reschedule to Friday')..."
              className="flex-1 bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none"
              disabled={loading || isStreaming}
            />

            {loading || isStreaming ? (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin mr-2" />
            ) : (
              <button
                onClick={() => handleExecute()}
                disabled={!query.trim()}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition mr-2"
              >
                Run <ArrowRight className="w-3 h-3" />
              </button>
            )}

            {chatMessages.length > 0 && (
              <button
                onClick={clearChatSession}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition mr-1"
                aria-label="Clear chat session"
              >
                <span title="Clear conversation history">
                  <RotateCcw className="w-3.5 h-3.5" />
                </span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Operational Result Notification Card */}
            {result && (
              <div
                className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-2.5 transition animate-in fade-in ${
                  result.executed
                    ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                    : "bg-slate-900/60 border-slate-700/60 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  {result.executed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>{result.message}</span>
                </div>

                {/* Specific task details if updated */}
                {result.task && (
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{result.task.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        {result.task.status && (
                          <span className="capitalize text-indigo-300">
                            Status: {result.task.status.replace("_", " ")}
                          </span>
                        )}
                        {result.task.priority && (
                          <span className="uppercase text-amber-300">
                            Priority: {result.task.priority}
                          </span>
                        )}
                        {result.task.dueDate && (
                          <span className="text-slate-300 font-mono">
                            Due: {result.task.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Multiple filtered tasks or blockers */}
                {result.tasks && result.tasks.length > 0 && (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {result.tasks.map((t: any) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-white font-medium">{t.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              t.priority === "urgent"
                                ? "bg-rose-500/20 text-rose-400"
                                : t.priority === "high"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {t.priority || "medium"}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {t.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl flex items-center gap-2.5 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Conversational Chat History */}
            {chatMessages.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    Conversational Thread ({chatMessages.length} turns)
                  </span>
                  <span className="text-emerald-400 font-mono font-normal">
                    Groq Streaming Active
                  </span>
                </div>

                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-slate-900/80 border border-indigo-500/20 text-slate-200 rounded-bl-none whitespace-pre-wrap"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {/* Streaming in progress bubble */}
                {isStreaming && (
                  <div className="flex flex-col items-start">
                    <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed bg-slate-900/80 border border-indigo-500/20 text-slate-200 rounded-bl-none whitespace-pre-wrap flex items-start gap-1">
                      <span>{streamingContent}</span>
                      <span className="inline-block w-1.5 h-3.5 bg-indigo-400 animate-pulse ml-0.5 self-center"></span>
                    </div>
                    <span className="text-[10px] text-indigo-400 mt-1 px-1 flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Streaming response...
                    </span>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>
            )}

            {/* Suggestions when no results or chats */}
            {!result && chatMessages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                  Suggested Autonomous Actions
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExecute(s)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-indigo-600/15 hover:border-indigo-500/30 border border-transparent transition flex items-center justify-between group"
                    >
                      <span>{s}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer info bar */}
          <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>
                Engine: <strong className="text-slate-200">Groq LLM + Intent Router</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
              <span>Enter to execute</span>
              <span>•</span>
              <span>Esc to close</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Project Tree Preview Modal */}
      <ProjectTreePreview
        isOpen={showPreviewModal}
        plan={activePlan}
        onClose={() => setShowPreviewModal(false)}
        onCommitted={(created) => {
          setShowPreviewModal(false);
          setResult({
            type: "project_committed",
            executed: true,
            message: `Successfully created project: "${created.name}"!`,
            task: null,
          });
        }}
      />
    </>
  );
}

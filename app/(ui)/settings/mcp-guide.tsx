"use client";

import { useState } from "react";
import { Terminal, Copy, Check, ExternalLink, Globe, Laptop, Sparkles, BookOpen } from "lucide-react";

interface McpGuideProps {
  orgId?: string;
  hostedUrl?: string;
}

export function McpGuide({
  orgId = "YOUR_WORKSPACE_ID",
  hostedUrl = "https://operion-ai-project-management.vercel.app",
}: McpGuideProps) {
  const [environment, setEnvironment] = useState<"hosted" | "local">("hosted");
  const [clientTab, setClientTab] = useState<"claude" | "gemini" | "chatgpt">("claude");
  const [copied, setCopied] = useState(false);

  const activeUrl =
    environment === "hosted"
      ? `${hostedUrl.replace(/\/$/, "")}/api/mcp`
      : "http://localhost:3000/api/mcp";

  // 1. Claude Desktop Config (supports both direct remote URL or npx mcp-remote bridge)
  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        operion: {
          url: activeUrl,
          headers: {
            "x-organization-id": orgId,
            Authorization: "Bearer <YOUR_OPERION_API_KEY>",
          },
        },
      },
    },
    null,
    2
  );

  const claudeStdioConfig = JSON.stringify(
    {
      mcpServers: {
        operion: {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            activeUrl,
            "--header",
            `x-organization-id: ${orgId}`,
            "--header",
            "Authorization: Bearer <YOUR_OPERION_API_KEY>",
          ],
        },
      },
    },
    null,
    2
  );

  // 2. Gemini & Antigravity IDE Config (mcp_config.json)
  const geminiConfig = JSON.stringify(
    {
      mcpServers: {
        operion: {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            activeUrl,
            "--header",
            `x-organization-id: ${orgId}`,
            "--header",
            "Authorization: Bearer <YOUR_OPERION_API_KEY>",
          ],
        },
      },
    },
    null,
    2
  );

  // 3. ChatGPT Custom GPT Config Info
  const chatgptOpenApiUrl = `${hostedUrl.replace(/\/$/, "")}/api/v1/openapi.json`;

  const getActiveCode = () => {
    if (clientTab === "claude") return claudeConfig;
    if (clientTab === "gemini") return geminiConfig;
    return `// ChatGPT Custom GPT Action Configuration:
// 1. In ChatGPT GPT Builder -> Actions -> Create new action
// 2. Paste OpenAPI URL or import:
${chatgptOpenApiUrl}
// 3. Authentication: API Key (Bearer)
// 4. Token: <YOUR_OPERION_API_KEY>`;
  };

  const handleCopy = () => {
    const textToCopy = getActiveCode();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/10 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Connect AI Agents via Model Context Protocol (MCP)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              31 Tools Active
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Connect Claude, Gemini, ChatGPT, or Cursor to autonomously operate this workspace.
          </p>
        </div>

        {/* Environment Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setEnvironment("hosted")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              environment === "hosted"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Hosted Cloud (Production)</span>
          </button>
          <button
            onClick={() => setEnvironment("local")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              environment === "local"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Localhost (Dev)</span>
          </button>
        </div>
      </div>

      {/* Target Server Endpoint Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Server Endpoint:</span>
          <code className="font-mono text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 break-all">
            {activeUrl}
          </code>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono">Workspace ID:</span>
          <code className="font-mono text-indigo-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
            {orgId}
          </code>
        </div>
      </div>

      {/* Client Platform Selector Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setClientTab("claude")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              clientTab === "claude"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <span>Claude Desktop & Cursor</span>
          </button>
          <button
            onClick={() => setClientTab("gemini")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              clientTab === "gemini"
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <span>Google Gemini & AGY</span>
          </button>
          <button
            onClick={() => setClientTab("chatgpt")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              clientTab === "chatgpt"
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <span>ChatGPT Custom Actions</span>
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Config</span>
            </>
          )}
        </button>
      </div>

      {/* Code Display Area */}
      <div className="relative">
        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
          {clientTab === "claude" && (
            <>
              <span className="text-slate-400">
                {`// Claude Desktop config (claude_desktop_config.json) or Cursor IDE:\n`}
              </span>
              {claudeConfig}
              <span className="text-slate-400">
                {`\n\n// Alternative using stdio bridge runner (recommended for standard Claude Desktop):\n`}
              </span>
              {claudeStdioConfig}
            </>
          )}

          {clientTab === "gemini" && (
            <>
              <span className="text-slate-400">
                {`// Google Gemini & Antigravity IDE config (mcp_config.json):\n`}
              </span>
              {geminiConfig}
            </>
          )}

          {clientTab === "chatgpt" && (
            <>
              <span className="text-emerald-400 font-semibold">
                {`// ChatGPT Custom GPT Setup (OpenAPI 3.1 Schema Integration):\n`}
              </span>
              <span className="text-slate-300">
{`1. In ChatGPT, navigate to "My GPTs" -> "Create a GPT" -> "Configure" -> "Actions" -> "Create new action"
2. Under Schema, import URL or copy JSON from:
`}
              </span>
              <span className="text-cyan-300 underline font-bold">
                {chatgptOpenApiUrl}
              </span>
              <span className="text-slate-300">
{`\n3. Under Authentication:
   - Authentication Type: API Key
   - Auth Type: Bearer
   - API Key: <Paste an Operion API key issued in the section below>
4. Save and publish to your team or personal account!`}
              </span>
            </>
          )}
        </pre>
      </div>

      {/* Quick Setup Notes */}
      <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-start justify-between gap-3 text-xs text-slate-300">
        <div className="space-y-1">
          <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Authentication Requirement</span>
          </p>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            For external AI agents (Claude, Gemini, ChatGPT), generate an API Key in the{" "}
            <strong className="text-slate-200">API Keys for External Agents</strong> section below and pass it in the{" "}
            <code className="text-indigo-300 font-mono">Authorization: Bearer &lt;key&gt;</code> header.
          </p>
        </div>
        <a
          href="/docs/mcp_configuration_guide_gemini_claude_chatgpt.md"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Full Guide</span>
        </a>
      </div>
    </div>
  );
}

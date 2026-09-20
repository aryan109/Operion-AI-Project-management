"use client";

import { useState } from "react";
import {
  Download,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  Globe,
  Laptop,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";

interface ConnectorsClientProps {
  orgId?: string;
  hostedUrl?: string;
}

export function ConnectorsClient({
  orgId = "adf9eb9c-f483-4d66-9433-a91b7d34ce39",
  hostedUrl = "https://operion-ai-project-management.vercel.app",
}: ConnectorsClientProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const mcpUrl = `${hostedUrl.replace(/\/$/, "")}/api/mcp`;
  const openApiUrl = `${hostedUrl.replace(/\/$/, "")}/api/v1/openapi.json`;
  const downloadMcpbUrl = "/dist/operion.mcpb";

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* 1. TOP HIGHLIGHT STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/10 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-600/20 text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Registered Tools
            </p>
            <p className="text-lg font-black text-white">31 MCP Tools</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-600/20 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Auth Mechanism
            </p>
            <p className="text-lg font-black text-white">OAuth 2.0 PKCE</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-purple-500/20 bg-purple-950/10 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-600/20 text-purple-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Host Environment
            </p>
            <p className="text-lg font-black text-white">Production Cloud</p>
          </div>
        </div>
      </div>

      {/* 2. CLAUDE CONNECTORS SUITE */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            Anthropic Claude Connector Suite
          </h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Official MCP Protocol
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Claude.ai Remote Connector */}
          <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 bg-purple-950/10 flex flex-col justify-between space-y-4 hover:border-purple-500/50 transition">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400">Surface 1: Web & Mobile</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  Auto-Syncs
                </span>
              </div>
              <h3 className="text-sm font-black text-white">Claude.ai Remote Connector</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connects directly to <code className="text-slate-200">claude.ai</code>. Syncs automatically across browser, desktop app, and iOS/Android mobile apps.
              </p>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 break-all">
                {mcpUrl}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href="https://claude.ai/customize/connectors"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-md shadow-purple-600/25"
              >
                <span>Add in Claude.ai</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => copyToClipboard(mcpUrl, "mcpUrl")}
                className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-800 transition"
              >
                {copiedKey === "mcpUrl" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied Endpoint!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Server URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Claude Desktop Extension (.mcpb) */}
          <div className="glass-panel p-5 rounded-2xl border border-indigo-500/30 bg-indigo-950/10 flex flex-col justify-between space-y-4 hover:border-indigo-500/50 transition">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400">Surface 2: Desktop 1-Click</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                  .mcpb Bundle
                </span>
              </div>
              <h3 className="text-sm font-black text-white">Claude Desktop Extension</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Packaged extension bundle. Double-click to install into Claude Desktop without manual JSON configuration file edits.
              </p>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                Includes manifest, stdio bridge runner, and workspace presets.
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={downloadMcpbUrl}
                download="operion.mcpb"
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-600/25"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download operion.mcpb</span>
              </a>
              <button
                onClick={() =>
                  copyToClipboard(
                    `powershell -Command "Invoke-WebRequest -Uri '${hostedUrl}/dist/operion.mcpb' -OutFile 'operion.mcpb'"`,
                    "curlMcpb"
                  )
                }
                className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-800 transition"
              >
                {copiedKey === "curlMcpb" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied CLI Command!</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Copy CLI Download</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 3: Claude Code CLI */}
          <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 flex flex-col justify-between space-y-4 hover:border-cyan-500/50 transition">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400">Surface 3: Terminal Agent</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                  Claude Code
                </span>
              </div>
              <h3 className="text-sm font-black text-white">Claude Code CLI Integration</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Add Operion directly into your Claude Code terminal assistant for command-line project and task orchestration.
              </p>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 break-all">
                claude mcp add operion -- node ./scripts/operion-mcp.mjs
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() =>
                  copyToClipboard(
                    "claude mcp add operion -- node ./scripts/operion-mcp.mjs",
                    "claudeCode"
                  )
                }
                className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-md shadow-cyan-600/25"
              >
                {copiedKey === "claudeCode" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied Command!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Claude Code Command</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CHATGPT & SMITHERY SUITE */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            OpenAI ChatGPT & Registry Connectors
          </h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            OpenAPI 3.1 & Smithery
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 4: ChatGPT Custom GPT & Actions */}
          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">OpenAI Custom Actions & Apps</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  OpenAPI 3.1
                </span>
              </div>
              <h3 className="text-sm font-black text-white">ChatGPT Custom GPT Connector</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Empower your custom GPT or OpenAI App with live Operion tools. Import our production OpenAPI schema with Bearer authentication.
              </p>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 break-all">
                {openApiUrl}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <a
                href="https://chatgpt.com/gpts/editor"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-600/25"
              >
                <span>Open in GPT Builder</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => copyToClipboard(openApiUrl, "openApiUrl")}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-800 transition"
              >
                {copiedKey === "openApiUrl" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy Schema URL</span>
              </button>
            </div>
          </div>

          {/* Card 5: Smithery CLI Registry */}
          <div className="glass-panel p-5 rounded-2xl border border-blue-500/30 bg-blue-950/10 flex flex-col justify-between space-y-4 hover:border-blue-500/50 transition">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400">Registry Distribution</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                  Smithery.ai
                </span>
              </div>
              <h3 className="text-sm font-black text-white">Smithery 1-Command Installer</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Automatically configures Claude Desktop, Cursor, and Windsurf via the official Smithery CLI using our published <code className="text-slate-200">smithery.yaml</code> descriptor.
              </p>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 break-all">
                npx -y @smithery/cli install operion --client claude
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() =>
                  copyToClipboard(
                    "npx -y @smithery/cli install operion --client claude",
                    "smithery"
                  )
                }
                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-md shadow-blue-600/25"
              >
                {copiedKey === "smithery" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied Smithery Command!</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Copy Smithery Install Command</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

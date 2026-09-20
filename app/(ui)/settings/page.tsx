import { getDefaultContext } from "@/lib/api/helper";
import * as apiKeyService from "@/lib/domain/api-key.service";
import * as workspaceService from "@/lib/domain/workspace.service";
import { Settings, Users } from "lucide-react";
import { ApiKeysClient } from "./api-keys-client";
import { McpGuide } from "./mcp-guide";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getDefaultContext();
  const [keysRes, orgRes, membersRes] = await Promise.all([
    apiKeyService.listApiKeys(ctx),
    workspaceService.getOrganization(ctx),
    workspaceService.listMembers(ctx),
  ]);

  const apiKeys = keysRes.ok ? keysRes.data : [];
  const org = orgRes.ok ? orgRes.data : null;
  const members = membersRes.ok ? membersRes.data : [];
  const hostedUrl = process.env.NEXT_PUBLIC_HOSTED_URL || "https://operion-ai-project-management.vercel.app";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-400" />
          Settings & Agent Integration
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage API keys, configure Model Context Protocol (MCP) clients for Claude, Gemini, and ChatGPT, and view workspace settings.
        </p>
      </div>

      {/* 1. MCP CONFIGURATION GUIDE (HOSTED & LOCAL) */}
      <McpGuide orgId={org?.id} hostedUrl={hostedUrl} />

      {/* 2. API KEYS CLIENT COMPONENT */}
      <ApiKeysClient initialKeys={apiKeys} orgId={org?.id} />

      {/* 3. WORKSPACE MEMBERS */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            Workspace Members ({members.length})
          </h2>
          <span className="text-xs text-slate-400 font-mono">{org?.name}</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {members.map((m: any) => (
            <div key={m.membershipId} className="py-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-white">
                  {m.fullName || m.agentName || "Workspace Member"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {m.userId ? "Human User" : "Autonomous Agent Identity"}
                </p>
              </div>
              <span className="capitalize font-bold px-2.5 py-0.5 rounded bg-slate-800 text-indigo-300">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

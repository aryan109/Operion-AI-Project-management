import { getDefaultContext } from "@/lib/api/helper";
import * as workspaceService from "@/lib/domain/workspace.service";
import { ConnectorsClient } from "./connectors-client";

export const dynamic = "force-dynamic";

export default async function ConnectorsPage() {
  const ctx = await getDefaultContext();
  const orgRes = await workspaceService.getOrganization(ctx);
  const org = orgRes.ok ? orgRes.data : null;
  const hostedUrl =
    process.env.NEXT_PUBLIC_HOSTED_URL ||
    "https://operion-ai-project-management.vercel.app";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            🔌
          </span>
          Connectors & AI Agent Integrations
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Seamlessly connect Claude, ChatGPT, Cursor, and Gemini to your Operion workspace in one click.
        </p>
      </div>

      <ConnectorsClient orgId={org?.id} hostedUrl={hostedUrl} />
    </div>
  );
}

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpBridgePath = path.join(__dirname, "operion-mcp.mjs");

const PROJECT_ID = "db7b4065-002e-410c-a80c-c9598a611b3f";

const WORKSTREAMS = {
  ui: "df81e5a1-0c87-4f77-9752-9caa18180650",
  mcp: "69842a6c-6966-4b83-9c29-98a025423965",
  external: "e442a46c-4b89-466e-96b0-0673cdb43600",
};

const itemsToCreate = [
  // --- MILESTONES ---
  {
    tool: "createMilestone",
    args: {
      projectId: PROJECT_ID,
      name: "Phase 9: Design System & Visual Elegance Polish",
      description:
        "Bespoke glassmorphic aesthetic, smooth Kanban drag-and-drop, interactive Gantt chart, and RSC streaming skeletons.",
      targetDate: "2026-10-05",
      status: "active",
    },
    key: "m9",
  },
  {
    tool: "createMilestone",
    args: {
      projectId: PROJECT_ID,
      name: "Phase 10: Advanced AI Command Intelligence & Conversational Expansion",
      description:
        "Arbitrary natural language intent dispatching, interactive project tree preview modal, and persistent conversational chat sessions.",
      targetDate: "2026-10-15",
      status: "upcoming",
    },
    key: "m10",
  },
  {
    tool: "createMilestone",
    args: {
      projectId: PROJECT_ID,
      name: "Phase 11: Production Multi-Channel Activation & Security",
      description:
        "Live Telegram Bot activation, durable outbound webhook queue, and Supabase Auth login/signup modal for multi-tenancy.",
      targetDate: "2026-10-25",
      status: "upcoming",
    },
    key: "m11",
  },

  // --- TASKS FOR MILESTONE 9 ---
  {
    tool: "createTask",
    args: {
      projectId: PROJECT_ID,
      workstreamId: WORKSTREAMS.ui,
      title: "Implement bespoke glassmorphic design system and typography hierarchy",
      description:
        "Refine card borders, subtle glowing accents, and micro-interactions across dashboard and cockpit views.",
      priority: "high",
      status: "todo",
      dueDate: "2026-09-28",
    },
    milestoneKey: "m9",
  },
  {
    tool: "createTask",
    args: {
      projectId: PROJECT_ID,
      workstreamId: WORKSTREAMS.ui,
      title: "Add smooth Kanban drag-and-drop animations and visual feedback",
      description:
        "Polish card dragging transitions, drop target indicators, and status column state changes.",
      priority: "high",
      status: "todo",
      dueDate: "2026-10-01",
    },
    milestoneKey: "m9",
  },
  {
    tool: "createTask",
    args: {
      projectId: PROJECT_ID,
      workstreamId: WORKSTREAMS.ui,
      title: "Enhance Gantt chart timeline rendering with interactive milestone markers",
      description:
        "Render zoomable time scales, dependencies link lines, and draggable milestone anchors.",
      priority: "medium",
      status: "todo",
      dueDate: "2026-10-03",
    },
    milestoneKey: "m9",
  },
  {
    tool: "createTask",
    args: {
      projectId: PROJECT_ID,
      workstreamId: WORKSTREAMS.ui,
      title: "Implement React Server Component (RSC) streaming with Suspense and shimmering skeletons",
      description:
        "Eliminate blocking spinners by streaming data slices with animated skeleton placeholders.",
      priority: "high",
      status: "todo",
      dueDate: "2026-10-04",
    },
    milestoneKey: "m9",
  },
  {
    tool: "createTask",
    args: {
      projectId: PROJECT_ID,
      workstreamId: WORKSTREAMS.ui,
      title: "Add optimistic UI updates for task status toggles and inline edits",
      description:
        "Ensure instant visual response when completing tasks, changing priorities, or editing titles.",
      priority: "medium",
      status: "todo",
      dueDate: "2026-10-05",
    },
    milestoneKey: "m9",
  },

  // --- TASKS FOR MILESTONE 10 ---
  {
    tool: "createTask",
    args: {
      projectId: PROJECT_ID,
      workstreamId: WORKSTREAMS.mcp,
      title: "Expand natural language command intent dispatching (assign, reschedule, filter)",
      description:
        "Enable the AI Command Bar to parse user commands like 'Assign task X to Sarah' and route directly to MCP tools.",
      priority: "urgent",
      status: "todo",
      dueDate: "2026-10-08",
    },
    milestoneKey: "m10",
  },
  {
    tool: "createTask",
    args: {
      projectId: PROJECT_ID,
      workstreamId: WORKSTREAMS.mcp,
      title: "Add interactive multi-step preview modal for AI-generated project trees",
      description:
        "Display proposed workstreams, milestones, and tasks in a diff modal before committing to the database.",
      priority: "high",
      status: "todo",
      dueDate: "2026-10-12",
    },
    milestoneKey: "m10",
  },
  {
    tool: "createTask",
    args: {
      projectId: PROJECT_ID,
      workstreamId: WORKSTREAMS.mcp,
      title: "Implement conversational chat session history with streaming token responses",
      description:
        "Persist multi-turn conversation context across AI queries with streamed markdown replies.",
      priority: "high",
      status: "todo",
      dueDate: "2026-10-15",
    },
    milestoneKey: "m10",
  },

  // --- TASKS FOR MILESTONE 11 ---
  {
    tool: "createTask",
    args: {
      projectId: PROJECT_ID,
      workstreamId: WORKSTREAMS.external,
      title: "Activate live conversational Telegram Bot with production bot token",
      description:
        "Connect live bot token to grammY webhook and enable interactive standup summaries via Telegram.",
      priority: "high",
      status: "todo",
      dueDate: "2026-10-18",
    },
    milestoneKey: "m11",
  },
  {
    tool: "createTask",
    args: {
      projectId: PROJECT_ID,
      workstreamId: WORKSTREAMS.external,
      title: "Implement durable webhook delivery retry queue for outbound events",
      description:
        "Add exponential backoff queue worker for external event subscribers to prevent missed deliveries.",
      priority: "medium",
      status: "todo",
      dueDate: "2026-10-21",
    },
    milestoneKey: "m11",
  },
  {
    tool: "createTask",
    args: {
      projectId: PROJECT_ID,
      workstreamId: WORKSTREAMS.external,
      title: "Build front-facing Supabase Auth login/signup modal for multi-tenant organizations",
      description:
        "Support multi-user authentication, email invitations, and organization workspace switching.",
      priority: "urgent",
      status: "todo",
      dueDate: "2026-10-25",
    },
    milestoneKey: "m11",
  },
];

async function run() {
  console.log("Starting Operion MCP batch task insertion via stdio bridge...");

  const mcpProcess = spawn("node", [mcpBridgePath], {
    stdio: ["pipe", "pipe", "inherit"],
  });

  let nextId = 100;
  const pendingRequests = new Map();
  const createdMilestones = {};

  let buffer = "";
  mcpProcess.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // retain incomplete line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const res = JSON.parse(trimmed);
        if (res.id && pendingRequests.has(res.id)) {
          const { resolve, reject } = pendingRequests.get(res.id);
          pendingRequests.delete(res.id);
          if (res.error) {
            reject(new Error(res.error.message));
          } else {
            resolve(res.result);
          }
        }
      } catch (e) {
        console.error("Failed to parse line:", line, e);
      }
    }
  });

  function callTool(name, args) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      const rpc = {
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name, arguments: args },
      };
      mcpProcess.stdin.write(JSON.stringify(rpc) + "\n");
    });
  }

  // First initialize MCP handshake
  await new Promise((resolve, reject) => {
    const id = 1;
    pendingRequests.set(id, { resolve, reject });
    mcpProcess.stdin.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        method: "initialize",
        params: { protocolVersion: "2024-11-05", capabilities: {} },
      }) + "\n"
    );
  });
  console.log("MCP initialized successfully.");

  // Iterate and create items
  for (const item of itemsToCreate) {
    if (item.tool === "createMilestone") {
      console.log(`[MCP] Creating milestone: "${item.args.name}"...`);
      const result = await callTool("createMilestone", item.args);
      const parsed = JSON.parse(result.content[0].text);
      createdMilestones[item.key] = parsed.id;
      console.log(`  -> Milestone created with ID: ${parsed.id}`);
    } else if (item.tool === "createTask") {
      const milestoneId = createdMilestones[item.milestoneKey];
      const args = { ...item.args };
      if (milestoneId) args.milestoneId = milestoneId;
      console.log(`[MCP] Creating task: "${args.title}"...`);
      const result = await callTool("createTask", args);
      const parsed = JSON.parse(result.content[0].text);
      console.log(`  -> Task created with ID: ${parsed.id}`);
    }
  }

  mcpProcess.kill();
  console.log("\nAll remaining deliverables successfully added to Operion via MCP!");
}

run().catch((err) => {
  console.error("Batch insertion failed:", err);
  process.exit(1);
});

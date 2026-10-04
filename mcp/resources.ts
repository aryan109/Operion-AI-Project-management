import { Context } from "@/lib/domain/context";
import * as workspaceService from "@/lib/domain/workspace.service";
import * as projectService from "@/lib/domain/project.service";
import * as taskService from "@/lib/domain/task.service";
import * as reportService from "@/lib/domain/report.service";

export interface ResourceDefinition {
  uri: string;
  name: string;
  mimeType: string;
  description: string;
  handler: (ctx: Context) => Promise<any>;
}

export const MCP_RESOURCES: ResourceDefinition[] = [
  {
    uri: "operion://workspace-overview",
    name: "Workspace Overview",
    mimeType: "application/json",
    description: "High-level summary of the workspace, members, and projects.",
    handler: async (ctx) => {
      const org = await workspaceService.getOrganization(ctx);
      const members = await workspaceService.listMembers(ctx);
      const portfolio = await projectService.getPortfolioAggregate(ctx);
      return {
        workspace: org.ok ? org.data : null,
        membersCount: members.ok ? members.data.length : 0,
        portfolioSummary: portfolio.ok ? portfolio.data : [],
      };
    },
  },
  {
    uri: "operion://portfolio-overview",
    name: "Portfolio Overview",
    mimeType: "application/json",
    description: "Real-time health, status, and task counts across all projects.",
    handler: async (ctx) => {
      const res = await projectService.getPortfolioAggregate(ctx);
      return res.ok ? res.data : [];
    },
  },
  {
    uri: "operion://daily-report",
    name: "Daily Report",
    mimeType: "application/json",
    description: "Latest daily standup summary with blocked, due today, and overdue work.",
    handler: async (ctx) => {
      const res = await reportService.generateDailyReport(ctx);
      return res.ok ? res.data.content : {};
    },
  },
  {
    uri: "operion://user-workload",
    name: "User Workload",
    mimeType: "application/json",
    description: "Breakdown of work items for the current actor.",
    handler: async (ctx) => {
      const res = await taskService.getMyWork(ctx);
      return res.ok ? res.data : {};
    },
  },
  {
    uri: "skill://operion/operion-project-os/SKILL.md",
    name: "Operion Project OS Skill",
    mimeType: "text/markdown",
    description: "Operion autonomous project management skill instructions, workflow guidance, and best practices.",
    handler: async () => {
      return OPERION_SKILL_CONTENT;
    },
  },
];

export const OPERION_SKILL_CONTENT = `---
name: operion-project-os
description: Operate and orchestrate autonomous project management workflows in Operion, including project planning, blocker analysis, task status updates, and reporting.
---

# Operion AI Project Management Skill

Operion is an autonomous AI-native project operating system designed to run on top of PostgreSQL via the Model Context Protocol (MCP).

## Core Principles
1. **Fact vs. Interpretation**: Distinguish between objective facts (status, dependencies, due dates) and analytical interpretations (risk levels, projected bottlenecks).
2. **Dry-Run Before Commit**: When planning a project tree, use \`previewProjectPlan\` to review workstreams, milestones, and deliverables before committing with \`commitProjectPlan\`.
3. **Directed Acyclic Graph (DAG)**: Dependencies enforce DFS cycle detection. Cycles are strictly rejected.
4. **Natural Language Dispatch**: Use \`dispatchCommand\` for high-level user instructions (assigning tasks, rescheduling, updating priorities, filtering).

## Typical Workflows

### 1. Workspace Orientation
- Call \`getProfile\` to check current identity and workspace boundary.
- Call \`getWorkspace\` or read \`operion://workspace-overview\` to understand active tracks.
- Call \`getProject\` or read \`operion://portfolio-overview\` for cross-project health.

### 2. Autonomous Project Planning
1. Run \`previewProjectPlan({ objective: "..." })\` to generate a structured project tree with workstreams, milestones, and tasks.
2. Present the preview to the user.
3. Call \`commitProjectPlan({ plan })\` to persist the approved tree to PostgreSQL.

### 3. Bottleneck & Blocker Resolution
1. Call \`findBlockers\` to identify all currently blocked deliverables.
2. Call \`analyzeBlockers({ taskId })\` to isolate the root blocking task.
3. Inspect and resolve blockers or reschedule downstream tasks using \`updateTask\`.

### 4. Natural Language Operations
- Send commands directly to \`dispatchCommand({ command })\` to automatically route:
  - "Assign task X to user Y"
  - "Reschedule task Z to tomorrow"
  - "Mark task A as done"
  - "Filter tasks by urgent"
`;


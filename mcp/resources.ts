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
];

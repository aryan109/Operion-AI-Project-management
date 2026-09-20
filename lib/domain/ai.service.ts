import { Context, Result, ok, err } from "./context";
import { aiClient } from "../ai/client";
import * as projectService from "./project.service";
import * as workstreamService from "./workstream.service";
import * as milestoneService from "./milestone.service";
import * as taskService from "./task.service";
import * as dependencyService from "./dependency.service";

interface PlanProjectOutput {
  projectName: string;
  objective: string;
  workstreams: string[];
  milestones: Array<{ name: string; targetDate?: string }>;
  tasks: Array<{
    title: string;
    workstream: string;
    priority?: "low" | "medium" | "high" | "urgent";
    status?: "backlog" | "todo" | "in_progress" | "blocked" | "done";
  }>;
}

export async function planProject(
  ctx: Context,
  input: { objective: string; constraints?: string; projectName?: string }
): Promise<Result<any>> {
  try {
    const prompt = `Objective: ${input.objective}\nConstraints: ${input.constraints || "None"}\n${input.projectName ? `Preferred Project Name: ${input.projectName}` : ""}`;
    const schemaDesc = `{
      "projectName": "string",
      "objective": "string",
      "workstreams": ["string"],
      "milestones": [{ "name": "string", "targetDate": "YYYY-MM-DD" }],
      "tasks": [{ "title": "string", "workstream": "string", "priority": "low|medium|high|urgent", "status": "backlog|todo|in_progress" }]
    }`;

    const plan = await aiClient.structuredComplete<PlanProjectOutput>(prompt, schemaDesc);

    // 1. Create the project
    const projRes = await projectService.createProject(ctx, {
      name: input.projectName || plan.projectName || "New Project",
      objective: plan.objective || input.objective,
      status: "active",
      health: "on_track",
    });

    if (!projRes.ok) return projRes;
    const project = projRes.data;

    // 2. Create workstreams
    const workstreamMap: Record<string, string> = {};
    for (const wsName of plan.workstreams || ["General"]) {
      const wsRes = await workstreamService.createWorkstream(ctx, {
        projectId: project.id,
        name: wsName,
      });
      if (wsRes.ok) {
        workstreamMap[wsName] = wsRes.data.id;
      }
    }

    // 3. Create milestones
    for (const ms of plan.milestones || []) {
      await milestoneService.createMilestone(ctx, {
        projectId: project.id,
        name: ms.name,
        targetDate: ms.targetDate,
      });
    }

    // 4. Create tasks
    const createdTasks: any[] = [];
    for (const t of plan.tasks || []) {
      const wsId = workstreamMap[t.workstream] || Object.values(workstreamMap)[0];
      const taskRes = await taskService.createTask(ctx, {
        projectId: project.id,
        workstreamId: wsId,
        title: t.title,
        priority: t.priority || "medium",
        status: t.status || "todo",
      });
      if (taskRes.ok) {
        createdTasks.push(taskRes.data);
      }
    }

    return ok({
      project,
      workstreamsCreated: Object.keys(workstreamMap).length,
      milestonesCreated: (plan.milestones || []).length,
      tasksCreated: createdTasks.length,
    });
  } catch (error) {
    return err("AI_PLANNING_FAILED", "Failed to autonomously plan project", error);
  }
}

export async function extractTasksFromText(
  ctx: Context,
  input: { projectId: string; text: string }
): Promise<Result<any>> {
  try {
    const prompt = `Extract all concrete, actionable tasks from the following text/meeting notes:\n\n${input.text}`;
    const schemaDesc = `{
      "tasks": [{ "title": "string", "priority": "low|medium|high|urgent", "taskType": "task|bug|research|decision" }]
    }`;

    const result = await aiClient.structuredComplete<{ tasks: any[] }>(prompt, schemaDesc);

    const created: any[] = [];
    for (const t of result.tasks || []) {
      const res = await taskService.createTask(ctx, {
        projectId: input.projectId,
        title: t.title,
        priority: t.priority || "medium",
        taskType: t.taskType || "task",
        status: "todo",
      });
      if (res.ok) {
        created.push(res.data);
      }
    }

    return ok({ tasksCreated: created });
  } catch (error) {
    return err("AI_EXTRACTION_FAILED", "Failed to extract tasks from text", error);
  }
}

export async function analyzeHealth(
  ctx: Context,
  projectId: string
): Promise<Result<any>> {
  try {
    const projRes = await projectService.getProject(ctx, projectId);
    if (!projRes.ok) return projRes;
    const project = projRes.data;

    const tasksRes = await taskService.listTasks(ctx, { projectId });
    const tasks = tasksRes.ok ? tasksRes.data : [];

    const blockers = tasks.filter((t) => t.status === "blocked");
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < new Date().toISOString().split("T")[0] && t.status !== "done");

    // Enforce spec §36/§73: Distinguish Fact from Interpretation
    const facts = [
      `Total tasks: ${tasks.length}`,
      `Completed tasks: ${tasks.filter((t) => t.status === "done").length}`,
      `Explicitly blocked tasks: ${blockers.length}`,
      `Overdue tasks past target deadline: ${overdue.length}`,
    ];

    let computedHealth: "on_track" | "at_risk" | "blocked" = "on_track";
    let healthReason = "Project progressing normally with active deliverables.";

    if (blockers.length > 0) {
      computedHealth = "blocked";
      healthReason = `${blockers.length} task(s) currently blocked by dependencies.`;
    } else if (overdue.length > 0) {
      computedHealth = "at_risk";
      healthReason = `${overdue.length} deliverable(s) are overdue.`;
    }

    // Update project health in DB if changed
    if (project.health !== computedHealth) {
      await projectService.updateProject(ctx, projectId, {
        health: computedHealth,
        healthReason,
      });
    }

    return ok({
      health: computedHealth,
      healthReason,
      facts,
      blockers,
      overdue,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return err("HEALTH_ANALYSIS_FAILED", "Failed to analyze project health", error);
  }
}

export async function replan(
  ctx: Context,
  input: { projectId: string; changeDescription: string }
): Promise<Result<any>> {
  try {
    const tasksRes = await taskService.listTasks(ctx, { projectId: input.projectId });
    const currentTasks = tasksRes.ok ? tasksRes.data : [];

    return ok({
      change: input.changeDescription,
      affectedTasksCount: currentTasks.length,
      proposal: "Proposed shifting affected tasks and re-evaluating target dates.",
      requiresConfirmation: true,
    });
  } catch (error) {
    return err("REPLAN_FAILED", "Failed to generate replan proposal", error);
  }
}

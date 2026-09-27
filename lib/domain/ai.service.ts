import { Context, Result, ok, err } from "./context";
import { aiClient } from "../ai/client";
import * as projectService from "./project.service";
import * as workstreamService from "./workstream.service";
import * as milestoneService from "./milestone.service";
import * as taskService from "./task.service";
import * as dependencyService from "./dependency.service";
import * as workspaceService from "./workspace.service";

export interface PlanTaskItem {
  title: string;
  workstream: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "backlog" | "todo" | "in_progress" | "blocked" | "done";
  selected?: boolean;
}

export interface ProjectPlanTree {
  projectName: string;
  objective: string;
  workstreams: string[];
  milestones: Array<{ name: string; targetDate?: string }>;
  tasks: PlanTaskItem[];
}

export async function previewProjectPlan(
  ctx: Context,
  input: { objective: string; constraints?: string; projectName?: string }
): Promise<Result<ProjectPlanTree>> {
  try {
    const prompt = `Objective: ${input.objective}\nConstraints: ${input.constraints || "None"}\n${input.projectName ? `Preferred Project Name: ${input.projectName}` : ""}`;
    const schemaDesc = `{
      "projectName": "string",
      "objective": "string",
      "workstreams": ["string"],
      "milestones": [{ "name": "string", "targetDate": "YYYY-MM-DD" }],
      "tasks": [{ "title": "string", "workstream": "string", "priority": "low|medium|high|urgent", "status": "backlog|todo|in_progress" }]
    }`;

    const plan = await aiClient.structuredComplete<ProjectPlanTree>(prompt, schemaDesc);
    const structuredPlan: ProjectPlanTree = {
      projectName: input.projectName || plan.projectName || "New Project",
      objective: plan.objective || input.objective,
      workstreams: plan.workstreams && plan.workstreams.length > 0 ? plan.workstreams : ["Engineering", "Product & Design", "Go-To-Market"],
      milestones: plan.milestones || [],
      tasks: (plan.tasks || []).map((t) => ({ ...t, selected: true })),
    };

    return ok(structuredPlan);
  } catch (error) {
    return err("AI_PLAN_PREVIEW_FAILED", "Failed to generate project plan preview", error);
  }
}

export async function commitProjectPlan(
  ctx: Context,
  plan: ProjectPlanTree
): Promise<Result<any>> {
  try {
    // 1. Create the project
    const projRes = await projectService.createProject(ctx, {
      name: plan.projectName || "New Project",
      objective: plan.objective || "Autonomous AI delivery plan",
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

    // 4. Create tasks (only selected tasks)
    const tasksToCreate = (plan.tasks || []).filter((t) => t.selected !== false);
    const createdTasks: any[] = [];
    for (const t of tasksToCreate) {
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
    return err("AI_PLAN_COMMIT_FAILED", "Failed to commit project plan", error);
  }
}

export async function planProject(
  ctx: Context,
  input: { objective: string; constraints?: string; projectName?: string }
): Promise<Result<any>> {
  const previewRes = await previewProjectPlan(ctx, input);
  if (!previewRes.ok) return previewRes;
  return commitProjectPlan(ctx, previewRes.data);
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

export interface CommandDispatchResult {
  intent:
    | "assign_task"
    | "reschedule_task"
    | "change_status"
    | "change_priority"
    | "filter_tasks"
    | "find_blockers"
    | "plan_project"
    | "chat";
  executed: boolean;
  message: string;
  data?: any;
}

export function parseNaturalDate(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  const now = new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (trimmed === "today") {
    return now.toISOString().split("T")[0];
  }
  if (trimmed === "tomorrow") {
    const d = new Date(now.getTime() + 86400000);
    return d.toISOString().split("T")[0];
  }
  if (trimmed === "next week") {
    const d = new Date(now.getTime() + 7 * 86400000);
    return d.toISOString().split("T")[0];
  }
  const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayIdx = daysOfWeek.findIndex((d) => trimmed.includes(d));
  if (dayIdx !== -1) {
    const currentDay = now.getDay();
    let diff = dayIdx - currentDay;
    if (diff <= 0) diff += 7; // Next occurrence
    const d = new Date(now.getTime() + diff * 86400000);
    return d.toISOString().split("T")[0];
  }
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return null;
}

function findBestMatchingTask(tasks: any[], query: string): any | null {
  const clean = query.trim().toLowerCase();
  if (!clean) return null;

  // 1. Exact match
  const exact = tasks.find((t) => t.title.toLowerCase() === clean);
  if (exact) return exact;

  // 2. Substring match (task contains query or query contains task)
  const substring = tasks.find(
    (t) =>
      t.title.toLowerCase().includes(clean) ||
      clean.includes(t.title.toLowerCase())
  );
  if (substring) return substring;

  // 3. Word overlap match
  const queryWords = clean.split(/\s+/).filter((w) => w.length > 2);
  let bestTask = null;
  let bestScore = 0;
  for (const t of tasks) {
    const titleWords = t.title.toLowerCase().split(/\s+/);
    let matchCount = 0;
    for (const qw of queryWords) {
      if (titleWords.some((tw: string) => tw.includes(qw) || qw.includes(tw))) {
        matchCount++;
      }
    }
    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestTask = t;
    }
  }

  return bestScore > 0 ? bestTask : null;
}

function findBestMatchingUser(members: any[], query: string): any | null {
  const clean = query.trim().toLowerCase();
  if (!clean) return null;

  // Exact fullName or agentName match
  const exact = members.find(
    (m) =>
      (m.fullName && m.fullName.toLowerCase() === clean) ||
      (m.agentName && m.agentName.toLowerCase() === clean)
  );
  if (exact) return exact;

  // Substring match
  const substring = members.find(
    (m) =>
      (m.fullName && m.fullName.toLowerCase().includes(clean)) ||
      (m.agentName && m.agentName.toLowerCase().includes(clean))
  );
  if (substring) return substring;

  return null;
}

export async function dispatchCommand(
  ctx: Context,
  input: { command: string; projectId?: string }
): Promise<Result<CommandDispatchResult>> {
  const cmd = input.command.trim();
  if (!cmd) {
    return err("EMPTY_COMMAND", "Command cannot be empty");
  }

  // Pre-fetch tasks and members for matching
  const tasksRes = await taskService.listTasks(ctx, { projectId: input.projectId });
  const allTasks = tasksRes.ok ? tasksRes.data : [];

  const membersRes = await workspaceService.listMembers(ctx);
  const allMembers = membersRes.ok ? membersRes.data : [];

  // --- 1. ASSIGN TASK ---
  const assignMatch = cmd.match(/^(?:assign|give)\s+(?:task\s+)?["']?(.+?)["']?\s+to\s+["']?(.+?)["']?$/i);
  if (assignMatch) {
    const taskQuery = assignMatch[1].trim();
    const userQuery = assignMatch[2].trim();

    const matchedTask = findBestMatchingTask(allTasks, taskQuery);
    if (!matchedTask) {
      return ok({
        intent: "assign_task",
        executed: false,
        message: `Could not find any task matching "${taskQuery}".`,
      });
    }

    const matchedUser = findBestMatchingUser(allMembers, userQuery);
    if (!matchedUser) {
      return ok({
        intent: "assign_task",
        executed: false,
        message: `Found task "${matchedTask.title}", but could not find member matching "${userQuery}".`,
        data: { task: matchedTask },
      });
    }

    const targetUserId = matchedUser.userId || matchedUser.agentId;
    const targetName = matchedUser.fullName || matchedUser.agentName || "user";
    const assignRes = await taskService.assignTask(ctx, matchedTask.id, targetUserId);
    if (!assignRes.ok) {
      return err("ASSIGN_FAILED", assignRes.error.message);
    }

    return ok({
      intent: "assign_task",
      executed: true,
      message: `Assigned "${matchedTask.title}" to ${targetName}.`,
      data: { task: matchedTask, assignee: matchedUser },
    });
  }

  // --- 2. RESCHEDULE TASK ---
  const rescheduleMatch = cmd.match(/^(?:reschedule|move|postpone|set due date of)\s+(?:task\s+)?["']?(.+?)["']?\s+(?:due date\s+)?to\s+["']?(.+?)["']?$/i);
  if (rescheduleMatch) {
    const taskQuery = rescheduleMatch[1].trim();
    const dateQuery = rescheduleMatch[2].trim();

    const matchedTask = findBestMatchingTask(allTasks, taskQuery);
    if (!matchedTask) {
      return ok({
        intent: "reschedule_task",
        executed: false,
        message: `Could not find any task matching "${taskQuery}".`,
      });
    }

    const parsedDate = parseNaturalDate(dateQuery);
    if (!parsedDate) {
      return ok({
        intent: "reschedule_task",
        executed: false,
        message: `Could not parse target date "${dateQuery}". Please use YYYY-MM-DD or relative date (e.g., tomorrow, Friday).`,
        data: { task: matchedTask },
      });
    }

    const updateRes = await taskService.updateTask(ctx, matchedTask.id, { dueDate: parsedDate });
    if (!updateRes.ok) {
      return err("RESCHEDULE_FAILED", updateRes.error.message);
    }

    return ok({
      intent: "reschedule_task",
      executed: true,
      message: `Rescheduled "${matchedTask.title}" to ${parsedDate}.`,
      data: { task: updateRes.data, dueDate: parsedDate },
    });
  }

  // --- 3. CHANGE TASK STATUS ---
  const statusMatch = cmd.match(/^(?:mark|set)\s+(?:task\s+)?["']?(.+?)["']?\s+(?:as|to)\s+["']?(done|completed|finished|in_progress|in progress|started|todo|to do|backlog|blocked)["']?$/i) ||
                      cmd.match(/^(?:complete|finish)\s+(?:task\s+)?["']?(.+?)["']?$/i) ||
                      cmd.match(/^block\s+(?:task\s+)?["']?(.+?)["']?$/i);

  if (statusMatch) {
    let taskQuery = "";
    let rawStatus = "done";

    if (cmd.toLowerCase().startsWith("complete") || cmd.toLowerCase().startsWith("finish")) {
      taskQuery = statusMatch[1].trim();
      rawStatus = "done";
    } else if (cmd.toLowerCase().startsWith("block")) {
      taskQuery = statusMatch[1].trim();
      rawStatus = "blocked";
    } else {
      taskQuery = statusMatch[1].trim();
      rawStatus = (statusMatch[2] || "done").trim().toLowerCase();
    }

    const matchedTask = findBestMatchingTask(allTasks, taskQuery);
    if (!matchedTask) {
      return ok({
        intent: "change_status",
        executed: false,
        message: `Could not find any task matching "${taskQuery}".`,
      });
    }

    let normalizedStatus: "backlog" | "todo" | "in_progress" | "blocked" | "done" = "done";
    if (["done", "completed", "finished"].includes(rawStatus)) normalizedStatus = "done";
    else if (["in_progress", "in progress", "started"].includes(rawStatus)) normalizedStatus = "in_progress";
    else if (["todo", "to do"].includes(rawStatus)) normalizedStatus = "todo";
    else if (["backlog"].includes(rawStatus)) normalizedStatus = "backlog";
    else if (["blocked"].includes(rawStatus)) normalizedStatus = "blocked";

    const statusRes = await taskService.changeTaskStatus(ctx, matchedTask.id, normalizedStatus);
    if (!statusRes.ok) {
      return err("STATUS_CHANGE_FAILED", statusRes.error.message);
    }

    return ok({
      intent: "change_status",
      executed: true,
      message: `Set "${matchedTask.title}" status to "${normalizedStatus.replace("_", " ")}".`,
      data: { task: statusRes.data, status: normalizedStatus },
    });
  }

  // --- 4. CHANGE TASK PRIORITY ---
  const priorityMatch = cmd.match(/^(?:set|change|make)\s+(?:priority of\s+)?(?:task\s+)?["']?(.+?)["']?\s+(?:priority\s+)?(?:to|as)\s+["']?(urgent|high|medium|low)["']?$/i) ||
                        cmd.match(/^(?:make|set)\s+(?:task\s+)?["']?(.+?)["']?\s+["']?(urgent|high|medium|low)["']?$/i);

  if (priorityMatch) {
    const taskQuery = priorityMatch[1].trim();
    const rawPriority = priorityMatch[2].trim().toLowerCase() as "low" | "medium" | "high" | "urgent";

    const matchedTask = findBestMatchingTask(allTasks, taskQuery);
    if (!matchedTask) {
      return ok({
        intent: "change_priority",
        executed: false,
        message: `Could not find any task matching "${taskQuery}".`,
      });
    }

    const updateRes = await taskService.updateTask(ctx, matchedTask.id, { priority: rawPriority });
    if (!updateRes.ok) {
      return err("PRIORITY_UPDATE_FAILED", updateRes.error.message);
    }

    return ok({
      intent: "change_priority",
      executed: true,
      message: `Updated "${matchedTask.title}" priority to ${rawPriority.toUpperCase()}.`,
      data: { task: updateRes.data, priority: rawPriority },
    });
  }

  // --- 5. FILTER TASKS ---
  const filterMatch = cmd.match(/^(?:filter|show|list|find)\s+(?:all\s+)?(urgent|high|medium|low|blocked|done|completed|in_progress|in progress|todo|backlog)\s*(?:tasks)?$/i) ||
                      cmd.match(/^filter\s+(?:tasks\s+)?by\s+(urgent|high|medium|low|blocked|done|todo|in_progress)$/i);

  if (filterMatch) {
    const rawFilter = filterMatch[1].trim().toLowerCase();
    let matching: any[] = [];
    let filterLabel = rawFilter;

    if (["urgent", "high", "medium", "low"].includes(rawFilter)) {
      matching = allTasks.filter((t) => t.priority === rawFilter);
      filterLabel = `${rawFilter.toUpperCase()} priority`;
    } else {
      let statusKey = rawFilter;
      if (rawFilter === "completed") statusKey = "done";
      if (rawFilter === "in progress") statusKey = "in_progress";
      matching = allTasks.filter((t) => t.status === statusKey);
      filterLabel = `status "${statusKey.replace("_", " ")}"`;
    }

    return ok({
      intent: "filter_tasks",
      executed: true,
      message: `Found ${matching.length} task(s) with ${filterLabel}.`,
      data: { tasks: matching, filter: rawFilter },
    });
  }

  // --- 6. FIND BLOCKERS ---
  if (/^(?:what is|show|find|list)\s*(?:all\s+)?block(?:ed|ers)/i.test(cmd)) {
    const blockers = allTasks.filter((t) => t.status === "blocked");
    return ok({
      intent: "find_blockers",
      executed: true,
      message: `Found ${blockers.length} task(s) currently blocked by dependencies.`,
      data: { tasks: blockers },
    });
  }

  // --- 7. PLAN PROJECT (PREVIEW) ---
  const planMatch = cmd.match(/^(?:plan|create|build|launch)\s+(?:a\s+)?(?:new\s+)?project\s*(?:for|to|called)?\s*(.+)$/i);
  if (planMatch || cmd.toLowerCase().startsWith("plan")) {
    const objective = planMatch ? planMatch[1].trim() : cmd;
    const previewRes = await previewProjectPlan(ctx, { objective });
    if (!previewRes.ok) return previewRes;

    return ok({
      intent: "plan_project",
      executed: true,
      message: `AI generated project preview for "${previewRes.data.projectName}". Review proposed workstreams and tasks below.`,
      data: { plan: previewRes.data },
    });
  }

  // --- 8. FALLBACK / CHAT INTENT ---
  return ok({
    intent: "chat",
    executed: false,
    message: "Conversational query",
    data: { prompt: cmd },
  });
}

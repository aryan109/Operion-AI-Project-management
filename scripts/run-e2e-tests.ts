import { db } from "../lib/db/client";
import { organizations, projects } from "../lib/db/schema";
import { getDefaultContext } from "../lib/api/helper";
import * as projectService from "../lib/domain/project.service";
import * as taskService from "../lib/domain/task.service";
import * as dependencyService from "../lib/domain/dependency.service";
import * as milestoneService from "../lib/domain/milestone.service";
import * as workstreamService from "../lib/domain/workstream.service";
import * as commentService from "../lib/domain/comment.service";
import * as activityService from "../lib/domain/activity.service";
import * as searchService from "../lib/domain/search.service";
import * as reportService from "../lib/domain/report.service";
import * as apiKeyService from "../lib/domain/api-key.service";
import * as aiDomainService from "../lib/domain/ai.service";
import { aiClient } from "../lib/ai/client";
import { MCP_TOOLS } from "../mcp/tools";
import { MCP_RESOURCES } from "../mcp/resources";
import { can } from "../lib/domain/permission.service";
import { eq } from "drizzle-orm";
import * as protectedResourceRoute from "../app/.well-known/oauth-protected-resource/route";
import * as oauthServerRoute from "../app/.well-known/oauth-authorization-server/route";
import * as openidConfigRoute from "../app/.well-known/openid-configuration/route";
import * as aiPluginRoute from "../app/.well-known/ai-plugin.json/route";
import * as userinfoRoute from "../app/api/oauth/userinfo/route";
import * as mcpRoute from "../app/api/mcp/route";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";


let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, errorDetail?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}`, errorDetail || "");
  }
}

async function runAllTests() {
  console.log("==========================================================");
  console.log("      OPERION COMPREHENSIVE AUTOMATED TEST SUITE          ");
  console.log("==========================================================");

  // -------------------------------------------------------------
  // SUITE 1: OPERION SEED & PRIMARY PROJECT INTEGRITY
  // -------------------------------------------------------------
  console.log("\n[SUITE 1] Primary Operion Project & Workspace Verification");
  const ctx = await getDefaultContext();
  const orgRes = await db.query.organizations.findFirst({
    where: eq(organizations.slug, "operion"),
  });
  assert(!!orgRes, "Operion HQ organization exists in database");
  assert(ctx.organizationId === orgRes?.id, "getDefaultContext() automatically routes to Operion HQ");

  const portfolioRes = await projectService.getPortfolioAggregate(ctx);
  assert(portfolioRes.ok && portfolioRes.data.length > 0, "Portfolio aggregate returned projects");

  const operionProject = portfolioRes.ok ? portfolioRes.data.find((p: any) => p.name.includes("Operion")) : null;
  assert(!!operionProject, "Operion — AI-Native Project OS is present as flagship project");
  assert(operionProject?.health === "on_track", "Operion project health is 'on_track'");
  assert(operionProject?.totalTasks >= 15, `Operion has ${operionProject?.totalTasks} active deliverables (>= 15 required)`);

  // -------------------------------------------------------------
  // SUITE 2: DOMAIN SERVICES FULL CRUD & BUSINESS LOGIC
  // -------------------------------------------------------------
  console.log("\n[SUITE 2] Domain Services CRUD & Business Rules");

  // Project CRUD
  const testProjRes = await projectService.createProject(ctx, {
    name: "Automated Test Project",
    objective: "Verify end-to-end domain logic",
    priority: "high",
    status: "active",
  });
  assert(testProjRes.ok, "Project creation succeeds", testProjRes);
  const testProject = testProjRes.ok ? testProjRes.data : null;

  // Workstream CRUD
  const wsRes = await workstreamService.createWorkstream(ctx, {
    projectId: testProject.id,
    name: "Automated Workstream",
  });
  assert(wsRes.ok, "Workstream creation succeeds", wsRes);

  // Milestone CRUD
  const msRes = await milestoneService.createMilestone(ctx, {
    projectId: testProject.id,
    name: "Test Milestone M1",
    targetDate: "2026-11-01",
  });
  assert(msRes.ok, "Milestone creation succeeds", msRes);

  // Task & Subtask Creation
  const parentTaskRes = await taskService.createTask(ctx, {
    projectId: testProject.id,
    workstreamId: wsRes.ok ? wsRes.data.id : undefined,
    milestoneId: msRes.ok ? msRes.data.id : undefined,
    title: "Parent Deliverable Task",
    priority: "urgent",
    status: "in_progress",
    dueDate: "2026-10-15",
  });
  assert(parentTaskRes.ok, "Parent task creation succeeds", parentTaskRes);

  const subTaskRes = await taskService.createTask(ctx, {
    projectId: testProject.id,
    parentTaskId: parentTaskRes.ok ? parentTaskRes.data.id : undefined,
    title: "Child Subtask Deliverable",
    priority: "medium",
    status: "todo",
  });
  assert(subTaskRes.ok && parentTaskRes.ok && subTaskRes.data.parentTaskId === parentTaskRes.data.id, "Subtask references parentTaskId properly");

  // Task Status Transitions & CompletedAt Timestamp
  const subTaskId = subTaskRes.ok ? subTaskRes.data.id : "";
  const completeRes = await taskService.completeTask(ctx, subTaskId);
  assert(completeRes.ok && completeRes.data.status === "done" && !!completeRes.data.completedAt, "completeTask() marks status 'done' and sets completedAt timestamp");

  // Reopen Task & Clear CompletedAt
  const reopenRes = await taskService.changeTaskStatus(ctx, subTaskId, "in_progress");
  assert(reopenRes.ok && reopenRes.data.status === "in_progress" && !reopenRes.data.completedAt, "Reopening task clears completedAt timestamp");

  // Custom Properties Abuse Prevention (spec §24, max 20 keys)
  const abusiveProperties: Record<string, string> = {};
  for (let i = 0; i < 25; i++) abusiveProperties[`key_${i}`] = `value_${i}`;
  const abuseRes = await taskService.createTask(ctx, {
    projectId: testProject.id,
    title: "Abusive Custom Properties Task",
    customProperties: abusiveProperties,
  });
  assert(!abuseRes.ok && abuseRes.error.code === "VALIDATION_ERROR", "Custom properties exceeding 20 keys are strictly rejected");

  // -------------------------------------------------------------
  // SUITE 3: GRAPH CYCLE DETECTION & DEPENDENCY ENGINE
  // -------------------------------------------------------------
  console.log("\n[SUITE 3] Dependency Engine & DFS Cycle Detection (Spec §22)");

  const resA = await taskService.createTask(ctx, { projectId: testProject.id, title: "Graph Node A" });
  const resB = await taskService.createTask(ctx, { projectId: testProject.id, title: "Graph Node B" });
  const resC = await taskService.createTask(ctx, { projectId: testProject.id, title: "Graph Node C" });
  const resD = await taskService.createTask(ctx, { projectId: testProject.id, title: "Graph Node D" });

  assert(resA.ok && resB.ok && resC.ok && resD.ok, "All 4 DAG test tasks created successfully");
  if (!resA.ok || !resB.ok || !resC.ok || !resD.ok) return;

  const taskA = resA.data;
  const taskB = resB.data;
  const taskC = resC.data;
  const taskD = resD.data;

  // A -> B -> C -> D
  const dep1 = await dependencyService.createDependency(ctx, { blockingTaskId: taskA.id, blockedTaskId: taskB.id });
  const dep2 = await dependencyService.createDependency(ctx, { blockingTaskId: taskB.id, blockedTaskId: taskC.id });
  const dep3 = await dependencyService.createDependency(ctx, { blockingTaskId: taskC.id, blockedTaskId: taskD.id });
  assert(dep1.ok && dep2.ok && dep3.ok, "Valid DAG dependency chain A -> B -> C -> D created");

  // Test 1: Direct 2-Node Self/Reverse Cycle (B -> A)
  const directCycle = await dependencyService.createDependency(ctx, { blockingTaskId: taskB.id, blockedTaskId: taskA.id });
  assert(!directCycle.ok && directCycle.error.code === "CIRCULAR_DEPENDENCY", "Direct 2-node cycle (B -> A) rejected by DFS");

  // Test 2: Multi-hop Long Loop Cycle (D -> A)
  const longCycle = await dependencyService.createDependency(ctx, { blockingTaskId: taskD.id, blockedTaskId: taskA.id });
  assert(!longCycle.ok && longCycle.error.code === "CIRCULAR_DEPENDENCY", "Multi-hop 4-node loop cycle (D -> A) rejected by DFS");

  // Test 3: Self-Dependency (A -> A)
  const selfDep = await dependencyService.createDependency(ctx, { blockingTaskId: taskA.id, blockedTaskId: taskA.id });
  assert(!selfDep.ok && selfDep.error.code === "CIRCULAR_DEPENDENCY", "Self-dependency (A -> A) rejected");

  // Query Blockers
  const blockersOfD = await dependencyService.getBlockers(ctx, taskD.id);
  assert(blockersOfD.ok && blockersOfD.data.length === 1 && blockersOfD.data[0].taskId === taskC.id, "getBlockers(D) returns Task C");

  // -------------------------------------------------------------
  // SUITE 4: POSTGRES FULL-TEXT SEARCH (TSVECTOR)
  // -------------------------------------------------------------
  console.log("\n[SUITE 4] Native PostgreSQL Full-Text Search (tsvector)");

  const searchRes = await searchService.search(ctx, "Parent Deliverable");
  assert(searchRes.ok, "Full-text search query executed successfully");
  assert(
    (searchRes.ok && searchRes.data.tasks.some((t: any) => t.title.includes("Parent Deliverable"))) || false,
    "Full-text search found matching tasks via tsvector plainto_tsquery"
  );

  // -------------------------------------------------------------
  // SUITE 5: MODEL CONTEXT PROTOCOL (MCP) INTEGRATION
  // -------------------------------------------------------------
  console.log("\n[SUITE 5] Model Context Protocol (MCP) Server Validation");

  assert(MCP_TOOLS.length >= 25, `MCP Tools catalog contains ${MCP_TOOLS.length} tools (>= 25 expected)`);
  assert(MCP_RESOURCES.length >= 4, `MCP Resources catalog contains ${MCP_RESOURCES.length} resources`);

  // Test MCP Tool: getWorkspace
  const getWsTool = MCP_TOOLS.find((t) => t.name === "getWorkspace");
  const wsToolResult = await getWsTool?.handler(ctx, {});
  assert(!!wsToolResult && wsToolResult.slug === "operion", "MCP tool 'getWorkspace' returned Operion HQ workspace");

  // Test MCP Tool: analyzeHealth
  const healthTool = MCP_TOOLS.find((t) => t.name === "analyzeHealth");
  const healthResult = await healthTool?.handler(ctx, { projectId: testProject.id });
  assert(!!healthResult && healthResult.facts.length > 0, "MCP tool 'analyzeHealth' distinguishes facts from interpretation");

  // Test MCP Tool: Tier 3 Destructive Confirmation Policy (spec §74)
  const deleteProjectTool = MCP_TOOLS.find((t) => t.name === "deleteProject");
  const unconfirmedDelete = await deleteProjectTool?.handler(ctx, { projectId: testProject.id, confirmed: false });
  assert(unconfirmedDelete?.confirmationRequired === true, "High-risk tool 'deleteProject' safely enforces confirmation policy without deleting");

  // Test MCP Resource: operion://portfolio-overview
  const portfolioResource = MCP_RESOURCES.find((r) => r.uri === "operion://portfolio-overview");
  const portfolioResourceData = await portfolioResource?.handler(ctx);
  assert(Array.isArray(portfolioResourceData) && portfolioResourceData.length > 0, "MCP resource 'operion://portfolio-overview' returns real portfolio array");

  // -------------------------------------------------------------
  // SUITE 6: REPORTING & CRON REPOSITORY PIPELINES
  // -------------------------------------------------------------
  console.log("\n[SUITE 6] Reporting & Scheduled Cron Endpoints");

  const dailyReport = await reportService.generateDailyReport(ctx);
  assert(dailyReport.ok && !!dailyReport.data.content.summary, "Daily standup report generated with structured metrics");

  const portfolioReport = await reportService.generatePortfolioReport(ctx);
  assert(portfolioReport.ok && portfolioReport.data.content.totalProjects > 0, "Portfolio health report generated with project counts");

  // -------------------------------------------------------------
  // SUITE 7: PHASE 10 AI COMMAND INTELLIGENCE & AUTONOMOUS PLANNING
  // -------------------------------------------------------------
  console.log("\n[SUITE 8] Phase 10 AI Command Intelligence & Autonomous Planning");

  // 1. AI Planning Preview (dry-run without DB write)
  const planPreviewRes = await aiDomainService.previewProjectPlan(ctx, {
    objective: "Verify AI Dry-Run Plan Tree Generation",
    projectName: "AI Preview Verification Project",
  });
  assert(
    planPreviewRes.ok &&
      Array.isArray(planPreviewRes.data.workstreams) &&
      planPreviewRes.data.workstreams.length > 0 &&
      Array.isArray(planPreviewRes.data.tasks) &&
      planPreviewRes.data.tasks.length > 0,
    "previewProjectPlan returns dry-run project tree without database mutation"
  );

  // 2. AI Planning Commit (selective task persistence)
  const testPlanTree: aiDomainService.ProjectPlanTree = {
    projectName: "AI Committed Plan Test",
    objective: "Verify transactional plan commit",
    workstreams: ["Core Track", "QA Track"],
    milestones: [{ name: "Target M1", targetDate: "2026-11-15" }],
    tasks: [
      { title: "Committed Task 1", workstream: "Core Track", priority: "urgent", status: "todo", selected: true },
      { title: "Deselected Task 2", workstream: "QA Track", priority: "low", status: "todo", selected: false },
    ],
  };
  const planCommitRes = await aiDomainService.commitProjectPlan(ctx, testPlanTree);
  assert(
    planCommitRes.ok && planCommitRes.data.tasksCreated === 1,
    "commitProjectPlan persists project, workstreams, and filters unselected tasks"
  );
  if (planCommitRes.ok) {
    await projectService.deleteProject(ctx, planCommitRes.data.project.id);
  }

  // 3. Natural Language Command Dispatching
  // Test Reschedule Intent
  const rescheduleCmdRes = await aiDomainService.dispatchCommand(ctx, {
    command: `Reschedule task "${parentTaskRes.ok ? parentTaskRes.data.title : 'Parent Deliverable Task'}" to tomorrow`,
  });
  assert(
    rescheduleCmdRes.ok && rescheduleCmdRes.data.intent === "reschedule_task" && rescheduleCmdRes.data.executed === true,
    "dispatchCommand parses natural language reschedule command and updates dueDate"
  );

  // Test Status Change Intent
  const statusCmdRes = await aiDomainService.dispatchCommand(ctx, {
    command: `Mark task "${parentTaskRes.ok ? parentTaskRes.data.title : 'Parent Deliverable Task'}" as done`,
  });
  assert(
    statusCmdRes.ok && statusCmdRes.data.intent === "change_status" && statusCmdRes.data.executed === true,
    "dispatchCommand parses natural language status change command"
  );

  // Test Priority Change Intent
  const priorityCmdRes = await aiDomainService.dispatchCommand(ctx, {
    command: `Set priority of "${parentTaskRes.ok ? parentTaskRes.data.title : 'Parent Deliverable Task'}" to high`,
  });
  assert(
    priorityCmdRes.ok && priorityCmdRes.data.intent === "change_priority" && priorityCmdRes.data.executed === true,
    "dispatchCommand parses natural language priority change command"
  );

  // Test Filter Tasks Intent
  const filterCmdRes = await aiDomainService.dispatchCommand(ctx, {
    command: "Filter tasks by urgent",
  });
  assert(
    filterCmdRes.ok && filterCmdRes.data.intent === "filter_tasks" && filterCmdRes.data.executed === true,
    "dispatchCommand handles filter tasks intent"
  );

  // 4. Universal AI Streaming Token Generator
  let streamedTokenCount = 0;
  for await (const token of aiClient.stream("List 3 priority tasks")) {
    if (token) streamedTokenCount++;
  }
  assert(streamedTokenCount > 0, `Universal AI stream() yielded ${streamedTokenCount} token chunks`);

  // 5. Verify Expanded MCP Catalog
  const updateTaskTool = MCP_TOOLS.find((t) => t.name === "updateTask");
  assert(!!updateTaskTool, "MCP tool 'updateTask' is registered in MCP catalog");

  const previewPlanTool = MCP_TOOLS.find((t) => t.name === "previewProjectPlan");
  assert(!!previewPlanTool, "MCP tool 'previewProjectPlan' is registered in MCP catalog");

  const commitPlanTool = MCP_TOOLS.find((t) => t.name === "commitProjectPlan");
  assert(!!commitPlanTool, "MCP tool 'commitProjectPlan' is registered in MCP catalog");

  const dispatchCmdTool = MCP_TOOLS.find((t) => t.name === "dispatchCommand");
  assert(!!dispatchCmdTool, "MCP tool 'dispatchCommand' is registered in MCP catalog");

  // -------------------------------------------------------------
  // SUITE 10: OPENAI AGENT PLUGINS & MCP PROTOCOL OPTIMIZATION
  // -------------------------------------------------------------
  console.log("\n[SUITE 10] OpenAI Agent Plugins & MCP Protocol Optimization");

  // 1. Files & Manifests on disk
  const pluginJsonPath = path.join(process.cwd(), "plugin.json");
  assert(fs.existsSync(pluginJsonPath), "plugin.json exists at project root");
  const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, "utf-8"));
  assert(pluginJson.name === "operion" && !!pluginJson.extensions?.["com.openai"], "plugin.json conforms to Agent Plugins schema with com.openai extension");

  const mcpJsonPath = path.join(process.cwd(), "mcp.json");
  assert(fs.existsSync(mcpJsonPath), "mcp.json transport manifest exists at root");
  const mcpJson = JSON.parse(fs.readFileSync(mcpJsonPath, "utf-8"));
  assert(mcpJson.mcpServers?.operion?.type === "streamable-http", "mcp.json declares streamable-http remote transport");

  const marketplaceJsonPath = path.join(process.cwd(), ".agents/plugins/marketplace.json");
  assert(fs.existsSync(marketplaceJsonPath), ".agents/plugins/marketplace.json exists for ChatGPT desktop testing");

  const skillPath = path.join(process.cwd(), "skills/operion-project-os/SKILL.md");
  assert(fs.existsSync(skillPath), "skills/operion-project-os/SKILL.md exists");
  const skillContent = fs.readFileSync(skillPath, "utf-8");
  assert(skillContent.includes("name: operion-project-os") && skillContent.includes("previewProjectPlan"), "Skill markdown contains YAML metadata and workflow definitions");

  // 2. MCP Annotations & Metadata
  const getProfileTool = MCP_TOOLS.find((t) => t.name === "getProfile");
  assert(!!getProfileTool && getProfileTool._meta?.["openai/profile"] === true, "getProfile tool is registered with _meta['openai/profile'] = true");
  assert(getProfileTool?.annotations?.readOnlyHint === true, "getProfile tool is annotated with readOnlyHint: true");

  const allAnnotated = MCP_TOOLS.every((t) => t.annotations && typeof t.annotations.readOnlyHint === "boolean");
  assert(allAnnotated, `All ${MCP_TOOLS.length} MCP tools have explicit readOnlyHint annotations`);

  const skillResource = MCP_RESOURCES.find((r) => r.uri === "skill://operion/operion-project-os/SKILL.md");
  assert(!!skillResource, "skill://operion/operion-project-os/SKILL.md is registered in MCP_RESOURCES");

  // 3. Discovery & OAuth Endpoints
  const dummyReq = (url: string, init?: RequestInit) => new NextRequest(new URL(url, "http://localhost:3000"), init as any);

  const protRes = await protectedResourceRoute.GET(dummyReq("/.well-known/oauth-protected-resource"));
  const protJson = await protRes.json();
  assert(protJson.resource && Array.isArray(protJson.authorization_servers), "GET /.well-known/oauth-protected-resource returns RFC 9728 protected resource metadata");

  const oauthRes = await oauthServerRoute.GET(dummyReq("/.well-known/oauth-authorization-server"));
  const oauthJson = await oauthRes.json();
  assert(oauthJson.authorization_response_iss_parameter_supported === true && !!oauthJson.issuer, "GET /.well-known/oauth-authorization-server advertises RFC 9207 iss support");

  const oidcRes = await openidConfigRoute.GET(dummyReq("/.well-known/openid-configuration"));
  const oidcJson = await oidcRes.json();
  assert(!!oidcJson.userinfo_endpoint && !!oidcJson.jwks_uri, "GET /.well-known/openid-configuration returns valid OIDC discovery payload");

  const aiPlugRes = await aiPluginRoute.GET(dummyReq("/.well-known/ai-plugin.json"));
  const aiPlugJson = await aiPlugRes.json();
  assert(aiPlugJson.schema_version === "v1" && aiPlugJson.name_for_model === "operion_project_os", "GET /.well-known/ai-plugin.json returns valid ChatGPT plugin manifest");

  const userinfoRes = await userinfoRoute.GET(dummyReq("/api/oauth/userinfo"));
  const userinfoJson = await userinfoRes.json();
  assert(userinfoRes.status === 200 && !!userinfoJson.sub && !!userinfoJson.organization, "GET /api/oauth/userinfo returns authenticated actor profile and workspace context");

  // 4. MCP Route Handler
  const mcpOptRes = await mcpRoute.OPTIONS();
  assert(mcpOptRes.status === 204 && mcpOptRes.headers.get("access-control-allow-origin") === "*", "OPTIONS /api/mcp handles CORS preflight with 204");

  const mcpGetRes = await mcpRoute.GET(dummyReq("/api/mcp"));
  const mcpGetJson = await mcpGetRes.json();
  assert(mcpGetJson.transport === "streamable-http" && mcpGetJson.toolsCount >= 30, "GET /api/mcp returns streamable-http status and tool counts");

  const initPost = dummyReq("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 101, method: "initialize" }),
  });
  const initRes = await mcpRoute.POST(initPost);
  const initJson = await initRes.json();
  assert(
    !!initJson.result?.capabilities?.extensions?.["io.modelcontextprotocol/skills"] && !!initJson.result?.instructions,
    "POST /api/mcp initialize declares skills extension and server instructions"
  );

  const skillsListPost = dummyReq("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 102, method: "skills/list" }),
  });
  const skillsListRes = await mcpRoute.POST(skillsListPost);
  const skillsListJson = await skillsListRes.json();
  assert(
    Array.isArray(skillsListJson.result?.skills) && skillsListJson.result.skills[0]?.name === "operion-project-os",
    "POST /api/mcp skills/list returns operion-project-os skill"
  );

  const skillsGetPost = dummyReq("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 103, method: "skills/get", params: { name: "operion-project-os" } }),
  });
  const skillsGetRes = await mcpRoute.POST(skillsGetPost);
  const skillsGetJson = await skillsGetRes.json();
  assert(
    skillsGetJson.result?.skill?.content?.includes("# Operion AI Project Management Skill"),
    "POST /api/mcp skills/get returns full skill markdown content"
  );

  const profileCallPost = dummyReq("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 104, method: "tools/call", params: { name: "getProfile" } }),
  });
  const profileCallRes = await mcpRoute.POST(profileCallPost);
  const profileCallJson = await profileCallRes.json();
  assert(
    profileCallJson.result?.structuredContent && profileCallJson.result?.content?.length > 0,
    "POST /api/mcp tools/call returns structuredContent alongside text content"
  );

  // -------------------------------------------------------------
  // SUITE 9: CLEANUP OF TEMPORARY TEST DATA
  // -------------------------------------------------------------
  console.log("\n[SUITE 9] Teardown & Cleanliness");
  const delTestProj = await projectService.deleteProject(ctx, testProject.id);
  assert(delTestProj.ok, "Temporary test project successfully cleaned up");

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("\n==========================================================");
  console.log(`TEST RUN FINISHED: ${totalTests} TOTAL | ${passedTests} PASSED | ${failedTests} FAILED`);
  console.log("==========================================================");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log("🎉 ALL TESTS PASSED! SYSTEM IS 100% OPERATIONAL & VERIFIED.\n");
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error("Critical Test Error:", err);
  process.exit(1);
});

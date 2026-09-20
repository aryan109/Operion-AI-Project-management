import { db } from "../lib/db/client";
import { organizations, memberships, projects, workstreams, milestones, tasks, taskDependencies, activityEvents } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function seedOperion() {
  console.log("==================================================");
  console.log("   SEEDING OPERION AS FIRST PROJECT IN DATABASE   ");
  console.log("==================================================");

  const demoUserId = "a0000000-0000-0000-0000-000000000001";

  // 1. Create or Find Operion HQ Organization
  let org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, "operion"),
  });

  if (!org) {
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: "Operion HQ",
        slug: "operion",
      })
      .returning();
    org = newOrg;
    console.log(`✓ Created Organization 'Operion HQ' (ID: ${org.id})`);

    // Add owner membership
    await db
      .insert(memberships)
      .values({
        organizationId: org.id,
        userId: demoUserId,
        role: "owner",
      })
      .onConflictDoNothing();
  } else {
    console.log(`✓ Found existing 'Operion HQ' Organization (ID: ${org.id})`);
  }

  // 2. Check if Operion project already exists in this org
  let project = await db.query.projects.findFirst({
    where: eq(projects.organizationId, org.id),
  });

  if (project) {
    console.log(`✓ Operion project already exists: ${project.name} (${project.id})`);
    return { orgId: org.id, projectId: project.id };
  }

  // Create Operion Project
  const [createdProject] = await db
    .insert(projects)
    .values({
      organizationId: org.id,
      name: "Operion — AI-Native Project OS",
      description: "Autonomous, lightweight AI-driven project management system operating via MCP, REST API, Telegram, and modern Next.js web UI.",
      objective: "Build and run a production-ready, model-agnostic AI project management system where UI is for visibility and AI operates the entire system.",
      status: "active",
      health: "on_track",
      healthReason: "All 10 architecture phases implemented, unit & benchmark tests passing at 129ms latency, GitHub repository live.",
      priority: "urgent",
      startDate: "2026-09-20",
      targetDate: "2026-10-31",
      ownerId: demoUserId,
    })
    .returning();

  console.log(`✓ Created Project: '${createdProject.name}' (ID: ${createdProject.id})`);

  // 3. Create Workstreams
  const wsData = [
    { name: "Core Engine & Domain Layer" },
    { name: "MCP Server & Agent Tooling" },
    { name: "Minimal Web UI & Visual Experience" },
    { name: "External Interfaces (REST & Telegram)" },
    { name: "Verification & Performance Benchmarks" },
  ];

  const createdWorkstreams = await db
    .insert(workstreams)
    .values(wsData.map((ws) => ({ projectId: createdProject.id, name: ws.name })))
    .returning();

  console.log(`✓ Created ${createdWorkstreams.length} strategic workstreams`);
  const wsMap = Object.fromEntries(createdWorkstreams.map((w) => [w.name, w.id]));

  // 4. Create Milestones
  const msData = [
    { name: "Phase 1: Foundation & PostgreSQL Schema", targetDate: "2026-09-20", status: "completed" },
    { name: "Phase 2: Project Engine & Cycle-Free DAG", targetDate: "2026-09-20", status: "completed" },
    { name: "Phase 3: Minimal Web UI & Views", targetDate: "2026-09-20", status: "completed" },
    { name: "Phase 4: Versioned REST API & Auth", targetDate: "2026-09-20", status: "completed" },
    { name: "Phase 5: Model Context Protocol (MCP) Server", targetDate: "2026-09-20", status: "completed" },
    { name: "Phase 6: AI Command Center & 8 Skill Files", targetDate: "2026-09-20", status: "completed" },
    { name: "Phase 7: Telegram Webhook & Cron Jobs", targetDate: "2026-09-20", status: "completed" },
    { name: "Phase 8: 100-Project Benchmark & Production Launch", targetDate: "2026-09-20", status: "completed" },
  ];

  const createdMilestones = await db
    .insert(milestones)
    .values(msData.map((m) => ({ projectId: createdProject.id, ...m })))
    .returning();

  console.log(`✓ Created ${createdMilestones.length} milestones`);
  const msMap = Object.fromEntries(createdMilestones.map((m) => [m.name, m.id]));

  // 5. Create Core Tasks
  const taskData = [
    // Core Engine
    {
      title: "Design & apply 20 Drizzle schema tables to Supabase",
      workstreamId: wsMap["Core Engine & Domain Layer"],
      milestoneId: msMap["Phase 1: Foundation & PostgreSQL Schema"],
      priority: "urgent",
      status: "done",
      dueDate: "2026-09-20",
    },
    {
      title: "Implement Domain Layer authorization & permission matrix",
      workstreamId: wsMap["Core Engine & Domain Layer"],
      milestoneId: msMap["Phase 1: Foundation & PostgreSQL Schema"],
      priority: "high",
      status: "done",
      dueDate: "2026-09-20",
    },
    {
      title: "Build DFS graph walk circular dependency cycle detection",
      workstreamId: wsMap["Core Engine & Domain Layer"],
      milestoneId: msMap["Phase 2: Project Engine & Cycle-Free DAG"],
      priority: "urgent",
      status: "done",
      dueDate: "2026-09-20",
    },
    {
      title: "Implement single-query portfolio aggregate (zero N+1 queries)",
      workstreamId: wsMap["Core Engine & Domain Layer"],
      milestoneId: msMap["Phase 2: Project Engine & Cycle-Free DAG"],
      priority: "high",
      status: "done",
      dueDate: "2026-09-20",
    },

    // MCP Server
    {
      title: "Implement @modelcontextprotocol/sdk JSON-RPC route at /api/mcp",
      workstreamId: wsMap["MCP Server & Agent Tooling"],
      milestoneId: msMap["Phase 5: Model Context Protocol (MCP) Server"],
      priority: "urgent",
      status: "done",
      dueDate: "2026-09-20",
    },
    {
      title: "Expose 28+ domain tools with Tier 3 confirmation policies",
      workstreamId: wsMap["MCP Server & Agent Tooling"],
      milestoneId: msMap["Phase 5: Model Context Protocol (MCP) Server"],
      priority: "high",
      status: "done",
      dueDate: "2026-09-20",
    },
    {
      title: "Assemble pre-shaped MCP resources for AI fast orientation",
      workstreamId: wsMap["MCP Server & Agent Tooling"],
      milestoneId: msMap["Phase 5: Model Context Protocol (MCP) Server"],
      priority: "medium",
      status: "done",
      dueDate: "2026-09-20",
    },

    // Web UI
    {
      title: "Design dark theme, glassmorphic panels, and glowing neon tokens",
      workstreamId: wsMap["Minimal Web UI & Visual Experience"],
      milestoneId: msMap["Phase 3: Minimal Web UI & Views"],
      priority: "high",
      status: "done",
      dueDate: "2026-09-20",
    },
    {
      title: "Implement interactive View Switcher: List, Board, Calendar, and Timeline",
      workstreamId: wsMap["Minimal Web UI & Visual Experience"],
      milestoneId: msMap["Phase 3: Minimal Web UI & Views"],
      priority: "urgent",
      status: "done",
      dueDate: "2026-09-20",
    },
    {
      title: "Build global Ctrl+K AI Command Bar with natural language planning",
      workstreamId: wsMap["Minimal Web UI & Visual Experience"],
      milestoneId: msMap["Phase 3: Minimal Web UI & Views"],
      priority: "high",
      status: "done",
      dueDate: "2026-09-20",
    },

    // External Interfaces
    {
      title: "Build versioned REST API (/api/v1/*) with SHA-256 API keys",
      workstreamId: wsMap["External Interfaces (REST & Telegram)"],
      milestoneId: msMap["Phase 4: Versioned REST API & Auth"],
      priority: "high",
      status: "done",
      dueDate: "2026-09-20",
    },
    {
      title: "Implement Telegram bot webhook mode via grammY",
      workstreamId: wsMap["External Interfaces (REST & Telegram)"],
      milestoneId: msMap["Phase 7: Telegram Webhook & Cron Jobs"],
      priority: "medium",
      status: "done",
      dueDate: "2026-09-20",
    },
    {
      title: "Configure Supabase keepalive cron and nightly standup report generator",
      workstreamId: wsMap["External Interfaces (REST & Telegram)"],
      milestoneId: msMap["Phase 7: Telegram Webhook & Cron Jobs"],
      priority: "medium",
      status: "done",
      dueDate: "2026-09-20",
    },

    // Verification & Benchmark
    {
      title: "Execute 100-project, 1,000-task benchmark and assert free-tier headroom",
      workstreamId: wsMap["Verification & Performance Benchmarks"],
      milestoneId: msMap["Phase 8: 100-Project Benchmark & Production Launch"],
      priority: "urgent",
      status: "done",
      dueDate: "2026-09-20",
    },
    {
      title: "Deploy codebase to GitHub remote and link Vercel production hosting",
      workstreamId: wsMap["Verification & Performance Benchmarks"],
      milestoneId: msMap["Phase 8: 100-Project Benchmark & Production Launch"],
      priority: "urgent",
      status: "in_progress",
      dueDate: "2026-09-25",
    },
  ];

  const createdTasks = await db
    .insert(tasks)
    .values(
      taskData.map((t) => ({
        organizationId: org.id,
        projectId: createdProject.id,
        creatorId: demoUserId,
        ...t,
      }))
    )
    .returning();

  console.log(`✓ Created ${createdTasks.length} tasks for Operion`);

  // 6. Link Sequential Dependencies
  const depEdges = [
    { fromIdx: 0, toIdx: 1 }, // Schema blocks Domain layer
    { fromIdx: 1, toIdx: 2 }, // Domain layer blocks DFS cycle check
    { fromIdx: 2, toIdx: 4 }, // DFS cycle check blocks MCP
    { fromIdx: 4, toIdx: 5 }, // MCP server blocks 28+ tools
    { fromIdx: 1, toIdx: 10 }, // Domain layer blocks REST API
    { fromIdx: 7, toIdx: 8 }, // Theme blocks View switcher
    { fromIdx: 8, toIdx: 9 }, // View switcher blocks AI Command Bar
    { fromIdx: 5, toIdx: 13 }, // MCP blocks Benchmark
    { fromIdx: 13, toIdx: 14 }, // Benchmark blocks Production deployment
  ];

  const depInserts = depEdges.map((e) => ({
    blockingTaskId: createdTasks[e.fromIdx].id,
    blockedTaskId: createdTasks[e.toIdx].id,
  }));

  await db.insert(taskDependencies).values(depInserts).onConflictDoNothing();
  console.log(`✓ Linked ${depInserts.length} milestone dependencies`);

  // 7. Log Activity Event
  await db.insert(activityEvents).values({
    organizationId: org.id,
    actorUserId: demoUserId,
    entityType: "project",
    entityId: createdProject.id,
    action: "seeded_primary_project",
    after: { name: createdProject.name, tasksCount: createdTasks.length },
  });

  console.log("==================================================");
  console.log("✓ OPERION SEEDED AS PRIMARY PROJECT SUCCESSFULLY! ");
  console.log("==================================================");

  return { orgId: org.id, projectId: createdProject.id };
}

seedOperion().then(() => process.exit(0)).catch((err) => {
  console.error("Failed to seed Operion project:", err);
  process.exit(1);
});

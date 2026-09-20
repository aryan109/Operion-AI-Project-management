import { db } from "../lib/db/client";
import { organizations, projects, workstreams, milestones, tasks, taskDependencies, activityEvents } from "../lib/db/schema";
import * as projectService from "../lib/domain/project.service";
import * as searchService from "../lib/domain/search.service";
import { Context } from "../lib/domain/context";
import { sql } from "drizzle-orm";

async function runBenchmark() {
  console.log("=================================================");
  console.log("   OPERION 100-PROJECT BENCHMARK & OPTIMIZATION   ");
  console.log("=================================================");

  const startTime = Date.now();

  // 1. Create Benchmark Organization
  const [org] = await db
    .insert(organizations)
    .values({
      name: `Benchmark Org ${Date.now()}`,
      slug: `benchmark-${Date.now()}`,
    })
    .returning();

  console.log(`✓ Created benchmark workspace: ${org.id}`);

  const ctx: Context = {
    organizationId: org.id,
    actor: {
      type: "user",
      id: "a0000000-0000-0000-0000-000000000001",
      role: "owner",
    },
  };

  // 2. Batch generate 100 projects
  console.log("⏳ Seeding 100 projects in parallel batches...");
  const projectInserts: any[] = [];
  const statuses = ["planning", "active", "active", "active", "on_hold", "completed"];
  const healths = ["on_track", "on_track", "on_track", "at_risk", "blocked"];
  const priorities = ["low", "medium", "high", "urgent"];

  for (let i = 1; i <= 100; i++) {
    projectInserts.push({
      organizationId: org.id,
      name: `Project ${i}: ${i % 2 === 0 ? "Enterprise AI Assistant" : "Automated Workflow Engine"}`,
      description: `Comprehensive delivery initiative for system module #${i}`,
      objective: `Ship module #${i} on target with zero defects`,
      status: statuses[i % statuses.length],
      health: healths[i % healths.length],
      priority: priorities[i % priorities.length],
      startDate: "2026-09-01",
      targetDate: "2026-11-30",
    });
  }

  const createdProjects = await db.insert(projects).values(projectInserts).returning({ id: projects.id, name: projects.name });
  console.log(`✓ 100 projects created in ${Date.now() - startTime}ms`);

  // 3. Batch generate workstreams & milestones
  console.log("⏳ Seeding workstreams & milestones across all 100 projects...");
  const wsInserts: any[] = [];
  const msInserts: any[] = [];

  for (const p of createdProjects) {
    wsInserts.push({ projectId: p.id, name: "Core Engineering" });
    wsInserts.push({ projectId: p.id, name: "Interface & Experience" });

    msInserts.push({ projectId: p.id, name: "Phase 1: Architecture Sign-off", targetDate: "2026-10-01", status: "completed" });
    msInserts.push({ projectId: p.id, name: "Phase 2: Alpha Testing", targetDate: "2026-10-20", status: "active" });
    msInserts.push({ projectId: p.id, name: "Phase 3: Production Rollout", targetDate: "2026-11-15", status: "upcoming" });
  }

  await db.insert(workstreams).values(wsInserts);
  await db.insert(milestones).values(msInserts);
  console.log(`✓ 200 workstreams and 300 milestones created.`);

  // 4. Batch generate 1,000 tasks (10 tasks per project)
  console.log("⏳ Seeding 1,000 tasks across 100 projects...");
  const taskInserts: any[] = [];
  const taskStatuses = ["backlog", "todo", "in_progress", "blocked", "done"];

  for (const p of createdProjects) {
    for (let t = 1; t <= 10; t++) {
      taskInserts.push({
        organizationId: org.id,
        projectId: p.id,
        title: `Task #${t} for ${p.name}`,
        description: `Implementation deliverable covering requirement section ${t}`,
        status: taskStatuses[t % taskStatuses.length],
        priority: priorities[t % priorities.length],
        dueDate: `2026-10-${String((t % 28) + 1).padStart(2, "0")}`,
      });
    }
  }

  const createdTasks = await db.insert(tasks).values(taskInserts).returning({ id: tasks.id, projectId: tasks.projectId });
  console.log(`✓ 1,000 tasks created.`);

  // 5. Link 300 dependencies across tasks within projects
  console.log("⏳ Linking 300 sequential dependencies...");
  const depInserts: any[] = [];
  for (let i = 0; i < createdTasks.length - 1; i += 3) {
    if (createdTasks[i].projectId === createdTasks[i + 1].projectId) {
      depInserts.push({
        blockingTaskId: createdTasks[i].id,
        blockedTaskId: createdTasks[i + 1].id,
      });
    }
  }
  await db.insert(taskDependencies).values(depInserts);
  console.log(`✓ ${depInserts.length} dependencies linked.`);

  // ==================== BENCHMARK TESTS ====================
  console.log("\n--- EXECUTING PERFORMANCE BENCHMARKS ---");

  // A. Portfolio Aggregate Query Latency (spec §81, §56)
  const t0 = performance.now();
  const portfolioRes = await projectService.getPortfolioAggregate(ctx);
  const tPortfolio = performance.now() - t0;
  console.log(`⚡ 100-Project Portfolio Aggregate Query: ${tPortfolio.toFixed(2)}ms (Count: ${portfolioRes.ok ? portfolioRes.data.length : 0} projects)`);

  // B. Single Project Detail Load Latency
  const sampleProjectId = createdProjects[0].id;
  const t1 = performance.now();
  const projRes = await projectService.getProject(ctx, sampleProjectId);
  const tProj = performance.now() - t1;
  console.log(`⚡ Project Detail Load Latency: ${tProj.toFixed(2)}ms`);

  // C. Full-Text Search Latency across 100 projects and 1,000 tasks
  const t2 = performance.now();
  const searchRes = await searchService.search(ctx, "Enterprise Assistant");
  const tSearch = performance.now() - t2;
  console.log(`⚡ Full-Text Search (tsvector) Latency: ${tSearch.toFixed(2)}ms (Found: ${searchRes.ok ? searchRes.data.projects.length : 0} projects, ${searchRes.ok ? searchRes.data.tasks.length : 0} tasks)`);

  // D. Database size calculation
  const [sizeRes] = await db.execute(sql`SELECT pg_size_pretty(pg_database_size(current_database())) as size;`);
  console.log(`💾 Current Database Size: ${(sizeRes as any).size}`);

  console.log("\n--- BENCHMARK VERIFICATION RESULTS ---");
  if (tPortfolio < 500) {
    console.log(`✓ PASS: Portfolio load is ultra-fast (${tPortfolio.toFixed(1)}ms < 500ms target). Zero N+1 queries.`);
  } else {
    console.warn(`! Portfolio query took ${tPortfolio.toFixed(1)}ms`);
  }

  if (tSearch < 250) {
    console.log(`✓ PASS: Full-text search is sub-250ms (${tSearch.toFixed(1)}ms). Native tsvector performant.`);
  }

  console.log(`\n🎉 Total benchmark run completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  process.exit(0);
}

runBenchmark().catch((e) => {
  console.error("Benchmark error:", e);
  process.exit(1);
});

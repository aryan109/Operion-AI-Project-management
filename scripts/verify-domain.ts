import { createOrganization } from "../lib/domain/workspace.service";
import * as projectService from "../lib/domain/project.service";
import * as taskService from "../lib/domain/task.service";
import * as dependencyService from "../lib/domain/dependency.service";
import * as activityService from "../lib/domain/activity.service";
import { Context } from "../lib/domain/context";

async function run() {
  console.log("--- Starting Domain Layer Verification ---");

  // 1. Create Organization
  const testSlug = `test-org-${Date.now()}`;
  const demoUserId = "a0000000-0000-0000-0000-000000000001";
  const orgRes = await createOrganization(demoUserId, {
    name: "Acme Test Corp",
    slug: testSlug,
  });

  if (!orgRes.ok) {
    console.error("Failed to create org:", orgRes.error);
    process.exit(1);
  }
  const org = orgRes.data;
  console.log("✓ Organization created:", org.id, org.slug);

  const ctx: Context = {
    organizationId: org.id,
    actor: {
      type: "user",
      id: demoUserId,
      role: "owner",
    },
  };

  // 2. Create Project
  const projRes = await projectService.createProject(ctx, {
    name: "Alpha SaaS Platform",
    description: "Building next-generation AI project manager",
    objective: "Ship by Q4",
    status: "active",
    priority: "urgent",
  });
  if (!projRes.ok) {
    console.error("Failed to create project:", projRes.error);
    process.exit(1);
  }
  const project = projRes.data;
  console.log("✓ Project created:", project.id, project.name);

  // 3. Create Tasks & Subtask
  const task1Res = await taskService.createTask(ctx, {
    projectId: project.id,
    title: "Setup Cloud Infrastructure",
    priority: "high",
    status: "in_progress",
  });
  const task1 = task1Res.ok ? task1Res.data : null;

  const task2Res = await taskService.createTask(ctx, {
    projectId: project.id,
    title: "Deploy Database & Migrations",
    parentTaskId: task1?.id,
    priority: "urgent",
    status: "todo",
  });
  const task2 = task2Res.ok ? task2Res.data : null;
  console.log("✓ Tasks created. Parent task:", task1?.id, "Subtask:", task2?.id);

  // 4. Test Dependency & Cycle Detection
  const depRes1 = await dependencyService.createDependency(ctx, {
    blockingTaskId: task1!.id,
    blockedTaskId: task2!.id,
  });
  console.log("✓ Dependency created (Task 1 blocks Task 2):", depRes1.ok);

  // Now attempt reverse dependency (Task 2 blocks Task 1) -> must fail with CIRCULAR_DEPENDENCY
  const cycleAttempt = await dependencyService.createDependency(ctx, {
    blockingTaskId: task2!.id,
    blockedTaskId: task1!.id,
  });
  if (!cycleAttempt.ok && cycleAttempt.error.code === "CIRCULAR_DEPENDENCY") {
    console.log("✓ Cycle detection confirmed: Successfully blocked circular dependency:", cycleAttempt.error.message);
  } else {
    console.error("X Cycle detection FAILED! Expected circular dependency rejection.");
    process.exit(1);
  }

  // 5. Verify Activity Events
  const activityRes = await activityService.listActivity(ctx);
  console.log("✓ Activity events recorded:", activityRes.ok ? activityRes.data.length : 0);

  // 6. Test Portfolio Aggregate Query
  const portfolioRes = await projectService.getPortfolioAggregate(ctx);
  if (portfolioRes.ok && portfolioRes.data.length > 0) {
    console.log("✓ Portfolio aggregate query succeeded:", portfolioRes.data[0].name, "Task counts:", portfolioRes.data[0].taskCounts);
  } else {
    console.error("X Portfolio aggregate failed:", portfolioRes);
    process.exit(1);
  }

  console.log("--- All Domain Layer Checks Passed Successfully! ---");
  process.exit(0);
}

run().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});

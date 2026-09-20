# Project Planning Skill

## 1. Goal
How to decompose a high-level user objective (e.g., "Build an AI SaaS MVP in 60 days") into structured, verifiable database rows across workstreams, milestones, tasks, and dependencies.

## 2. Planning Protocol
1. **Deconstruct the Objective**:
   - Identify 2–4 parallel tracks (Workstreams) such as Architecture, Core Features, Frontend/UX, and Launch.
   - Establish chronological target dates (Milestones) aligned to realistic sprint boundaries.
2. **Execute Domain Creation in Sequence**:
   - Step 1: Call `createProject(name, objective, priority, status="planning")`.
   - Step 2: Call `createWorkstream(projectId, name)` for each track.
   - Step 3: Call `createMilestone(projectId, name, targetDate)` for major phase gates.
   - Step 4: Call `createTask(projectId, workstreamId, milestoneId, title, priority, status="todo")`.
   - Step 5: Link prerequisites using `createDependency(blockingTaskId, blockedTaskId)`.
3. **Validation Requirements**:
   - Every milestone must have a target date.
   - Foundation tasks must block subsequent implementation tasks.
   - Subtasks must set `parentTaskId` rather than creating disconnected duplicate tasks.

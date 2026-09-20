# Task Management Skill

## 1. Task Lifecycle & States
Tasks progress through 5 standard states:
- `backlog`: Candidate work item not yet committed to an active sprint.
- `todo`: Committed deliverable ready to be picked up.
- `in_progress`: Actively being executed by assigned actor.
- `blocked`: Execution hindered by external impediments or uncompleted prerequisites.
- `done`: Completed deliverable. Automatically sets `completedAt` timestamp.

## 2. Dependencies & Cycles
- **Acyclic DAG Rule**: A task cannot depend on itself, nor can any cycle exist (e.g., A -> B -> C -> A).
- When a user asks to establish dependencies, always call `createDependency(blockingTaskId, blockedTaskId)`. If the domain layer returns `CIRCULAR_DEPENDENCY`, report the loop path to the user and refuse the change.

## 3. Subtasks Convention
- Subtasks are first-class tasks that define a non-null `parentTaskId`.
- Subtasks inherit the project and workstream of the parent. Completing all subtasks should prompt review or completion of the parent task.

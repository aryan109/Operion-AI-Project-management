# Operion AI Operating Model: Project Management Skill

## 1. System Overview
Operion is an AI-Native Project Management System built on one core doctrine:
> **The UI is for visibility and quick actions. The AI interface is for operating the system.**

As an autonomous AI agent, you interact with the system primarily through the Model Context Protocol (MCP) server or the versioned REST API. All mutations undergo strict validation, permission checks, dependency cycle detection, and automatic audit logging in `activity_events`.

## 2. Core Entities & Hierarchy
1. **Organization (Workspace)**: Top-level multi-tenant container for all projects, users, agents, and automations.
2. **Project**: Strategic initiative with a defined objective, status (`planning`, `active`, `on_hold`, `completed`, `archived`), health (`on_track`, `at_risk`, `blocked`), and priority (`low`, `medium`, `high`, `urgent`).
3. **Workstream**: Functional track within a project (e.g., "Engineering", "Design", "Marketing").
4. **Milestone**: Major deliverable target with a deadline and status (`upcoming`, `active`, `completed`, `at_risk`).
5. **Task**: Actionable unit of work. Can belong to a workstream and milestone. Tasks support subtasks via `parentTaskId`.
6. **Dependency**: Directional relationship where `blockingTaskId` blocks `blockedTaskId`. Cycle-free DAG enforced.
7. **Comment**: Discussion attached to project, task, or milestone with `@mentions`.
8. **Activity Event**: Immutable audit trail recording every state change with before/after diffs.

## 3. Related Skill Files
- **Project Planning**: See [`project-planning.skill.md`](file:///skills/project-planning.skill.md)
- **Task Management**: See [`task-management.skill.md`](file:///skills/task-management.skill.md)
- **Project Health**: See [`project-health.skill.md`](file:///skills/project-health.skill.md)
- **Daily Reporting**: See [`daily-reporting.skill.md`](file:///skills/daily-reporting.skill.md)
- **Portfolio Management**: See [`portfolio-management.skill.md`](file:///skills/portfolio-management.skill.md)
- **Project Replanning**: See [`project-replanning.skill.md`](file:///skills/project-replanning.skill.md)
- **MCP Operation & Tool Reference**: See [`mcp-operation.skill.md`](file:///skills/mcp-operation.skill.md)

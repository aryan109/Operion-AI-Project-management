# MCP Operation & Tool Reference Skill

## 1. Authentication
- Send HTTP header: `Authorization: Bearer <API_KEY>` or `x-organization-id: <ORG_ID>`.
- The MCP server is mounted at endpoint `/api/mcp`.

## 2. Risk Tiers & Confirmation Policy (spec §74)
- **Tier 1 (Low Risk - Autonomous execution)**:
  - Reads (`getWorkspace`, `listProjects`, `getTask`, `readActivity`, `generateDailyReport`).
  - Safe mutations (`createTask`, `updateTask`, `addComment`, `createWorkstream`).
- **Tier 2 (Medium Risk - State transitions)**:
  - `changeTaskStatus` to `done`, `archiveProject`, `replanProject`.
- **Tier 3 (High Risk - Destructive - Explicit confirmation required)**:
  - `deleteProject`: Will return `confirmationRequired: true` on initial call. Must be re-called with `confirmed: true`.
  - `bulkDeleteTasks`: Requires `confirmed: true`.

## 3. Pre-Shaped Resources
Instead of making multiple tool calls to orient yourself, read resources first:
- `operion://workspace-overview`: Org details and project count.
- `operion://portfolio-overview`: Full project health and task count summary.
- `operion://daily-report`: The current day's operational brief.
- `operion://user-workload`: Breakdown of tasks assigned to current actor.

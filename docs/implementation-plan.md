# AI-Native Lightweight PM System — Implementation Plan

*Derived from the v1.0 Product & Technical Specification. This plan turns the 101 spec sections into a buildable sequence: locked tech decisions, schema, phase-by-phase task lists with exit criteria, MCP/API surface, and a benchmark plan.*

---

## 0. How to Read This Plan

- **Sections 1–6** are one-time architectural decisions — make these before writing feature code.
- **Sections 7–16** are the ten build phases from spec §101, expanded into concrete, checkable tasks.
- **Sections 17–21** are reference tables (MCP tools, REST routes, webhooks) you'll fill in as you build — treat them as the contract every interface must match.
- **Sections 22–24** are testing, risks, and a week-one checklist.

---

## 1. Architecture at a Glance

```
                    ┌─────────────────────────────┐
Web UI  ──────────► │                              │
REST API ─────────► │   Application/Domain Layer   │ ────► Supabase Postgres
MCP Server ───────► │   (single source of truth    │        (+ Auth, minimal Storage)
Telegram Bot ─────► │    for business rules)       │
Automations ──────► │                              │
                    └─────────────────────────────┘
```

Non-negotiable rule (spec §4, §96): **no interface talks to Postgres directly.** UI server actions, REST handlers, MCP tools, and the Telegram bot all call the same domain service functions. This is the single decision that keeps the "UI for visibility, AI for everything else" principle true in practice — if you skip it, MCP and REST will silently drift apart from the UI's business rules within a few weeks.

---

## 2. Confirmed Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui | Matches spec §6; shadcn keeps bundle small (no heavy component lib), server components cut client JS |
| Hosting | Vercel Hobby | Free, matches spec §7 |
| Database | Supabase Postgres | Free tier, matches spec §6 |
| Auth | Supabase Auth (email + magic link to start) | No need to build auth from scratch |
| ORM/migrations | Drizzle ORM | Type-safe schema-as-code, lightweight, plays well with plain SQL for the aggregate queries §56 demands |
| Runtime queries | Supabase JS client (service-role for domain layer, anon+RLS for any direct client reads) | Matches Supabase's model |
| Validation | Zod | One schema per entity, shared by REST handlers, MCP tool input, and UI forms — avoids validating the same shape three different ways |
| MCP server | `@modelcontextprotocol/sdk` (TypeScript), mounted as a Next.js route handler (`/api/mcp`) | One deployable, matches spec §41 "MCP is first-class" without standing up a second service |
| Telegram | grammY, **webhook mode only** (not long-polling) | Long-polling needs an always-on process, which Vercel Hobby doesn't give you |
| AI provider | Provider-agnostic wrapper in `lib/ai/client.ts` exposing `complete()` / `structuredComplete()` | Matches spec §6 "model-agnostic" — swap providers behind one file |
| Background/scheduled work | Vercel Cron hitting API routes | See §9.1 constraint below — Hobby cron is capped to once/day per job |

### 2.1 Free-tier constraints that shape the architecture (checked against current published limits)

**Supabase Free** (per organization): 2 active projects, 500 MB database, 1 GB file storage, 5 GB egress/month, 50,000 MAU, 500,000 Edge Function invocations/month, 200 concurrent Realtime connections, 7-day log retention, and — the one that matters most for this product — **free projects auto-pause after 7 days of inactivity**.

**Vercel Hobby**: function memory up to 2 GB, function duration up to 300s (current Fluid Compute default/max), 1M function invocations/month, 100 GB fast data transfer/month, 45-minute build cap, and **cron jobs are capped to once-per-day cadence** (up to 100 cron *jobs*, but each can only fire daily on Hobby — anything more frequent silently fails to deploy).

Concrete implications, folded into the phases below:
- **Inactivity pause**: add a trivial daily cron (`/api/cron/keepalive`) that pings the DB, so a workspace that isn't opened for a week doesn't get paused mid-use.
- **Cron cadence**: the spec's "every evening → generate daily report" (§52) fits Hobby cron directly. Anything wanting sub-daily automation (hourly overdue sweeps, etc.) needs a different trigger — see §16 Automation Engine, which recommends **lazy/on-access evaluation** (compute overdue status when a page or report is requested) instead of a scheduled sweep, matching spec §58's "deterministic before AI" principle anyway.
- **DB size (500 MB)**: comfortably fits 100 projects + thousands of tasks as long as no binary attachments live in Postgres or Supabase Storage as the primary store — matches spec §59 exactly, so no schema change needed, just discipline (store URLs, not files).
- **2 active Supabase projects**: enough for `production` + one `staging`/`dev` project; don't plan on a third environment without upgrading.

---

## 3. Repository Layout

Single Next.js app (no monorepo needed at this scale — spec explicitly says minimal infra):

```
/app
  /(ui)                     # human-facing routes: Home, Projects, Project, My Work, Today
  /api
    /v1/...                 # REST API (versioned, spec §88)
    /mcp                     # MCP server route
    /telegram/webhook        # Telegram bot webhook
    /cron
      /daily-report
      /keepalive
    /webhooks/dispatch        # outbound webhook fan-out worker
/lib
  /domain                    # <-- the one business layer everything calls
    workspace.service.ts
    project.service.ts
    workstream.service.ts
    milestone.service.ts
    task.service.ts
    dependency.service.ts
    comment.service.ts
    activity.service.ts
    tag.service.ts
    report.service.ts
    automation.service.ts
    permission.service.ts
    ai.service.ts             # planning / health / replanning / extraction
  /db
    schema.ts                 # Drizzle schema (source of truth, §5 below)
    client.ts
  /ai
    client.ts                  # provider-agnostic wrapper
    prompts/                   # one file per AI capability
  /validation                 # Zod schemas, imported by domain + REST + MCP
  /telegram
    commands.ts
/mcp
  tools/                       # one file per MCP tool category (§17)
  resources/
/skills                        # the 8 .skill.md files (§13/§50)
```

---

## 4. Domain Layer Contract

Every service function has the same shape, so REST/MCP/UI/Telegram/automations can all call it identically:

```ts
type Context = {
  organizationId: string;
  actor: { type: 'user' | 'agent'; id: string; permissions: Permission[] };
};

async function createTask(ctx: Context, input: CreateTaskInput): Promise<Result<Task>>
```

Rules for every function in `/lib/domain`:
1. Takes `ctx` first — permission checks happen *inside* the function, not in the caller, so no interface can accidentally skip authorization.
2. Never returns raw DB rows to callers that don't have permission to see every column (e.g., strip internal fields before returning to MCP/REST).
3. Writes an `activity_events` row for every mutation (spec §26) as its last step, in the same DB transaction.
4. Returns a typed `Result<T>` (`{ ok: true, data } | { ok: false, error }`), so REST/MCP/UI can translate it into their own error shape without the domain layer knowing about HTTP or JSON-RPC.

---

## 5. Database Schema (Postgres via Drizzle, deployed to Supabase)

Core DDL sketch — write this as Drizzle schema, not raw migrations, so types flow automatically into the domain layer:

```sql
-- Organizations (workspaces)
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text default 'UTC',
  notification_prefs jsonb default '{}'::jsonb
);

-- Agent identities (service accounts, spec §45)
create table agent_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Memberships (users AND agents, one role model)
create table memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  agent_id uuid references agent_identities(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer','agent')),
  created_at timestamptz not null default now(),
  check ((user_id is not null) <> (agent_id is not null))
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  objective text,
  owner_id uuid references profiles(id),
  status text not null default 'planning'
    check (status in ('planning','active','on_hold','completed','archived')),
  health text default 'on_track' check (health in ('on_track','at_risk','blocked')),
  health_reason text,
  priority text default 'medium' check (priority in ('low','medium','high','urgent')),
  start_date date,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_projects_org_status on projects(organization_id, status);

create table project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (project_id, user_id)
);

create table workstreams (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  owner_id uuid references profiles(id),
  target_date date,
  status text default 'upcoming' check (status in ('upcoming','active','completed','at_risk')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_milestones_project on milestones(project_id);

-- Tasks double as subtasks via parent_task_id (spec §17)
create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  workstream_id uuid references workstreams(id) on delete set null,
  parent_task_id uuid references tasks(id) on delete cascade,
  milestone_id uuid references milestones(id) on delete set null,
  title text not null,
  description text,
  task_type text default 'task'
    check (task_type in ('task','feature','bug','research','idea','decision','request')),
  status text not null default 'backlog'
    check (status in ('backlog','todo','in_progress','blocked','done')),
  priority text default 'medium' check (priority in ('low','medium','high','urgent')),
  creator_id uuid references profiles(id),
  start_date date,
  due_date date,
  completed_at timestamptz,
  custom_properties jsonb default '{}'::jsonb,   -- spec §24, no schema change per new field
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_project_status on tasks(project_id, status);
create index idx_tasks_due_date on tasks(due_date) where due_date is not null;
create index idx_tasks_parent on tasks(parent_task_id) where parent_task_id is not null;
create index idx_tasks_milestone on tasks(milestone_id) where milestone_id is not null;

create table task_assignees (
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (task_id, user_id)
);
create index idx_task_assignees_user on task_assignees(user_id);

create table task_dependencies (
  id uuid primary key default gen_random_uuid(),
  blocking_task_id uuid not null references tasks(id) on delete cascade,
  blocked_task_id uuid not null references tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocking_task_id, blocked_task_id),
  check (blocking_task_id <> blocked_task_id)
);
create index idx_deps_blocking on task_dependencies(blocking_task_id);
create index idx_deps_blocked on task_dependencies(blocked_task_id);
-- Circular-dependency prevention (spec §22) happens in the domain layer via
-- a graph walk before insert, NOT as a DB constraint (Postgres can't express
-- "no cycles" declaratively for an arbitrary-depth graph).

create table tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  unique (organization_id, name)
);
create table task_tags (
  task_id uuid references tasks(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (task_id, tag_id)
);
create table project_tags (
  project_id uuid references projects(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (project_id, tag_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('project','task','milestone')),
  entity_id uuid not null,
  author_user_id uuid references profiles(id),
  author_agent_id uuid references agent_identities(id),
  content text not null,
  mentions uuid[] default '{}',
  created_at timestamptz not null default now(),
  check ((author_user_id is not null) <> (author_agent_id is not null))
);
create index idx_comments_entity on comments(entity_type, entity_id);

create table activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_user_id uuid references profiles(id),
  actor_agent_id uuid references agent_identities(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index idx_activity_org_created on activity_events(organization_id, created_at desc);
create index idx_activity_entity on activity_events(entity_type, entity_id);

create table reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  report_type text not null check (report_type in ('daily','weekly','project','portfolio')),
  scope_id uuid,
  content jsonb not null,
  generated_at timestamptz not null default now()
);
create index idx_reports_org_type_date on reports(organization_id, report_type, generated_at desc);

create table automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  trigger jsonb not null,
  condition jsonb,
  action jsonb not null,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  hashed_key text not null,
  scopes text[] default '{}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  url text not null,
  events text[] not null,
  secret text not null,
  is_active boolean default true,
  created_at timestamptz not null default now()
);
```

**Design notes:**
- `custom_properties jsonb` on tasks avoids a schema migration per new field (spec §24) while staying queryable via GIN index if it becomes a bottleneck.
- `activity_events.before/after` stays compact (only changed fields, not full-entity snapshots) — matches spec §26/§60.
- No separate "subtask" table (spec §17) — one `tasks` table, `parent_task_id` self-reference.

---

## 6. Authorization & RLS Strategy (spec §67–70)

Two layers, per spec §68:
1. **Application layer (authoritative)** — every domain service function checks `ctx.actor.permissions` before mutating. This is where agent-scoped permissions (§45) and confirmation policy (§74) actually live.
2. **Supabase RLS (defense in depth)** — since the domain layer uses the Supabase **service role** (bypasses RLS) for its own queries, RLS's job here is narrower: protect against any code path that accidentally queries with a user's JWT directly (e.g. a client-side Supabase call you forgot to route through an API route). Minimum RLS policy per table: `organization_id in (select organization_id from memberships where user_id = auth.uid())`.

Role → default capability matrix (build this as a static table the domain layer consults, not per-row config, to keep it simple for v1):

| Role | Read | Create/Edit tasks | Delete project | Manage members | Generate reports |
|---|---|---|---|---|---|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ (confirm) | ✅ | ✅ |
| Member | ✅ | ✅ | ❌ | ❌ | ✅ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ✅ |
| Agent | per `agent_identities.permissions` | scoped | ❌ by default | ❌ | scoped |

---

## 7. Phase 1 — Foundation

**Goal:** the domain layer, DB, and auth exist; nothing user-facing yet.

- [ ] Supabase project (prod) + Supabase project (staging) created
- [ ] Drizzle schema for: organizations, profiles, agent_identities, memberships, projects, project_members, workstreams, tasks, task_assignees
- [ ] Supabase Auth wired (magic link), `profiles` row auto-created on signup (DB trigger)
- [ ] RLS policies for all tables above (§6)
- [ ] `permission.service.ts` — role matrix + `can(ctx, action, resource)` helper
- [ ] `workspace.service.ts` — create org, invite member, list members
- [ ] `project.service.ts` — CRUD + status/health transitions
- [ ] `task.service.ts` — CRUD, assign/reassign, status/priority change, subtask creation
- [ ] `activity.service.ts` — `record(ctx, entityType, entityId, action, before, after)`, called from every mutation above

**Exit criteria:** can create an org, invite a member, create a project, create a task with a subtask, assign it, and see the resulting rows in `activity_events` — all through direct calls to the domain layer (no UI yet, test via a script or REST stub).

---

## 8. Phase 2 — Project Engine

**Goal:** the full data model spec describes (minus AI) is complete and queryable.

- [ ] `milestone.service.ts` — CRUD, link tasks, status transitions
- [ ] `dependency.service.ts` — create/remove, **cycle detection via graph walk before insert**, `getBlockers(taskId)`, `getBlockedTasks(taskId)`
- [ ] `tag.service.ts` — CRUD, attach/detach on tasks and projects
- [ ] `comment.service.ts` — add/list per entity, mention parsing
- [ ] Custom properties: validation layer capping count per workspace (spec §24 "should be controlled to prevent abuse") — e.g. max 20 keys/entity
- [ ] Global search: Postgres full-text search (`tsvector` generated column) across projects/tasks/milestones — **do not** introduce a separate search engine (spec §31)
- [ ] Portfolio aggregate query: one query returning `{project, taskCounts by status, health, nextMilestone}` for all projects in an org — must not load individual tasks (spec §81)

**Exit criteria:** can run the 100-project / thousands-of-tasks benchmark data set (see §22) against the portfolio query and get project-metadata-only results back, with dependency cycle attempts correctly rejected.

---

## 9. Phase 3 — Minimal UI

**Goal:** a human can do everything "quick" without AI (spec §63–64).

- [ ] **Home** — active projects, health badges, today's priorities, overdue items, upcoming milestones (all server components, one aggregate query each)
- [ ] **Projects** — list with status/health/progress/owner/deadline, filterable
- [ ] **Project page** — overview, milestones, task list/board toggle, dependencies, activity feed
- [ ] **My Work** — assigned tasks split into Today / Upcoming / Overdue / Blocked / Recently completed
- [ ] **Today** — due today, overdue, high priority, blocked, recently assigned
- [ ] Views: List, Board (drag-drop status change → calls `task.service.updateStatus`), Calendar, Timeline — **all read from the same `tasks` query**, just different client-side grouping (spec §27, "must not create separate copies")
- [ ] Quick actions (spec §64): create task, change status/assignee/due date/priority, add comment, complete — each a single server action calling the matching domain function, optimistic UI update

**Exit criteria:** a new user can sign up, create a project by hand, add tasks/milestones/dependencies, and see them reflected in Home/My Work/Today without touching AI or the API.

---

## 10. Phase 4 — REST API

**Goal:** everything Phase 1–3 can do is available over HTTP (spec §46).

- [ ] `/api/v1/*` route handlers — thin wrappers: parse+Zod-validate request → build `ctx` from API key → call domain function → serialize `Result<T>`
- [ ] API key issuance/revocation (`api_keys` table), hashed at rest, scopes enforced in `permission.service.ts`
- [ ] Rate limiting (simple token bucket in Postgres or Upstash Redis free tier — avoid adding new infra if a DB-backed counter is fast enough at this scale)
- [ ] Structured error responses (spec §75) — `{ error: { code, message, details } }`, consistent shape for 400/401/403/404/409/429
- [ ] Route table filled in from §18 below

**Exit criteria:** every quick action from Phase 3's UI has a REST equivalent that a `curl` request (with a valid API key) can execute end to end.

---

## 11. Phase 5 — MCP Server

**Goal:** an AI agent can operate the whole system through MCP (spec §41–45).

- [ ] `/api/mcp` route using `@modelcontextprotocol/sdk`, authenticated via API key or workspace-scoped MCP token
- [ ] Every tool in §17 below implemented as a thin wrapper over the domain layer (same pattern as REST)
- [ ] MCP **resources** (§43): `workspace-overview`, `portfolio-overview`, `project-context`, `daily-report`, `user-workload` — pre-shaped JSON so an agent doesn't need 5 tool calls to get oriented
- [ ] Agent identity flow: MCP token maps to an `agent_identities` row → `ctx.actor = { type: 'agent', id, permissions }`
- [ ] Confirmation policy (spec §74) enforced at the tool layer: high-risk tools (`deleteProject`, `bulkDelete`) return a "confirmation required" result on first call, and only execute when re-invoked with a `confirmed: true` flag — unless the calling agent's identity has been granted autonomous execution
- [ ] Audit: every MCP tool call writes to `activity_events` with `actor_agent_id` set (spec §72)

**Exit criteria:** connect Claude (or another MCP client) directly to `/api/mcp`, and complete the example workflow in spec §91 (create project → workstreams → milestones → tasks → dependencies → report) purely through tool calls.

---

## 12. Phase 6 — AI Command Center

**Goal:** natural-language operations, both in-UI and via MCP resources built above.

- [ ] `ai.service.ts` capabilities, each a function that (a) gathers real data via domain-layer reads, (b) calls the AI client with that data plus the user's request, (c) either returns text or **executes real domain mutations** the AI proposed (never lets the AI fabricate a "plan" that isn't backed by actual created rows):
  - `planProject(ctx, objective, constraints)` → creates workstreams/milestones/tasks/dependencies
  - `extractTasksFromText(ctx, projectId, text)` → creates tasks from notes/meeting transcripts
  - `analyzeHealth(ctx, projectId)` → reads tasks/milestones/dependencies/activity, returns `{health, reason, evidence, risks}`, distinguishing fact from interpretation (spec §36/§73)
  - `replan(ctx, projectId, change)` → identifies affected milestones/tasks/dependencies, proposes a diff, requires confirmation before applying (spec §37)
  - `reviewPortfolio(ctx)` → scans all projects' aggregate data, surfaces what needs attention (spec §38)
- [ ] In-UI command bar calling these same functions (not a separate implementation)
- [ ] Every AI-derived claim in a response must cite the underlying data it read — enforce this in the prompt template, not just as a hope

**Exit criteria:** "Create a project for launching an AI SaaS product" produces real rows across projects/workstreams/milestones/tasks/dependencies, and "Why is this project at risk?" returns fact + interpretation clearly separated, sourced from actual task/dependency data.

---

## 13. Phase 7 — AI Skill Files

**Goal:** the 8 files from spec §50 exist and are genuinely usable by an external agent, not just by your own `ai.service.ts` prompts.

Each file (`/skills/*.skill.md`) should cover, per spec §51:
- what the system represents (entities + relationships)
- which MCP tools/resources apply
- required inputs and validation rules
- confirmation requirements for that domain (tie back to §74's risk tiers)
- how to reason about dependencies/ambiguity
- how to report back what changed

| File | Core content |
|---|---|
| `project-management.skill.md` | Operating model overview, links to the other 7 |
| `project-planning.skill.md` | How to turn an objective into workstreams/milestones/tasks/dependencies |
| `task-management.skill.md` | Creation, status/priority rules, dependency rules, subtask conventions |
| `project-health.skill.md` | Signals to read, fact-vs-interpretation format, when to flag risk |
| `daily-reporting.skill.md` | What counts as "today's activity," report structure |
| `portfolio-management.skill.md` | Cross-project scan order, what "needs attention" means |
| `project-replanning.skill.md` | Diff-then-confirm workflow, dependency cascade rules |
| `mcp-operation.skill.md` | Auth, tool catalog summary, confirmation policy, error recovery |

**Exit criteria:** hand `mcp-operation.skill.md` + MCP access to an agent with zero other context, and it can complete a full project-creation-to-report cycle unassisted.

---

## 14. Phase 8 — External Interfaces

**Goal:** Telegram and ChatGPT-style clients work without duplicating logic (spec §48–49).

- [ ] Telegram webhook (`/api/telegram/webhook`) — **webhook, not polling** (Hobby has no long-running process for polling)
- [ ] Message → intent → MCP tool call → formatted reply, reusing the exact same MCP tools from Phase 5 (Telegram is a client of your own MCP server, not a parallel implementation)
- [ ] Telegram command map (§20 below) for the common quick actions; free text routed through `ai.service`
- [ ] ChatGPT/Custom GPT: expose the MCP server per OpenAI's MCP connector spec (same server as Phase 5 — verify auth flow compatibility, don't build a second server)

**Exit criteria:** "What's blocked today?" in Telegram returns the same answer as the Today view in the UI, because both ultimately call `task.service` with the same filters.

---

## 15. Phase 9 — Optimization & 100-Project Benchmark

**Goal:** prove the free-tier constraint from spec §7/§78 is actually met.

- [ ] Seed script: 100 projects, thousands of tasks, hundreds of milestones, thousands of dependencies, large `activity_events` history, multiple users (spec §98)
- [ ] Measure: portfolio load time, project page load time, global search latency, MCP tool call latency, daily/weekly report generation time, bulk operation time
- [ ] Verify: portfolio queries never do N+1 per-project queries; task list queries are paginated; no query loads more than one project's tasks at a time
- [ ] Confirm actual Supabase usage against the 500 MB / 5 GB egress budget with this seed data, and Vercel usage against the 1M invocations / 100 GB transfer budget
- [ ] Add the daily `keepalive` cron (§2.1) if not already in place

**Exit criteria:** every operation in spec §98's test list stays responsive with the seed data loaded, and projected monthly usage stays under the free-tier caps in §2.1 with headroom.

---

## 16. Phase 10 — Automation Engine

**Goal:** lightweight trigger → condition → action, without building a workflow engine (spec §52).

- [ ] `automations` table already exists (§5) — build the smallest possible executor: on each relevant mutation (task completed, milestone completed, status changed to "at risk"), check active automations for that org whose trigger matches, evaluate `condition` against current state, run `action` (notify, generate report) inline in the same request — **no separate queue/worker needed at this scale**
- [ ] Daily report generation via the once-daily Vercel Cron (fits Hobby's cadence limit exactly)
- [ ] Notifications: start with in-app + Telegram (both already have delivery paths); email/webhook can reuse `webhook_subscriptions` for the "notify" action type

**Exit criteria:** "task becomes overdue → notify owner" and "every evening → generate daily report" both work without any infrastructure beyond what Phases 1–9 already stood up.

---

## 17. MCP Tool Catalog (fill in as built — spec §42)

| Category | Tools | Risk tier (§74) |
|---|---|---|
| Workspace | `getWorkspace`, `updateWorkspace`, `listUsers`, `getUser`, `updateMembership` | Low–Medium |
| Projects | `createProject`, `getProject`, `updateProject`, `archiveProject`, `searchProjects`, `duplicateProject`, `analyzeProject` | Low–High (archive) |
| Workstreams | `createWorkstream`, `updateWorkstream`, `deleteWorkstream`, `listWorkstreams` | Low |
| Tasks | `createTask`, `getTask`, `updateTask`, `deleteTask`, `completeTask`, `assignTask`, `reassignTask`, `changeTaskStatus`, `changeTaskPriority`, `changeTaskDeadline`, `searchTasks`, `duplicateTask` | Low–Medium |
| Subtasks | `createSubtask`, `updateSubtask`, `completeSubtask`, `deleteSubtask` | Low |
| Milestones | `createMilestone`, `updateMilestone`, `completeMilestone`, `listMilestones`, `analyzeMilestone` | Low–Medium |
| Dependencies | `createDependency`, `removeDependency`, `listDependencies`, `analyzeBlockers` | Medium |
| Comments | `addComment`, `readComments`, `searchComments` | Low |
| Activity | `readActivity`, `searchActivity` | Low |
| Reports | `generateDailyReport`, `generateWeeklyReport`, `generateProjectReport`, `generatePortfolioReport` | Low |
| AI ops | `planProject`, `analyzeHealth`, `findBlockers`, `replanProject`, `findOverdueWork`, `generateProjectSummary` | Medium–High (replan) |
| Destructive | `deleteProject`, `bulkDeleteTasks` | High — confirmation required by default |

---

## 18. REST API Route Map (v1, fill in as built)

| Resource | Routes |
|---|---|
| Auth | `POST /v1/auth/session` |
| Workspace | `GET/PATCH /v1/workspace`, `GET /v1/workspace/members`, `POST /v1/workspace/invite` |
| Projects | `GET/POST /v1/projects`, `GET/PATCH/DELETE /v1/projects/:id`, `POST /v1/projects/:id/archive`, `POST /v1/projects/:id/duplicate` |
| Workstreams | `GET/POST /v1/projects/:id/workstreams`, `PATCH/DELETE /v1/workstreams/:id` |
| Tasks | `GET/POST /v1/projects/:id/tasks`, `GET/PATCH/DELETE /v1/tasks/:id`, `POST /v1/tasks/:id/complete`, `POST /v1/tasks/:id/assign` |
| Milestones | `GET/POST /v1/projects/:id/milestones`, `PATCH/DELETE /v1/milestones/:id` |
| Dependencies | `GET/POST /v1/tasks/:id/dependencies`, `DELETE /v1/dependencies/:id` |
| Comments | `GET/POST /v1/:entityType/:id/comments` |
| Activity | `GET /v1/activity` |
| Reports | `GET /v1/reports/daily`, `/weekly`, `/portfolio`, `GET /v1/projects/:id/report` |
| Search | `GET /v1/search?q=` |
| Webhooks | `GET/POST /v1/webhooks`, `DELETE /v1/webhooks/:id` |
| API keys | `GET/POST /v1/api-keys`, `DELETE /v1/api-keys/:id` |

---

## 19. Webhook Events (spec §47)

`project.created`, `project.updated`, `project.completed`, `task.created`, `task.updated`, `task.completed`, `task.blocked`, `task.overdue`, `milestone.created`, `milestone.completed`, `comment.created` — dispatched asynchronously via a lightweight fan-out (a Vercel function triggered right after the domain-layer write commits; at this scale, no queue infra needed — fire-and-forget with retry-on-failure logged to `activity_events`).

---

## 20. Telegram Command Map

| Command / phrase | Action |
|---|---|
| `/today` | Calls Today view query |
| `/mywork` | Calls My Work query |
| `/blocked` | `findBlockers` |
| `/project <name>` | `getProject` + summary |
| Free text | Routed to `ai.service` (task extraction, status queries, replanning) |

---

## 21. Testing Strategy

- **Unit**: every `/lib/domain` function — permission checks, cycle detection, status transition rules
- **Integration**: one test suite that hits REST, one that hits MCP tools, both asserting identical results for the same operation (this is what actually proves spec §4's "no capability exists only in the UI")
- **UI**: Playwright smoke tests for the 4 required views + quick actions
- **AI**: golden-transcript tests for `extractTasksFromText`, `analyzeHealth` — assert fact/interpretation separation and that no task is created that isn't traceable to the input
- **Load**: the Phase 9 benchmark script, run before every major release

---

## 22. Risk Register

| Risk | Mitigation |
|---|---|
| Supabase free project pauses mid-use after 7 days idle | Daily keepalive cron (§2.1) |
| Vercel Hobby cron can't run sub-daily | Lazy/on-access evaluation instead of scheduled sweeps for anything more frequent than daily |
| MCP and REST drift apart in behavior | Shared domain layer + integration tests asserting parity (§21) |
| AI fabricates project status | `ai.service` never returns free text as fact — every claim must be backed by a domain-layer read, enforced in prompt templates and spot-checked in golden tests |
| Circular dependency corrupts planning | Graph-walk check in `dependency.service` before every insert, not just a DB constraint |
| Custom properties JSONB becomes unindexed dead weight | Cap count per entity (§8) up front; add GIN index only if search proves it's needed |
| Runaway AI agent makes destructive changes | Confirmation-required tools by default (§74/§17); explicit autonomous-execution grant per agent identity only |

---

## 23. Suggested Build Order & Rough Sizing

For a single full-time developer, relative sizing (treat as ordering guidance, not a committed schedule):

1. Phase 1 (Foundation) — **S**
2. Phase 2 (Project Engine) — **M**
3. Phase 3 (Minimal UI) — **L**
4. Phase 4 (REST API) — **M**
5. Phase 5 (MCP Server) — **M**
6. Phase 6 (AI Command Center) — **L**
7. Phase 7 (Skill Files) — **S**
8. Phase 8 (Telegram/ChatGPT) — **M**
9. Phase 9 (Benchmark/Optimization) — **M**
10. Phase 10 (Automation Engine) — **S**

Phases 4 and 5 can run in parallel once Phase 2 is done, since both are thin wrappers over the same domain layer. Phase 7's skill files are cheapest to write *while* building Phase 6, since you'll already be documenting each AI capability's rules for the prompt templates.

---

## 24. Immediate Next Steps (Week 1)

- [ ] Create the two Supabase projects (prod + staging)
- [ ] Scaffold the Next.js repo with the layout in §3
- [ ] Write the Drizzle schema for Phase 1's tables and run the first migration
- [ ] Implement `permission.service.ts` and `activity.service.ts` first — every other service depends on both
- [ ] Implement `workspace.service.ts` + `project.service.ts` + `task.service.ts`, with a throwaway test script exercising the Phase 1 exit criteria end to end

---

*This plan should live alongside the spec and get updated as decisions change — treat §17/§18/§19 especially as living contracts, not one-time tables.*

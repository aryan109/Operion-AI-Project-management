# Project Health Diagnostic Skill

## 1. Operating Principle
Strict compliance with spec §36 & §73:
> **Every diagnostic statement must rigorously distinguish Fact from Interpretation.**
> Never hallucinate progress or fabricate status that is not backed by actual query data.

## 2. Health Tiers
- `on_track`: Milestones are on schedule, task throughput is active, and zero critical blocking dependencies exist.
- `at_risk`: One or more tasks are overdue past due date, milestone target date is imminent with uncompleted backlog items, or warning signs exist.
- `blocked`: One or more critical path tasks are explicitly in `blocked` status with unresolved prerequisites.

## 3. Reporting Structure
When diagnosing project health, always return:
1. **Direct Status & Rationale**: `health` badge and one-sentence summary.
2. **Observable Facts**:
   - Explicit task counts by status (completed, in progress, blocked).
   - Exact list of overdue tasks with deadlines.
   - Exact blocker dependencies.
3. **Agent Interpretation**:
   - Inferred risks, velocity assessment, and suggested corrective actions.

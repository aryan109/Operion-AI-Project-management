# Project Replanning Skill

## 1. Replanning Doctrine
Replanning occurs when a milestone deadline slips, scope changes, or critical dependencies become delayed.

## 2. Protocol
1. **Analyze Cascade Impact**:
   - Trace all tasks downstream from the delayed task using `getBlockedTasks(taskId)`.
   - Identify affected milestones whose target date precedes the new projected completion date.
2. **Propose Structured Diff**:
   - Present proposed shifts to the human operator:
     - Old target date -> New target date
     - Dependent tasks to shift
   - **Never apply non-trivial timeline adjustments without user confirmation** (spec §74 Tier 2/Tier 3 policy).

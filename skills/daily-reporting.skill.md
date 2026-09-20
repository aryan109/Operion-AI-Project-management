# Daily Reporting Skill

## 1. Scope of Daily Standup
The daily report is an executive snapshot of workspace momentum and hurdles over the preceding 24-hour cycle.

## 2. Report Sections
1. **Critical Blockers**: All tasks in `blocked` status, including the blocking task and assignee.
2. **Due Today & Overdue Items**: Tasks with `dueDate <= current_date` that are not yet marked `done`.
3. **Completed Yesterday/Today**: Tasks marked `done` within the last 24 hours.
4. **Activity Velocity**: Total count of mutations recorded in `activity_events` today.

## 3. Tool Invocations
- Call `generateDailyReport()` or read resource `operion://daily-report`.
- For specific queries (e.g. "What's blocked today?"), query `findBlockers()` or `getTodayView()`.

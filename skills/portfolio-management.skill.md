# Portfolio Management Skill

## 1. Cross-Project Visibility
When analyzing an entire organization's initiatives, never iterate through projects by loading all tasks individually (which causes N+1 performance degradation). Always call `getPortfolioAggregate()` or query `operion://portfolio-overview`.

## 2. Attention Matrix
Classify projects into:
1. **Urgent Intervention Required**: Projects marked `blocked` or having overdue milestones.
2. **At Risk**: Projects with stagnant activity over 7 days or overdue tasks.
3. **On Track**: Healthy projects progressing on pace.
4. **Completed / Archived**: Finalized initiatives.

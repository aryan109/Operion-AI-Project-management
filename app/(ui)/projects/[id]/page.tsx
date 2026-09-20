import { notFound } from "next/navigation";
import { getDefaultContext } from "@/lib/api/helper";
import * as projectService from "@/lib/domain/project.service";
import * as workstreamService from "@/lib/domain/workstream.service";
import * as milestoneService from "@/lib/domain/milestone.service";
import * as taskService from "@/lib/domain/task.service";
import * as dependencyService from "@/lib/domain/dependency.service";
import * as activityService from "@/lib/domain/activity.service";
import { ProjectClient } from "./project-client";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getDefaultContext();

  const [projRes, wsRes, msRes, tasksRes, depsRes, actRes] = await Promise.all([
    projectService.getProject(ctx, id),
    workstreamService.listWorkstreams(ctx, id),
    milestoneService.listMilestones(ctx, id),
    taskService.listTasks(ctx, { projectId: id }),
    dependencyService.listDependencies(ctx, id),
    activityService.listActivity(ctx, { entityId: id, limit: 20 }),
  ]);

  if (!projRes.ok) {
    notFound();
  }

  return (
    <ProjectClient
      project={projRes.data}
      workstreams={wsRes.ok ? wsRes.data : []}
      milestones={msRes.ok ? msRes.data : []}
      tasks={tasksRes.ok ? tasksRes.data : []}
      dependencies={depsRes.ok ? depsRes.data : []}
      activityLogs={actRes.ok ? actRes.data : []}
    />
  );
}

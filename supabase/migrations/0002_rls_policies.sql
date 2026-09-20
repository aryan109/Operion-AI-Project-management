-- Enable RLS on all public tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update own
DROP POLICY IF EXISTS "Profiles readable by authenticated users" ON profiles;
CREATE POLICY "Profiles readable by authenticated users" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Helper function to check if auth.uid() belongs to an organization
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memberships
    WHERE organization_id = org_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Organizations: members can read their organizations
DROP POLICY IF EXISTS "Org members can read organization" ON organizations;
CREATE POLICY "Org members can read organization" ON organizations FOR SELECT TO authenticated USING (public.is_org_member(id));

-- Memberships: members can read org memberships
DROP POLICY IF EXISTS "Org members can read memberships" ON memberships;
CREATE POLICY "Org members can read memberships" ON memberships FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

-- Projects: org members can read/modify projects
DROP POLICY IF EXISTS "Org members can access projects" ON projects;
CREATE POLICY "Org members can access projects" ON projects FOR ALL TO authenticated USING (public.is_org_member(organization_id));

-- Project members
DROP POLICY IF EXISTS "Org members can access project_members" ON project_members;
CREATE POLICY "Org members can access project_members" ON project_members FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND public.is_org_member(organization_id))
);

-- Workstreams
DROP POLICY IF EXISTS "Org members can access workstreams" ON workstreams;
CREATE POLICY "Org members can access workstreams" ON workstreams FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND public.is_org_member(organization_id))
);

-- Milestones
DROP POLICY IF EXISTS "Org members can access milestones" ON milestones;
CREATE POLICY "Org members can access milestones" ON milestones FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND public.is_org_member(organization_id))
);

-- Tasks
DROP POLICY IF EXISTS "Org members can access tasks" ON tasks;
CREATE POLICY "Org members can access tasks" ON tasks FOR ALL TO authenticated USING (public.is_org_member(organization_id));

-- Task assignees
DROP POLICY IF EXISTS "Org members can access task_assignees" ON task_assignees;
CREATE POLICY "Org members can access task_assignees" ON task_assignees FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND public.is_org_member(organization_id))
);

-- Task dependencies
DROP POLICY IF EXISTS "Org members can access task_dependencies" ON task_dependencies;
CREATE POLICY "Org members can access task_dependencies" ON task_dependencies FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = blocking_task_id AND public.is_org_member(organization_id))
);

-- Tags
DROP POLICY IF EXISTS "Org members can access tags" ON tags;
CREATE POLICY "Org members can access tags" ON tags FOR ALL TO authenticated USING (public.is_org_member(organization_id));

-- Comments
DROP POLICY IF EXISTS "Org members can access comments" ON comments;
CREATE POLICY "Org members can access comments" ON comments FOR ALL TO authenticated USING (public.is_org_member(organization_id));

-- Activity events
DROP POLICY IF EXISTS "Org members can access activity_events" ON activity_events;
CREATE POLICY "Org members can access activity_events" ON activity_events FOR ALL TO authenticated USING (public.is_org_member(organization_id));

-- Reports
DROP POLICY IF EXISTS "Org members can access reports" ON reports;
CREATE POLICY "Org members can access reports" ON reports FOR ALL TO authenticated USING (public.is_org_member(organization_id));

-- Automations
DROP POLICY IF EXISTS "Org members can access automations" ON automations;
CREATE POLICY "Org members can access automations" ON automations FOR ALL TO authenticated USING (public.is_org_member(organization_id));

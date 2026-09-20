-- 0003_activity_events_text_entity_id.sql
-- Alter activity_events.entity_id column from UUID to TEXT to support polymorphic audit logging (e.g., MCP tool names, connector IDs, external identifiers)

ALTER TABLE activity_events ALTER COLUMN entity_id TYPE text;

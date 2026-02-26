-- Migration: Add memory_data JSONB to maya_personal_memory for ClawDBot bridge
-- NORTH-CODE-AUDIT-FEB26: Bridge inject_maya_context requires memory_data column
-- Production schema evolved with preferred_topics, etc. but lacks memory_data.
-- Bridge stores agent_context_note in memory_data for Maya context injection.
--
-- Rollback: ALTER TABLE maya_personal_memory DROP COLUMN IF EXISTS memory_data;

ALTER TABLE maya_personal_memory
ADD COLUMN IF NOT EXISTS memory_data JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN maya_personal_memory.memory_data IS
'JSONB for ClawDBot agent context (agent_context_note, agent_context_updated_at). Merged with || operator.';

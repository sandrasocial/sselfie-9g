-- Security remediation for five legacy tables exposed through Supabase's public Data API schema.
--
-- Access intent:
--   * maya_tasks: authenticated owners may read/write rows linked through agents_profiles.
--   * agents_planner_library_items: authenticated owners may read/write rows linked through
--     agents_profiles.
--   * agents_chat_sessions: default-deny; no verified current member-facing caller.
--   * selfieschool_purchases: default-deny; server/internal purchase data only.
--   * webhook_events_needs_review: default-deny; the active app uses the separate Neon table.
--
-- RLS is intentionally not forced. Supabase service_role and database-owner maintenance retain
-- their normal bypass behavior, while anon/authenticated Data API access is constrained by RLS.

BEGIN;

ALTER TABLE public.agents_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maya_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents_planner_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selfieschool_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events_needs_review ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maya_tasks_authenticated_owner ON public.maya_tasks;
CREATE POLICY maya_tasks_authenticated_owner
ON public.maya_tasks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.agents_profiles AS profile
    WHERE profile.id = maya_tasks.profile_id::uuid
      AND profile.supabase_user_id::text = (SELECT auth.uid())::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.agents_profiles AS profile
    WHERE profile.id = maya_tasks.profile_id::uuid
      AND profile.supabase_user_id::text = (SELECT auth.uid())::text
  )
);

DROP POLICY IF EXISTS agents_planner_library_items_authenticated_owner
  ON public.agents_planner_library_items;
CREATE POLICY agents_planner_library_items_authenticated_owner
ON public.agents_planner_library_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.agents_profiles AS profile
    WHERE profile.id = agents_planner_library_items.user_id::uuid
      AND profile.supabase_user_id::text = (SELECT auth.uid())::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.agents_profiles AS profile
    WHERE profile.id = agents_planner_library_items.user_id::uuid
      AND profile.supabase_user_id::text = (SELECT auth.uid())::text
  )
);

COMMIT;

-- MANUAL ROLLBACK (run only after confirming the prior exposure is intentionally being restored):
-- BEGIN;
-- DROP POLICY IF EXISTS maya_tasks_authenticated_owner ON public.maya_tasks;
-- DROP POLICY IF EXISTS agents_planner_library_items_authenticated_owner
--   ON public.agents_planner_library_items;
-- ALTER TABLE public.agents_chat_sessions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.maya_tasks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.agents_planner_library_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.selfieschool_purchases DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.webhook_events_needs_review DISABLE ROW LEVEL SECURITY;
-- COMMIT;

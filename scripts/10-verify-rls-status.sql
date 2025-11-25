-- =====================================================
-- RLS VERIFICATION SCRIPT
-- =====================================================
-- Run this script to verify RLS is properly enabled
-- on all production tables
-- =====================================================

-- Check RLS status for all public tables
SELECT 
  tablename as table_name,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status,
  (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = pt.tablename
  ) as policy_count
FROM pg_tables pt
WHERE schemaname = 'public'
  AND tablename NOT LIKE '%_archived_%'
  AND tablename NOT LIKE 'session%'
  AND tablename NOT LIKE '__drizzle%'
ORDER BY 
  rowsecurity DESC,
  tablename;

-- Summary statistics
SELECT 
  COUNT(*) as total_tables,
  SUM(CASE WHEN rowsecurity THEN 1 ELSE 0 END) as rls_enabled,
  SUM(CASE WHEN NOT rowsecurity THEN 1 ELSE 0 END) as rls_disabled,
  ROUND(
    100.0 * SUM(CASE WHEN rowsecurity THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) as percent_protected
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE '%_archived_%'
  AND tablename NOT LIKE 'session%'
  AND tablename NOT LIKE '__drizzle%';

-- List tables WITHOUT RLS (these need attention)
SELECT 
  tablename,
  '⚠️  NEEDS RLS' as warning
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT rowsecurity
  AND tablename NOT LIKE '%_archived_%'
  AND tablename NOT LIKE 'session%'
  AND tablename NOT LIKE '__drizzle%'
ORDER BY tablename;

-- V-05 Database Cleanup (Batch 1)
-- Safety checks completed before drop:
-- 1) Row count = 0 in production for all tables in this batch
-- 2) No active code references found in app/lib/components/scripts/tests

BEGIN;

DROP TABLE IF EXISTS apa_activity_log;
DROP TABLE IF EXISTS apa_log;
DROP TABLE IF EXISTS behavior_loop_log;
DROP TABLE IF EXISTS blueprint_signals;

COMMIT;

-- POST-NOW-01: used log for the "I need something to post now" admin tool.
-- Every surfaced option is stored as status 'suggested'; Sandra marks options
-- 'used' or 'dismissed' from the option cards. Suggested/used fingerprints are
-- excluded from future picks forever (last ~30 fed to the prompt); dismissed
-- fingerprints are excluded for 14 days.
--
-- The app also lazy-creates this table at runtime (lib/admin/post-now.ts,
-- repo precedent lib/app-v3/maya/memory-store.ts). This file is the formal record.

CREATE TABLE IF NOT EXISTS content_suggestion_log (
  id          serial PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  type        text NOT NULL,        -- 'repurpose' | 'trend-test' | 'story-sequence'
  fingerprint text NOT NULL,        -- post permalink (repurpose) or normalized title
  title       text NOT NULL,
  status      text NOT NULL DEFAULT 'suggested',  -- 'suggested' | 'used' | 'dismissed'
  payload     jsonb                 -- the full option card as surfaced
);

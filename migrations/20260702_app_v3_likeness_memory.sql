-- LIKENESS-MEMORY-01 - durable likeness corrections per member (the retention moat loop).
-- Members kept repeating the same accuracy corrections ("head too big", "my hair is dark
-- brown not black", "add my mole") every session because nothing persisted them. The edit
-- route now captures likeness corrections into this column; generate + edit prompts inject
-- them on every render; the Memory modal shows them and lets the member delete a wrong note.
-- jsonb array of normalized note strings, e.g. ["hair: my hair is dark brown not black"].
-- The app also adds this lazily (ADD COLUMN IF NOT EXISTS in lib/app-v3/maya/memory-store.ts);
-- this file is the canonical record and the formal production apply.

ALTER TABLE app_v3_memory
  ADD COLUMN IF NOT EXISTS likeness_notes jsonb NOT NULL DEFAULT '[]'::jsonb;

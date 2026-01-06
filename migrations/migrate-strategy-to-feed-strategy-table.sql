-- Migrate existing strategy documents from feed_layouts.description to feed_strategy.strategy_document
-- This script moves strategy documents that were incorrectly stored in description field
-- to the proper feed_strategy table

-- Step 1: Identify feeds with strategy documents in description field
-- Strategy documents have markdown headers (# ## ###) and are longer than 500 chars
DO $$
DECLARE
  feed_record RECORD;
  strategy_count INTEGER := 0;
BEGIN
  -- Loop through feeds with strategy documents in description
  FOR feed_record IN
    SELECT 
      fl.id as feed_id,
      fl.user_id,
      fl.description
    FROM feed_layouts fl
    WHERE fl.description IS NOT NULL
      AND LENGTH(fl.description) > 500
      AND fl.description ~ '^#{1,3}\s'
      -- Only migrate if strategy doesn't already exist in feed_strategy table
      AND NOT EXISTS (
        SELECT 1 FROM feed_strategy fs
        WHERE fs.feed_layout_id = fl.id
        AND fs.strategy_document IS NOT NULL
      )
  LOOP
    -- Insert or update strategy in feed_strategy table
    -- Check if strategy already exists
    IF EXISTS (SELECT 1 FROM feed_strategy WHERE feed_layout_id = feed_record.feed_id) THEN
      -- Update existing strategy
      UPDATE feed_strategy
      SET strategy_document = feed_record.description,
          updated_at = NOW(),
          is_active = true
      WHERE feed_layout_id = feed_record.feed_id;
    ELSE
      -- Insert new strategy
      INSERT INTO feed_strategy (user_id, feed_layout_id, strategy_document, is_active)
      VALUES (
        feed_record.user_id,
        feed_record.feed_id,
        feed_record.description,
        true
      );
    END IF;
    
    -- Clear description field (set to NULL to free up space)
    UPDATE feed_layouts
    SET description = NULL,
        updated_at = NOW()
    WHERE id = feed_record.feed_id;
    
    strategy_count := strategy_count + 1;
    
    RAISE NOTICE 'Migrated strategy for feed_id: %', feed_record.feed_id;
  END LOOP;
  
  RAISE NOTICE 'Migration complete: % strategy documents migrated', strategy_count;
END $$;

-- Step 2: Verify migration
-- Check that all strategy documents were migrated
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM feed_layouts
  WHERE description IS NOT NULL
    AND LENGTH(description) > 500
    AND description ~ '^#{1,3}\s';
  
  IF remaining_count > 0 THEN
    RAISE WARNING 'Warning: % strategy documents still in description field', remaining_count;
  ELSE
    RAISE NOTICE 'Success: All strategy documents migrated to feed_strategy table';
  END IF;
END $$;


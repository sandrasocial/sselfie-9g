-- Check if any messages have concept cards
SELECT 
  COUNT(*) as total_messages,
  COUNT(concept_cards) as messages_with_concept_cards,
  COUNT(*) FILTER (WHERE concept_cards IS NOT NULL) as non_null_concept_cards,
  COUNT(*) FILTER (WHERE concept_cards IS NOT NULL AND jsonb_array_length(concept_cards) > 0) as messages_with_concepts
FROM maya_chat_messages;

-- Show sample messages with concept cards (if any)
SELECT 
  id,
  chat_id,
  role,
  LEFT(content, 50) as content_preview,
  concept_cards,
  created_at
FROM maya_chat_messages
WHERE concept_cards IS NOT NULL 
  AND jsonb_array_length(concept_cards) > 0
ORDER BY created_at DESC
LIMIT 5;

-- Show recent messages to see the pattern
SELECT 
  id,
  chat_id,
  role,
  LEFT(content, 50) as content_preview,
  CASE 
    WHEN concept_cards IS NULL THEN 'NULL'
    WHEN jsonb_array_length(concept_cards) = 0 THEN 'EMPTY ARRAY'
    ELSE 'HAS CONCEPTS: ' || jsonb_array_length(concept_cards)::text
  END as concept_status,
  created_at
FROM maya_chat_messages
ORDER BY created_at DESC
LIMIT 20;

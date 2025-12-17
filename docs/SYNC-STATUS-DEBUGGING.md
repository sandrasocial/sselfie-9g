# Sync Status Debugging Guide

## Why Only 1 Model Shows as Affected

If you're only seeing 1 model that needs syncing, here are the possible reasons:

### 1. **Most Users Already Have Latest Version**
- If users retrained and the training completed successfully, the database should have the latest version
- The fixes we implemented ensure new trainings update correctly
- Only users with **old trainings** (before the fixes) might need syncing

### 2. **Query Only Shows Latest Model Per User**
- The sync-status endpoint shows only the **latest completed model** per user
- If a user has multiple completed models, only the most recent one is shown
- This is correct behavior - we only care about the active model being used

### 3. **Version Comparison Logic**
- The endpoint compares `currentVersion` (from database) with `latestVersion` (from Replicate)
- If they match, user is marked as "up to date"
- If they don't match, user needs sync

## How to Debug

### Check Server Logs
The endpoint now logs:
- Total users found
- Users needing sync (with current vs latest versions)
- Any errors during version fetching

### Check Specific User
To check a specific user (like user-50c):

```sql
SELECT 
  u.email,
  um.replicate_model_id,
  um.replicate_version_id,
  um.updated_at,
  um.completed_at
FROM users u
JOIN user_models um ON u.id = um.user_id
WHERE um.replicate_model_id LIKE '%user-50c%'
  AND um.training_status = 'completed'
ORDER BY um.updated_at DESC;
```

Then check Replicate:
- Go to: `https://replicate.com/sandrasocial/user-50c-selfie-lora`
- Compare the latest version hash with what's in the database

### Check All Versions on Replicate
The endpoint now returns `totalVersionsOnReplicate` and `allVersions` in the response, showing:
- How many versions exist on Replicate
- The first 5 versions with their creation dates

## Expected Behavior

### User with Multiple Retrainings (user-50c)
- **If latest training completed successfully:** Database should have latest version → Shows as "Up to Date"
- **If latest training had issues:** Database might have old version → Shows as "Needs Sync"
- **If version wasn't updated:** Database has old version → Shows as "Needs Sync"

### After Syncing
- User's `replicate_version_id` is updated to latest
- User's `lora_weights_url` is updated to match new version
- User should now show as "Up to Date"

## Troubleshooting

### If User Shows "Up to Date" But Quality is Still Bad
1. Check if version hash matches Replicate's latest
2. Check if trigger word is correct
3. Check if LoRA scale is appropriate
4. User might need to retrain with better images (not a sync issue)

### If User Shows "Error"
1. Check Replicate API token is valid
2. Check model ID format is correct
3. Check if model exists on Replicate
4. Check server logs for specific error

### If No Users Show Up
1. Check if any users have `training_status = 'completed'`
2. Check if `replicate_model_id` is not null
3. Check database connection

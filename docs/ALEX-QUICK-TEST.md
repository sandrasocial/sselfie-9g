# Alex Quick Test Guide

## 🧪 Test 1: create_api_endpoint

### What to Test
Create a simple GET endpoint to list inactive users.

### Steps

1. **Open Alex Interface**
   - Navigate to `/admin` (must be logged in as admin)
   - You should see the Alex chat interface

2. **Request Endpoint Creation**
   - Type: `"Create a GET endpoint at /api/admin/inactive-users that returns users who haven't logged in for 30 days"`
   - Send the message

3. **What Should Happen**
   - Alex uses `create_api_endpoint` tool
   - Shows preview with code diff
   - Displays: "Here's what will be created:"
   - Shows the generated code
   - Shows approval button

4. **Review the Code**
   - Check that it includes:
     - Proper imports (NextResponse, neon, etc.)
     - Auth checks (createServerClient, getUserByAuthId)
     - Admin check (ADMIN_EMAIL)
     - Error handling
     - TODO comment for implementation

5. **Approve**
   - Click "Approve" button
   - File should be created at `app/api/admin/inactive-users/route.ts`

6. **Verify**
   ```bash
   # Check file exists
   ls -la app/api/admin/inactive-users/route.ts
   
   # Check file content
   cat app/api/admin/inactive-users/route.ts
   ```

### Expected Result
✅ Code generated correctly  
✅ File created at correct path  
✅ All safety checks included  
✅ Preview shown before creation

---

## 🧪 Test 2: modify_file

### What to Test
Add error handling to the endpoint we just created.

### Steps

1. **Request Modification**
   - Type: `"Add try-catch error handling around the database query in the inactive-users endpoint"`
   - Send the message

2. **What Should Happen**
   - Alex uses `modify_file` tool
   - Reads current file
   - Generates find/replace changes
   - Shows before/after diff
   - Shows approval button

3. **Review the Diff**
   - Check that it shows:
     - What code will be removed (old)
     - What code will be added (new)
     - Line numbers if possible
     - File path

4. **Approve**
   - Click "Approve" button
   - Backup should be created in `.alex-backups/`
   - File should be modified

5. **Verify**
   ```bash
   # Check backup was created
   ls -la .alex-backups/
   
   # Check file was modified
   cat app/api/admin/inactive-users/route.ts
   
   # Verify error handling was added
   grep -n "try\|catch" app/api/admin/inactive-users/route.ts
   ```

### Expected Result
✅ Diff shows exact changes  
✅ Backup created before modification  
✅ File updated correctly  
✅ Error handling added

---

## 🧪 Test 3: Rollback

### What to Test
Undo the modification we just made.

### Steps

1. **Request Rollback**
   - Type: `"Rollback the last change to inactive-users endpoint"`
   - Send the message

2. **What Should Happen**
   - Alex uses `rollback_change` tool
   - Finds the backup
   - Restores original file
   - Confirms rollback

3. **Verify**
   ```bash
   # Check file was restored
   cat app/api/admin/inactive-users/route.ts
   
   # Verify error handling was removed (back to original)
   ```

### Expected Result
✅ File restored to previous state  
✅ Backup system works  
✅ Rollback confirms success

---

## 🧪 Test 4: Test Mode

### What to Test
Test changes without applying them.

### Steps

1. **Request Modification with Test Mode**
   - Type: `"Test adding a comment to the inactive-users endpoint"`
   - Send the message

2. **Approve with Test Mode**
   - When approving, use test mode
   - Should validate without applying

3. **Verify**
   - File should NOT be modified
   - Should return "Test passed" message
   - No backup created

### Expected Result
✅ Test mode validates without applying  
✅ File unchanged  
✅ No backup created

---

## ✅ Success Checklist

After all tests, verify:

- [ ] `create_api_endpoint` generates correct code
- [ ] Files are created at correct paths
- [ ] `modify_file` shows accurate diffs
- [ ] Backups are created automatically
- [ ] Rollback restores files correctly
- [ ] Test mode works without applying changes
- [ ] All previews show before execution
- [ ] Approval buttons work correctly
- [ ] No errors in console
- [ ] All safety mechanisms work

---

## 🐛 Common Issues

### Issue: Tool not being called
**Solution:** Check that the message clearly requests the action (e.g., "Create endpoint", "Modify file")

### Issue: File not created
**Solution:** Check console for errors, verify admin authentication

### Issue: Backup not created
**Solution:** Check `.alex-backups/` directory exists, verify permissions

### Issue: Diff not showing
**Solution:** Check that the find/replace strings match exactly (including whitespace)

---

## 📝 Notes

- All tests require admin authentication
- Backups are stored in `.alex-backups/` directory
- Test mode is available for safe validation
- Rollback uses changeId from backups


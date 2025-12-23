# Alex Testing Guide

## Testing Plan

### Test 1: create_api_endpoint

**Test Case:** Create a simple GET endpoint to list inactive users

**Steps:**
1. Open Alex chat interface at `/admin`
2. Ask: "Create an API endpoint to get inactive users"
3. Alex should:
   - Use `create_api_endpoint` tool
   - Generate code for `GET /api/admin/inactive-users`
   - Show preview with diff
   - Require approval
4. Review the generated code
5. Click "Approve" button
6. Verify file is created at `app/api/admin/inactive-users/route.ts`
7. Test the endpoint works

**Expected Result:**
- Code generated with proper structure
- Auth and admin checks included
- File created successfully
- Endpoint accessible and returns expected response

---

### Test 2: modify_file

**Test Case:** Fix a bug in an existing file

**Steps:**
1. Open Alex chat interface
2. Ask: "Add error handling to the inactive-users endpoint"
3. Alex should:
   - Use `modify_file` tool
   - Read current file
   - Generate find/replace changes
   - Show before/after diff
   - Require approval
4. Review the diff
5. Click "Approve" button
6. Verify:
   - Backup created in `.alex-backups/`
   - File modified correctly
   - Original functionality still works
   - Error handling added

**Expected Result:**
- Diff shows exactly what will change
- Backup created before modification
- File updated correctly
- Can rollback if needed

---

## Manual Testing Checklist

### create_api_endpoint Test

- [ ] Tool is called when requesting endpoint creation
- [ ] Generated code includes proper imports
- [ ] Auth checks are included (if requiresAuth: true)
- [ ] Admin checks are included (if requiresAdmin: true)
- [ ] Preview shows diff correctly
- [ ] Approval button appears
- [ ] File is created after approval
- [ ] File has correct structure
- [ ] Endpoint is accessible
- [ ] Endpoint returns expected response

### modify_file Test

- [ ] Tool is called when requesting file modification
- [ ] Current file is read correctly
- [ ] Find/replace changes are identified
- [ ] Diff shows before/after correctly
- [ ] Multiple occurrences are detected and warned
- [ ] Approval button appears
- [ ] Backup is created before modification
- [ ] File is modified correctly
- [ ] Original file can be restored from backup
- [ ] Rollback tool works

### Safety Mechanisms Test

- [ ] Preview shown before any change
- [ ] Diff displayed with line-by-line changes
- [ ] Backup created automatically
- [ ] Rollback plan provided
- [ ] Test mode works (dry-run)
- [ ] Approval required (no auto-execution)
- [ ] Error handling works correctly

---

## Quick Test Commands

### Test create_api_endpoint via API

```bash
# 1. Create endpoint via Alex chat
curl -X POST http://localhost:3000/api/admin/alex/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Create a GET endpoint at /api/admin/inactive-users that returns users who haven't logged in for 30 days"
      }
    ]
  }'

# 2. After approval, verify file exists
ls -la app/api/admin/inactive-users/route.ts

# 3. Test the endpoint
curl http://localhost:3000/api/admin/inactive-users
```

### Test modify_file via API

```bash
# 1. Request modification via Alex chat
curl -X POST http://localhost:3000/api/admin/alex/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Add try-catch error handling to the inactive-users endpoint"
      }
    ]
  }'

# 2. After approval, verify backup exists
ls -la .alex-backups/

# 3. Verify file was modified
cat app/api/admin/inactive-users/route.ts
```

---

## Common Issues to Watch For

1. **File path validation** - Ensure no directory traversal
2. **Backup creation** - Verify backups are created before changes
3. **Diff accuracy** - Ensure find/replace matches exactly
4. **Approval flow** - Ensure no execution without approval
5. **Error handling** - Test with invalid inputs
6. **Rollback** - Test restoring from backup

---

## Success Criteria

✅ Both tools generate correct code  
✅ Previews show accurate diffs  
✅ Approvals work correctly  
✅ Files are created/modified as expected  
✅ Backups are created and can be restored  
✅ No errors in console  
✅ All safety mechanisms work


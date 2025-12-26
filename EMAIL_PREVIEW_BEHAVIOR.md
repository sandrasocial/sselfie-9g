# Email Preview Card Behavior Analysis

## What Happens When Alex Creates an Email

### Current Flow:
1. **User asks Alex to create an email** → `compose_email` tool is called
2. **Tool returns result** → `{ html, subjectLine, preview }` with validated HTML
3. **useEffect detects tool result** → Checks last assistant message for `compose_email` tool result
4. **extractEmailPreview() validates** → Ensures HTML starts with `<` or `<!DOCTYPE` (rejects plain text)
5. **setEmailPreview() called** → Sets preview state with validated data
6. **EmailPreviewCard renders** → Displays the email preview with subject, HTML, and actions

### ✅ What Works:
- Email preview appears immediately after Alex creates email
- HTML validation prevents invalid content from showing
- Preview includes subject, HTML content, and preview text

---

## What Happens When User Clicks "Edit"

### Current Flow:
1. **User clicks "Edit" button** → `onEdit` handler is called
2. **Preview is cleared** → `setEmailPreview(null)` immediately clears the preview
3. **Message sent to Alex** → `sendMessage({ text: 'Make changes to this email' })`
4. **Alex processes edit** → Alex calls `compose_email` tool again with updated content
5. **New preview should appear** → Same flow as creating new email

### ✅ What Works:
- Preview clears immediately when "Edit" is clicked
- Message is sent to Alex to trigger edit

### ⚠️ Potential Issues:
- **If validation fails**: Preview stays cleared and doesn't come back
- **No context passed**: Alex doesn't receive the previous email HTML, so might create from scratch
- **Timing issue**: If Alex responds quickly, preview might flash (clear → appear)

---

## What Happens When Alex Creates a NEW Email (While One Exists)

### Current Flow:
1. **User asks for different email** → `compose_email` tool is called again
2. **New tool result detected** → useEffect checks last assistant message
3. **Old preview replaced** → `setEmailPreview()` replaces the old preview data
4. **Only latest shows** → `foundValidEmailPreview` flag prevents duplicates

### ✅ What Works:
- Old preview is automatically replaced with new one
- No duplicate previews appear
- Only the most recent email preview is shown

### ⚠️ Potential Issues:
- **Only checks last message**: If there are multiple `compose_email` calls in the conversation, only the latest preview shows
- **No history**: Previous email previews are lost (not stored)

---

## Expected vs Actual Behavior

| Scenario | Expected | Actual | Status |
|----------|----------|--------|--------|
| **New email created** | Preview appears immediately | ✅ Preview appears immediately | ✅ Working |
| **Edit clicked** | Preview clears, new preview appears | ✅ Preview clears, new preview should appear | ⚠️ Depends on validation |
| **New email while one exists** | Old preview replaced | ✅ Old preview replaced | ✅ Working |
| **Multiple emails in conversation** | Only latest preview shows | ✅ Only latest preview shows | ✅ Working |
| **Page refresh** | Preview persists | ❌ Preview lost (not persisted) | ⚠️ Not persisted |

---

## Key Code Locations

### Email Preview Detection:
- **File**: `components/admin/admin-agent-chat-new.tsx`
- **Line**: 573-805 (useEffect hook)
- **Function**: `extractEmailPreview()` - validates and extracts email data

### Preview Clearing:
- **File**: `components/admin/admin-agent-chat-new.tsx`
- **Line**: 1304-1309 (onEdit handler)
- **Action**: `setEmailPreview(null)` clears preview immediately

### Preview Rendering:
- **File**: `components/admin/admin-agent-chat-new.tsx`
- **Line**: 1296-1354 (EmailPreviewCard component)
- **Condition**: `{emailPreview && ...}` - only renders when preview exists

---

## Potential Issues & Solutions

### Issue 1: Preview Not Coming Back After Edit
**Problem**: If validation fails on the edited email, preview stays cleared.

**Solution**: Add fallback to show previous preview if new one fails validation, or show error message.

### Issue 2: No Context for Editing
**Problem**: When editing, Alex doesn't receive the previous email HTML.

**Solution**: Pass `previousVersion` parameter to `compose_email` tool in edit handler:
```typescript
onEdit={async () => {
  setEmailPreview(null)
  await sendMessage({ 
    text: `Make changes to this email:\n\n${emailPreview.html}` 
  })
}}
```

### Issue 3: Preview Not Persisted
**Problem**: If page refreshes, preview is lost.

**Solution**: Store `email_preview_data` in database (already implemented in backend, but not used in frontend state restoration).

### Issue 4: Only Last Message Checked
**Problem**: If multiple emails are created, only the latest preview shows.

**Solution**: This is actually correct behavior - we want to show the most recent email. But could add ability to view previous previews.

---

## Recommendations

1. ✅ **Current behavior is mostly correct** - previews appear, clear, and replace as expected
2. ⚠️ **Add context to edit** - Pass previous email HTML to Alex for better editing
3. ⚠️ **Handle validation failures** - Show error or keep previous preview if new one fails
4. 💡 **Consider persistence** - Store preview in database for page refresh resilience
5. 💡 **Add loading state** - Show "Editing email..." when edit is clicked

---

## Test Results

Run `node test-email-preview-behavior.js` to see detailed analysis.

**Summary**: The email preview flow is working correctly for the main use cases. The main improvement would be passing context when editing and handling validation failures more gracefully.




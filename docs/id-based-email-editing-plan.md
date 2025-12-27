# ID-Based Email Editing Implementation Plan

## Goal
Replace HTML-in-message editing with campaign ID references, making conversations cleaner and more efficient.

## Current Problems
1. ✅ Full HTML (10,000+ chars) sent in every edit message
2. ✅ Conversation history bloated with HTML
3. ✅ Complex HTML extraction logic in Alex's instructions
4. ✅ HTML duplication (in conversation + database)

## Solution Overview
Use campaign IDs as references. Alex fetches HTML from database when needed.

---

## PHASE 1: Create Draft Campaign in compose_email + Track Campaign ID

### 1.1 Modify compose_email to Create Draft Campaign
**File**: `app/api/admin/agent/chat/route.ts`

**Current**: `compose_email` generates HTML but doesn't create a campaign (campaigns created later by `schedule_campaign`)

**Changes**:
- After generating email HTML, create a draft campaign in `admin_email_campaigns` table
- Set status to 'draft'
- Store the campaign ID in the tool result
- This ensures every email has a campaign ID from creation, making ID-based editing always possible

**Location**: ~line 975-987 (before return statement)

**Return value update**:
```typescript
return {
  html: emailHtml,
  subjectLine: finalSubjectLine,
  preview: previewText,
  readyToSend: true,
  campaignId: campaign.id  // NEW
}
```

### 1.2 Update Email Preview Data Structure
**File**: `components/admin/admin-agent-chat-new.tsx`

**Current**: `getEmailPreviewFromMessage` extracts email data but doesn't track `campaignId`

**Changes**:
- Modify `extractEmailPreview` to also extract `campaignId` from tool result
- Update return type to include `campaignId?: number`
- Store `campaignId` in the email preview object

**Lines to modify**: ~105-150

---

## PHASE 2: Create get_email_campaign Tool

### 2.1 Add New Tool Definition
**File**: `app/api/admin/agent/chat/route.ts`

**New tool**: `get_email_campaign`

**Schema**:
```typescript
campaignId: z.number().describe("Campaign ID to fetch")
```

**Description**: 
```
Fetch email campaign HTML and metadata by campaign ID. Use this when Sandra wants to edit an existing email - get the current HTML first, then use compose_email with previousVersion.
```

**Execute function**:
- Query `admin_email_campaigns` table by ID
- Return: `{ html: string, subjectLine: string, campaignName: string, campaignId: number }`
- Handle not found: return error

**Location**: Add after `composeEmailTool` definition (~line 950)

### 2.2 Add Tool to Tool Registry
**File**: `app/api/admin/agent/chat/route.ts`

**Add to tools object**: ~line 4369

```typescript
get_email_campaign: getEmailCampaignTool,
```

---

## PHASE 3: Update Edit Button Flow

### 3.1 Update onEdit Callback
**File**: `components/admin/admin-agent-chat-new.tsx`

**Current**: Sends full HTML in message
**New**: Sends campaign ID reference

**Changes**:
- Check if `messageEmailPreview.campaignId` exists
- If yes: Send "Edit email campaign ID [campaignId]: [user request]"
- If no: Fallback to old HTML method (for backward compatibility during transition)

**Location**: ~line 1790-1804

**Example new message**:
```
Edit email campaign ID 123: make it warmer and more personal
```

### 3.2 Update onManualEdit Callback
**File**: `components/admin/admin-agent-chat-new.tsx`

**Current**: Sends manually edited HTML
**New**: Send campaign ID + edited HTML reference

**Note**: Manual edits might still need HTML (user directly edited), but we can optimize this later.

**Location**: ~line 1806-1829

---

## PHASE 4: Update Alex's Instructions

### 4.1 Update System Prompt
**File**: `lib/admin/alex-system-prompt.ts` (or in chat/route.ts if inline)

**Remove**:
- Complex HTML extraction instructions
- "PREVIOUS compose_email TOOL RESULT" extraction logic
- HTML parsing from conversation history

**Add**:
- Use `get_email_campaign(campaignId)` tool to fetch email HTML
- When user says "Edit campaign X" or "Edit email campaign ID Y", fetch first, then compose
- Simple workflow: fetch → compose with previousVersion

### 4.2 Update compose_email Tool Description
**File**: `app/api/admin/agent/chat/route.ts`

**Update description**: Mention using `get_email_campaign` to get previousVersion when editing by ID

**Location**: ~line 756

---

## PHASE 5: Cleanup & Testing

### 5.1 Remove Old HTML Extraction Logic
**Files to check**:
- `lib/admin/alex-system-prompt.ts` - Remove HTML extraction examples
- `app/api/admin/agent/chat/route.ts` - Check for any remaining extraction logic

### 5.2 Update Email Preview Card Props
**File**: `components/admin/email-preview-card.tsx`

**Ensure**: `campaignId` prop is properly typed and passed through

**Location**: ~line 12

### 5.3 Testing Checklist
- [ ] Create new email → verify campaignId is stored
- [ ] Click "Edit" button → verify message uses campaign ID
- [ ] Alex receives edit request → calls get_email_campaign
- [ ] Alex calls compose_email with fetched HTML
- [ ] Email preview updates correctly
- [ ] Manual HTML edit still works (backward compatibility)

---

## Implementation Order

1. **Phase 1**: Track campaign ID (ensures we have the data)
2. **Phase 2**: Create get_email_campaign tool (gives Alex access)
3. **Phase 3**: Update edit flow (uses IDs instead of HTML)
4. **Phase 4**: Update instructions (tells Alex how to use it)
5. **Phase 5**: Cleanup (remove old code)

---

## Backward Compatibility

**Important**: During transition, support both methods:
- If `campaignId` exists → use ID-based approach
- If no `campaignId` → fallback to old HTML-in-message method

This ensures existing emails/sequences still work while we migrate.

---

## Expected Benefits

✅ **90%+ reduction** in message size ("Edit campaign 123" vs 10,000 chars)
✅ **Cleaner conversations** - no HTML bloat
✅ **Faster processing** - smaller context for model
✅ **Single source of truth** - HTML in database, not duplicated
✅ **Easier debugging** - simple ID references

---

## Risks & Mitigations

**Risk**: Campaign ID not always available (sequences, old emails)
**Mitigation**: Fallback to HTML method when ID missing

**Risk**: Alex doesn't call get_email_campaign correctly
**Mitigation**: Clear instructions + examples in system prompt

**Risk**: Database query fails
**Mitigation**: Proper error handling in tool, fallback message


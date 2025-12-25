# Approve & Send Flow Analysis

## Current Flow When "Approve & Send" is Clicked

1. **User clicks "Approve & Send" button** in `EmailPreviewCard`
2. **Frontend handler** (`admin-agent-chat-new.tsx`):
   - Clears email preview
   - Sends message to Alex: "Approve and send this email now"
3. **Alex processes the request** and calls `schedule_campaign` tool
4. **Backend execution** (`schedule_campaign` tool):
   - Creates campaign record in `admin_email_campaigns` table
   - Replaces `{campaign_id}` placeholder in HTML with actual campaign ID
   - If `scheduledFor` is null (immediate send):
     - Creates Resend broadcast via `resend.broadcasts.create()`
     - Updates campaign status to 'sent'
     - Saves `resend_broadcast_id` to database
   - Returns success message with campaign ID and Resend URL

## What's Working ✅

- Campaign creation in database
- Resend broadcast creation
- Campaign ID replacement in HTML
- Status tracking
- Error handling

## What's Missing ❌

1. **No Test Email Option**: 
   - No way to send a test email before sending to everyone
   - Test email API exists (`/api/admin/agent/send-test-email`) but not accessible from UI

2. **No Confirmation Dialog**:
   - Campaign is sent immediately without confirmation
   - No warning about sending to X recipients

3. **No Campaign ID Available**:
   - When "Approve & Send" is clicked, the campaign doesn't exist yet
   - Test email requires campaign ID, so we need to create campaign first (as draft) or pass email data directly

4. **Missing Safety Checks**:
   - No validation that email looks correct
   - No way to preview in actual email client before sending

## Recommended Solution

### Option 1: Create Draft Campaign First (Recommended)
1. When email is composed, create a draft campaign immediately
2. Add "Send Test" button that uses existing campaign ID
3. Add confirmation dialog before sending
4. Update campaign status from 'draft' to 'sent' when approved

### Option 2: Pass Email Data to Test Endpoint
1. Modify test email endpoint to accept email HTML/subject directly
2. Send test email before creating campaign
3. Then create campaign when approved

**We'll implement Option 1** as it's cleaner and allows tracking test sends.



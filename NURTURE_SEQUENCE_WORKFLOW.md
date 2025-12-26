# Nurture Sequence Workflow

## Current State

### How It Works Now
1. **One Email at a Time**: Alex creates emails individually using the `compose_email` tool
2. **Manual Sequence Creation**: You need to ask Alex to create each email in the sequence separately:
   - "Create Day 1 nurture email"
   - "Create Day 3 nurture email"  
   - "Create Day 7 nurture email"

### Edit Button Behavior
✅ **This is CORRECT behavior:**
- When you click "Edit" on an email preview card, it sends the HTML to Alex
- Alex receives explicit instructions to use that HTML as `previousVersion`
- This helps Alex extract and edit the existing email properly

## Recommended Workflow for Sequences

### Option 1: Create Sequence One-by-One (Current)
**Pros:**
- Full control over each email
- Can review and edit each email before moving to the next
- Alex can reference previous emails in the sequence

**Cons:**
- Takes longer
- More back-and-forth

**Example:**
```
You: "Create a 3-email nurture sequence for new freebie signups"
Alex: "I'll create Day 1, Day 3, and Day 7 emails. Let me start with Day 1..."
[Creates Day 1 email]
You: [Review, edit if needed, approve]
Alex: "Now creating Day 3 email..."
[Creates Day 3 email]
You: [Review, edit if needed, approve]
Alex: "Now creating Day 7 email..."
[Creates Day 7 email]
```

### Option 2: Batch Creation (Future Enhancement)
**Ideal workflow:**
- Ask Alex: "Create a 3-email nurture sequence: Day 1, Day 3, Day 7"
- Alex creates all 3 emails at once
- You review each one
- Edit individually if needed
- Schedule the sequence

**This would require:**
- New tool: `create_email_sequence` that accepts:
  - `sequenceName`: "New Freebie Nurture"
  - `emails`: Array of email configs
    - `day`: 1, 3, 7
    - `intent`: "Welcome email..."
    - `subjectLine`: Optional
  - `targetAudience`: Who receives it
  - `startDate`: When to start the sequence

## Best Practice for Now

### Creating Sequences:
1. **Start with Strategy**: Ask Alex to analyze your audience first
   ```
   "Analyze my freebie signups and create a nurture sequence strategy"
   ```

2. **Create Emails One-by-One**: 
   ```
   "Create Day 1 email for the nurture sequence"
   ```
   - Review the email
   - Edit if needed (using Edit button)
   - Approve when ready

3. **Reference Previous Emails**: When creating Day 3, you can say:
   ```
   "Create Day 3 email. Reference the Day 1 email we just created."
   ```
   Alex will look at the conversation history to maintain consistency

4. **Schedule the Sequence**: Once all emails are created:
   ```
   "Schedule this nurture sequence to start on [date]"
   ```

### Editing Emails:
- ✅ **Edit Button**: Sends HTML to Alex with instructions - this is correct!
- ✅ **Manual Editor**: Use "View HTML" → "Edit HTML" for direct edits
- ✅ **Ask Alex**: "Make this email warmer" - Alex will extract and edit

## Future Enhancement Ideas

1. **Sequence Builder Tool**: Create multiple emails at once
2. **Sequence Templates**: Pre-built nurture sequences
3. **Auto-scheduling**: Automatically space emails (Day 1, 3, 7)
4. **Sequence Preview**: See all emails in sequence before scheduling


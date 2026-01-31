# ADMIN CLEANUP - DELETE CHECKLIST
**Execute these deletions to reduce admin bloat by 66%**

---

## PHASE 1: ADMIN PAGES TO DELETE (34 files)

### Email Management Pages (5 files)
```bash
rm app/admin/email-broadcast/page.tsx
rm app/admin/email-control/page.tsx
rm app/admin/email-sequences/page.tsx
rm app/admin/email-templates/page.tsx
rm app/admin/launch-email/page.tsx
rm app/admin/test-broadcast/page.tsx
```

### Diagnostic/Health Pages (10 files)
```bash
rm app/admin/blueprint-health/page.tsx
rm app/admin/cron-health/page.tsx
rm app/admin/diagnostics/cron/page.tsx
rm app/admin/diagnostics/errors/page.tsx
rm app/admin/health/page.tsx
rm app/admin/maya-health/page.tsx
rm app/admin/prompt-health/page.tsx
rm app/admin/webhook-diagnostics/page.tsx
rm app/admin/test-audience-sync/page.tsx
rm app/admin/test-feed-generation/page.tsx
```

### Test/Development Pages (4 files)
```bash
rm app/admin/test-campaigns/page.tsx
rm -rf app/admin/maya-testing/
rm app/admin/agent/page.tsx  # Just a redirect
```

### Content Management Duplicates (3 files)
```bash
rm app/admin/prompt-guides/page.tsx
rm app/admin/prompt-guide-builder/page.tsx
rm -rf app/admin/writing-assistant/
```

### Feed Management Duplicates (2 files)
```bash
rm app/admin/feed-styles/page.tsx
rm app/admin/feed-positions/page.tsx
```

### Half-Finished/Unclear Pages (5 files)
```bash
rm app/admin/beta/page.tsx
rm app/admin/conversions/page.tsx
rm app/admin/composition-analytics/page.tsx
```

---

## PHASE 2: API ROUTES TO DELETE (80+ files)

### Email Management Routes (30 files)
```bash
# Email automation routes
rm -rf app/api/admin/email/activate-automation/
rm -rf app/api/admin/email/check-automation/
rm -rf app/api/admin/email/create-automation-sequence/
rm -rf app/api/admin/email/create-beta-segment/
rm -rf app/api/admin/email/create-photoshoot-buyers-segment/
rm -rf app/api/admin/email/diagnose-test/
rm -rf app/api/admin/email/get-automation-details/
rm -rf app/api/admin/email/get-automation-sequences/
rm -rf app/api/admin/email/get-resend-segments/
rm -rf app/api/admin/email/get-sequence-status/
rm -rf app/api/admin/email/get-subscriber-counts/
rm -rf app/api/admin/email/preview-campaign/
rm -rf app/api/admin/email/preview-launch/
rm -rf app/api/admin/email/preview/
rm -rf app/api/admin/email/resend-sequence-email/
rm -rf app/api/admin/email/run-scheduled-campaigns/
rm -rf app/api/admin/email/send-beta-testimonial/
rm -rf app/api/admin/email/send-followup-campaign/
rm -rf app/api/admin/email/send-launch-campaign/
rm -rf app/api/admin/email/send-test-launch/
rm -rf app/api/admin/email/subscriber-count/
rm -rf app/api/admin/email/sync-all-subscribers/
rm -rf app/api/admin/email/sync-photoshoot-buyers/
rm -rf app/api/admin/email/track-campaign-recipients/
rm -rf app/api/admin/email/update-sequence-email/

# Email control routes
rm -rf app/api/admin/email-control/
rm -rf app/api/admin/email-templates/
rm -rf app/api/admin/broadcast/
```

### Test/Development Routes (20 files)
```bash
rm -rf app/api/admin/maya-testing/
rm -rf app/api/admin/test-generation/
rm -rf app/api/admin/feed-test/
rm -rf app/api/admin/audience/test-cron/
rm -rf app/api/admin/audience/test-sync/
```

### Diagnostic Duplicates (15 files)
```bash
rm -rf app/api/admin/blueprint-health/
rm -rf app/api/admin/cron-health/
rm -rf app/api/admin/prompt-health/
rm -rf app/api/admin/maya-health/
rm -rf app/api/admin/webhook-diagnostics/
rm -rf app/api/admin/diagnostics/email-status/
rm -rf app/api/admin/diagnostics/cron-status/
rm -rf app/api/admin/diagnostics/stripe-health/
rm -rf app/api/admin/fix-email-system/
rm -rf app/api/admin/fix-lora/
```

### Content Management Duplicates (10 files)
```bash
rm -rf app/api/admin/guides/
rm -rf app/api/admin/prompt-guides/
rm -rf app/api/admin/writing-assistant/
rm -rf app/api/admin/generate-prompts-with-maya/
rm -rf app/api/admin/generate-variation/
```

### Feed Management Duplicates (5 files)
```bash
rm -rf app/api/admin/feed-styles/
```

---

## PHASE 3: COMPONENT CLEANUP

### Check for unused components in /components/admin/
```bash
# Find components only used by deleted pages
grep -r "email-broadcast" components/admin/
grep -r "email-control" components/admin/
grep -r "email-templates" components/admin/
grep -r "test-" components/admin/
```

### Likely candidates for deletion:
```bash
# Review and delete if only used by removed pages:
components/admin/beta-testimonial-broadcast.tsx
components/admin/email-campaign-manager.tsx
# (Check imports first!)
```

---

## SAFETY CHECKLIST

### BEFORE DELETING ANYTHING:

1. **Create backup branch:**
```bash
cd /path/to/project
git checkout -b backup-before-admin-cleanup
git add .
git commit -m "Backup before admin cleanup"
git push origin backup-before-admin-cleanup
```

2. **Create local archive folder:**
```bash
mkdir .backups/admin-cleanup-$(date +%Y%m%d)
```

3. **Copy files before deleting:**
```bash
# Example for one section:
cp -r app/admin/email-* .backups/admin-cleanup-$(date +%Y%m%d)/
```

4. **Test after each deletion batch:**
- Run `npm run build` (or your build command)
- Check for import errors
- Test remaining admin pages still load
- Check console for runtime errors

---

## EXECUTION PLAN

### Step 1: Start Safe
Delete test/development pages first (lowest risk):
```bash
rm app/admin/test-campaigns/page.tsx
rm app/admin/test-audience-sync/page.tsx
rm app/admin/test-feed-generation/page.tsx
rm -rf app/admin/maya-testing/
```

Test build: `npm run build`

### Step 2: Diagnostic Pages
```bash
rm app/admin/blueprint-health/page.tsx
rm app/admin/cron-health/page.tsx
rm app/admin/prompt-health/page.tsx
rm app/admin/webhook-diagnostics/page.tsx
```

Test build: `npm run build`

### Step 3: Email Pages
```bash
rm app/admin/email-broadcast/page.tsx
rm app/admin/email-control/page.tsx
rm app/admin/email-sequences/page.tsx
rm app/admin/email-templates/page.tsx
rm app/admin/launch-email/page.tsx
```

Test build: `npm run build`

### Step 4: API Routes
```bash
# Do this in batches, testing after each
rm -rf app/api/admin/maya-testing/
# Test
rm -rf app/api/admin/email-control/
# Test
rm -rf app/api/admin/email-templates/
# Test
# etc...
```

### Step 5: Update Navigation
After deleting pages, update admin navigation:
- Remove deleted pages from `components/admin/admin-nav.tsx`
- Test navigation links
- Ensure no broken routes

---

## VERIFICATION CHECKLIST

After all deletions, verify:

- [ ] `npm run build` succeeds with no errors
- [ ] All remaining admin pages load without errors
- [ ] Admin navigation shows only 18 core pages
- [ ] No broken links in admin
- [ ] No console errors when navigating admin
- [ ] Database queries still work
- [ ] API calls from frontend still work

---

## ROLLBACK PLAN

If something breaks:

```bash
# Option 1: Restore from backup branch
git checkout backup-before-admin-cleanup

# Option 2: Restore specific file
git checkout backup-before-admin-cleanup -- app/admin/some-page/page.tsx

# Option 3: Restore from local backup
cp -r .backups/admin-cleanup-YYYYMMDD/app/admin/some-page app/admin/
```

---

## POST-CLEANUP TASKS

1. **Update documentation:**
   - Update README with new admin structure
   - Document the 18 core admin pages
   - Update any API documentation

2. **Clean up database:**
   - Archive old email_automation_sequences
   - Clean admin_error_logs older than 30 days
   - Remove test data

3. **Update git:**
```bash
git add .
git commit -m "Clean admin: Remove 34 redundant pages, 80 API routes

- Deleted duplicate email management pages (5)
- Removed test/development pages (4)
- Consolidated diagnostic pages (10)
- Cleaned up feed management (2)
- Removed half-finished features (5)
- Deleted associated API routes (80+)

Reduced admin codebase from 17,480 to ~8,000 lines (54% reduction)
Consolidated 52 pages to 18 focused pages

See ADMIN_AUDIT_REPORT.md for full details"

git push origin main
```

---

## ESTIMATED TIME

- **Backup & prep:** 15 minutes
- **Page deletions:** 30 minutes (with testing between batches)
- **API route deletions:** 45 minutes (with testing)
- **Navigation updates:** 15 minutes
- **Final verification:** 30 minutes
- **Documentation:** 15 minutes

**Total: ~2.5 hours** for clean, safe execution

---

## NEED HELP?

If you encounter issues:
1. Check the backup branch
2. Review build errors carefully
3. Test one page at a time
4. Ask for help before deleting critical routes

**Questions? Stop and ask before proceeding if unsure!**

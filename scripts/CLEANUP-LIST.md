# Detailed Scripts Cleanup List

## DELETE IMMEDIATELY (Already Executed)

### Migration Scripts
\`\`\`
migrate-users.ts
migrate.ts
reset-passwords.ts
import-production-data.sql
\`\`\`

### Duplicate Schema Files (Keep Latest Only)
\`\`\`
# Sessions Tables - Keep ONLY the highest number
scripts/20-create-sessions-tables.sql  ❌ DELETE
scripts/21-create-sessions-tables.ts   ❌ DELETE  
scripts/22-create-sessions-tables.ts   ✅ KEEP

# Feed Tables - Keep ONLY the latest
scripts/21-create-feed-tables-fixed.sql  ❌ DELETE
scripts/22-update-feed-tables-schema.sql ✅ KEEP
\`\`\`

### User-Specific Fixes (One-Time)
\`\`\`
fix-hafdisosk-lora-1.sql
fix-hafdisosk-lora-2.sql
fix-hafdisosk-lora-3.sql
fix-sandra-users-lora.sql
check-shannon-photos.ts
check-shannon-loras.ts
\`\`\`

### Test Data Cleanup (Already Run)
\`\`\`
cleanup-test-users.ts
cleanup-test-users.sql
cleanup-test-users-v2.ts
cleanup-test-users-final.sql
delete-test-users.js
remove-test-data.ts
\`\`\`

### Analysis Scripts (One-Time Debugging)
\`\`\`
analyze-images.ts
analyze-user-data.ts
analyze-lora-usage.ts
diagnose-signup-flow.sql
diagnose-payment-issues.ts
check-database-integrity.ts
verify-user-credits.ts
\`\`\`

## ORGANIZE INTO FOLDERS

### Keep in `scripts/schema/`
- Latest table creation scripts
- Current schema definitions
- Active database structure files

### Keep in `scripts/seed/`
- Development seed data
- Test data generators
- Sample content scripts

### Keep in `scripts/utils/`
- `create-stripe-beta-coupon.ts` (active beta program)
- Any scripts still used for maintenance
- Utility functions still referenced

## DELETION COMMANDS

\`\`\`bash
# Create backup first
mkdir -p scripts/archive
cp -r scripts/* scripts/archive/

# Delete migrations
rm scripts/migrate-*.ts
rm scripts/import-production-data.sql

# Delete old schema versions (keep latest only)
rm scripts/20-create-sessions-tables.sql
rm scripts/21-create-sessions-tables.ts

# Delete user-specific fixes
rm scripts/fix-*.sql
rm scripts/fix-*.ts
rm scripts/check-shannon-*.ts

# Delete cleanup scripts
rm scripts/cleanup-test-users*.ts
rm scripts/cleanup-test-users*.sql
rm scripts/delete-test-users.js

# Delete analysis scripts
rm scripts/analyze-*.ts
rm scripts/diagnose-*.sql
rm scripts/diagnose-*.ts
rm scripts/verify-*.ts

# Organize remaining scripts
mkdir -p scripts/schema scripts/seed scripts/utils
# Then manually move files to appropriate folders
\`\`\`

## VERIFICATION CHECKLIST

Before deleting any scripts, verify:

- [ ] All migrations have been run in production
- [ ] Current database schema matches latest scripts
- [ ] No active code references deleted scripts
- [ ] Backup copy exists in `scripts/archive/`
- [ ] Documentation updated to reflect current scripts

## ESTIMATED RESULT

**Before:** 165 files
**After:** 20-30 files organized into:
- `schema/` - 5-10 files
- `seed/` - 5-10 files
- `utils/` - 5-10 files
- `archive/` - 120+ archived files (for reference)

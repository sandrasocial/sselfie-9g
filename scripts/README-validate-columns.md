# Column Name Validation Script

## Overview

This script validates SQL queries in your codebase to ensure they use correct column names according to the actual database schema. It helps catch runtime errors before they happen.

## Usage

```bash
npm run validate-columns
```

Or directly:

```bash
npx tsx scripts/validate-column-names.ts
```

## What It Checks

The script scans all `.ts`, `.tsx`, `.js`, `.jsx`, and `.sql` files and looks for:

### Common Issues Detected:

1. **`u.first_name`** → Should be `u.display_name as first_name`
2. **`u.last_name`** → Should be `u.display_name` (last_name doesn't exist)
3. **`u.last_activity_at`** → Should be `u.last_login_at`
4. **`users.first_name`** → Should be `users.display_name`
5. **`users.last_activity_at`** → Should be `users.last_login_at`

## Output

The script will:
- ✅ Exit with code 0 if no issues are found
- ❌ Exit with code 1 and list all issues found with:
  - File path
  - Line and column number
  - Incorrect column name
  - Correct column name
  - Context around the issue

## Example Output

```
❌ Found 3 column name issue(s) in 2 file(s):

📄 app/api/cron/reengagement-campaigns/route.ts
   Line 56, Column 15:
   ❌ Found: u.last_activity_at
   ✅ Should be: u.last_login_at
   Context: ...WHERE s.status = 'active' AND u.last_activity_at < NOW()...

📄 app/api/cron/welcome-sequence/route.ts
   Line 47, Column 30:
   ❌ Found: u.first_name
   ✅ Should be: u.display_name
   Context: ...SELECT DISTINCT u.email, u.first_name, u.id...
```

## Integration

You can integrate this into your CI/CD pipeline or run it as a pre-commit hook:

### Pre-commit Hook (using husky)

```bash
# .husky/pre-commit
npm run validate-columns
```

### GitHub Actions

```yaml
- name: Validate Column Names
  run: npm run validate-columns
```

## Customization

To add more column mappings, edit `scripts/validate-column-names.ts` and add to the `COLUMN_PATTERNS` array:

```typescript
{
  pattern: /\bnew_incorrect_column\b/g,
  incorrect: "new_incorrect_column",
  correct: "correct_column_name",
  description: "Description of the issue",
}
```

## Notes

- The script ignores `node_modules`, `.next`, `.git`, and other common directories
- It only checks SQL template literals (`` sql`...` ``)
- False positives are possible - always review the output before making changes

# Development Tooling Guide

This document describes the development tools configured for SSELFIE Studio.

## ESLint

**Configuration:** `.eslintrc.json`

ESLint is configured with Next.js recommended rules and TypeScript support.

### Usage

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

### Rules

- Uses Next.js core web vitals rules
- TypeScript-specific rules enabled
- Warns on unused variables (prefixed with `_` are ignored)
- Warns on `any` types
- Allows `console.warn` and `console.error` (warns on `console.log`)

## Prettier

**Configuration:** `.prettierrc`

Prettier is configured to match the existing codebase style.

### Usage

```bash
# Format all files
npm run format

# Check formatting without changing files
npm run format:check
```

### Configuration

- No semicolons
- Double quotes
- 2-space indentation
- 100 character line width
- ES5 trailing commas

## Vitest (Testing Framework)

**Configuration:** `vitest.config.ts`

Vitest is a fast, lightweight testing framework compatible with Vite.

### Usage

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Setup

- Test environment: `jsdom` (for React component testing)
- Setup file: `tests/setup.ts`
- Includes React Testing Library and Jest DOM matchers
- Path aliases configured (`@/` maps to project root)

### Writing Tests

Example test file structure:

```typescript
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import MyComponent from "@/components/MyComponent"

describe("MyComponent", () => {
  it("should render correctly", () => {
    render(<MyComponent />)
    expect(screen.getByText("Hello")).toBeInTheDocument()
  })
})
```

## Structured Logging

**Location:** `lib/logger.ts`

A lightweight structured logging utility that replaces `console.log` statements.

### Usage

```typescript
import { logger } from "@/lib/logger"

// Debug (only in development)
logger.debug("Processing user request", { userId: "123" })

// Info
logger.info("User logged in", { email: "user@example.com" })

// Warning
logger.warn("Rate limit approaching", { requests: 95, limit: 100 })

// Error (automatically sent to Sentry in production)
logger.error("Failed to process payment", error, { orderId: "456" })
```

### Features

- **Development**: Human-readable console output with timestamps
- **Production**: JSON-structured logs for log aggregation
- **Error Tracking**: Automatically sends errors to Sentry in production
- **Context**: Supports additional context objects for debugging

### Migration from console.log

Replace:
```typescript
console.log("[v0] User logged in:", user.email)
```

With:
```typescript
logger.info("User logged in", { email: user.email })
```

Replace:
```typescript
console.error("[v0] Error:", error)
```

With:
```typescript
logger.error("Operation failed", error, { context: "additional info" })
```

## Type Checking

### Usage

```bash
# Check types without building
npm run type-check
```

Note: Currently `ignoreBuildErrors: true` is set in `next.config.mjs`. Consider removing this and fixing type errors for better type safety.

## Recommended Workflow

1. **Before committing:**
   ```bash
   npm run lint:fix
   npm run format
   npm run type-check
   npm test
   ```

2. **During development:**
   - Use `logger` instead of `console.log`
   - Run `npm run test:watch` in a separate terminal
   - Fix linting errors as you code

3. **Before deploying:**
   - Ensure all tests pass
   - Check for type errors
   - Review linting warnings

## IDE Integration

### VS Code

Recommended extensions:
- ESLint
- Prettier
- Vitest

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript", "typescript", "typescriptreact"]
}
```

## Next Steps

1. **Migrate console.log to logger**: Gradually replace `console.log` statements with structured logging
2. **Add tests**: Start writing tests for critical paths (payments, auth, credits)
3. **Fix type errors**: Remove `ignoreBuildErrors` and fix existing type issues
4. **CI Integration**: Add linting, type checking, and tests to CI pipeline


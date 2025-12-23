# Fix npm Authentication Issue

## The Problem
npm is trying to use an expired access token, causing installation failures.

## Solution Options

### Option 1: Clear npm auth completely (Recommended)
```bash
# Remove all npm auth tokens
npm logout
rm ~/.npmrc 2>/dev/null || true

# Try installing again
npm install html-to-text --legacy-peer-deps
```

### Option 2: Use yarn instead (if available)
```bash
yarn add html-to-text
```

### Option 3: Skip installation (Code works without it!)
The code already has a fallback implementation that works without the package. You can:
- Build and run the app now (it will work)
- Install the package later when npm auth is fixed

## Current Status

✅ **Code is fixed** - Has fallback that works without package  
✅ **Build should work** - No errors expected  
⚠️ **Package not installed** - Optional, can install later

## Verify Build Works

```bash
npm run build
```

If the build succeeds, you're good to go! The `html-to-text` package is optional.


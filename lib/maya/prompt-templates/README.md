# Prompt Templates Directory

## Purpose
This directory contains prompt templates used by **admin tools only**.

## Important Notes
- ❌ **NOT used by Maya's unified generation system**
- ✅ Used by `lib/admin/universal-prompts-loader.ts` for admin functionality
- These templates are for legacy admin tools, not for Maya's core generation

## Files
- `high-end-brands/` - Brand-specific templates for admin tools
  - `beauty-brands.ts` - Beauty brand templates
  - `brand-registry.ts` - Brand registry and categorization
  - `category-mapper.ts` - Category mapping utilities
  - `fashion-brands.ts` - Fashion brand templates
  - `index.ts` - Main export file
- `types.ts` - Type definitions for admin template system (if exists)

## Maya's Unified System
Maya's core generation system uses:
- `lib/maya/core-personality.ts` - Unified personality
- `lib/maya/mode-adapters.ts` - Mode-specific adapters
- `lib/maya/flux-examples.ts` - Classic Mode examples
- `lib/maya/nano-banana-examples.ts` - Pro Mode examples

**These template files are separate and not used by Maya's generation.**

## Do Not Modify
These files are intentionally kept separate from Maya's unified system.
Modifications here will NOT affect Maya's concept generation or chat responses.

## Last Updated
January 2025 - Post Maya consolidation


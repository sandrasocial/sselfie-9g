 # Feed Planner Admin Guide
 
 ## Overview
 This guide explains how to manage Feed Planner prompts via the admin tools:
 - `/admin/feed-styles` — style definitions
 - `/admin/fashion-styles` — fashion style rules
 - `/admin/feed-positions` — 9-position templates
 - `/admin/libraries` — outfits, locations, objects
 - `/admin/test-feed-generation` — validation + prompt previews
 
 ## Feed Style Manager (`/admin/feed-styles`)
 Use this page to define how Visual Aesthetic + Feed Style map to internal category + mood.
 
 Steps:
 1. Click **Add Style** (right panel).
 2. Enter the **Visual Aesthetic** label (exactly as shown in UI).
 3. Enter the **Feed Style** label (exactly as shown in UI).
 4. Set **Category** and **Mood** (internal keys).
 5. Fill in palette, hex codes, lighting, mood, background notes.
 6. Click **Save**.
 
 Notes:
 - These definitions are the single source of truth for category/mood.
 - Disable a combination by unchecking **Enabled**.
 
 ## Fashion Style Manager (`/admin/fashion-styles`)
 Define fashion styles and which categories they work with.
 
 Steps:
 1. Click **Add Fashion Style**.
 2. Enter the style name (UI label).
 3. Add compatible categories (comma-separated).
 4. Add outfit base/layer options (comma-separated).
 5. Click **Save**.
 
 ## Feed Position Manager (`/admin/feed-positions`)
 Configure the 9-position template for each style combination.
 
 Steps:
 1. Select **Visual Aesthetic**, **Feed Style**, **Fashion Style**.
 2. Click **Load Positions**.
 3. Click a position to edit.
 4. Fill in:
    - Activity
    - Outfit description
    - Location type + description
    - Camera framing
    - Objects (JSON)
    - Lighting type
    - Pose description
    - Narrative (position 5 sign/text optional)
    - Final prompt override (optional)
 5. Click **Save Position**.
 
 Tips:
 - `final_prompt_override` is used verbatim for single-scene generation.
 - Keep objects valid JSON, e.g.:
   `[{"type":"phone","description":"phone","position":"hand"}]`
 
 ## Libraries (`/admin/libraries`)
 Manage reusable outfits, locations, and objects.
 
 Steps:
 1. Choose a tab: **outfits**, **locations**, or **objects**.
 2. Select an existing item to edit or add a new one.
 3. Save your changes.
 
 ## Test Feed Generation (`/admin/test-feed-generation`)
 Validate a combination without generating images.
 
 Steps:
 1. Select **Visual Aesthetic**, **Feed Style**, **Fashion Style**.
 2. Choose a position (1–9).
 3. Click **Run Test**.
 4. Review the preview prompt and single-scene prompt.
 
 ## Troubleshooting
 - **Style combination not found** → Add it in `/admin/feed-styles`.
 - **No templates found** → Add 9 positions in `/admin/feed-positions`.
 - **Prompts feel off** → Adjust position templates or set `final_prompt_override`.

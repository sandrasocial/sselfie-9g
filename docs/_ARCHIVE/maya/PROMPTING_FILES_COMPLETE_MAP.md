# Complete Prompting Files Map
**Generated:** 2026-01-05
**Purpose:** Comprehensive inventory of all files related to Maya's prompting system

---

## 📋 Table of Contents

1. [Core Prompt Generation Files](#1-core-prompt-generation-files)
2. [Example Files](#2-example-files)
3. [Personality & System Prompt Files](#3-personality--system-prompt-files)
4. [Knowledge Base Files](#4-knowledge-base-files)
5. [Template Files](#5-template-files)
6. [Builder/Constructor Files](#6-builderconstructor-files)
7. [Helper & Utility Files](#7-helper--utility-files)
8. [Validator Files](#8-validator-files)
9. [API Route Files](#9-api-route-files)
10. [Pro Mode Specific Files](#10-pro-mode-specific-files)
11. [Feed Planner Files](#11-feed-planner-files)
12. [Post-Processing Files](#12-post-processing-files)

---

## 1. Core Prompt Generation Files

### 1.1 Main Concept Generation
- **`app/api/maya/generate-concepts/route.ts`** (4051 lines)
  - **Purpose:** Main API endpoint for generating concept cards in both Classic and Pro modes
  - **Usage:** Called when users request concept generation in Maya chat
  - **Features:** 
    - Handles both Classic Mode (Flux LoRA) and Pro Mode (Nano Banana Pro)
    - Uses direct prompt generation (Maya generates final prompts directly)
    - Integrates perfect examples from nano-banana-examples.ts for Pro Mode
    - Includes validation via nano-banana-validator.ts
    - Enforces variety across concepts (different outfits, locations, poses)
    - Reads `x-studio-pro-mode` header to determine mode
  - **Status:** Active - Primary concept generation endpoint

- **`app/api/maya/pro/generate-concepts/route.ts`**
  - **Purpose:** Alternative Pro Mode concept generation endpoint
  - **Usage:** Legacy/alternative implementation for Pro Mode
  - **Status:** May be deprecated in favor of main generate-concepts route

### 1.2 Feed Prompt Generation
- **`app/api/maya/generate-feed-prompt/route.ts`** (984 lines)
  - **Purpose:** Generates prompts for individual feed posts in the feed planner
  - **Usage:** Called when generating a single feed post prompt
  - **Features:**
    - Supports both Classic Mode (Flux) and Pro Mode (Nano Banana)
    - Reads `x-studio-pro-mode` header to determine mode
    - Uses getFluxPromptingPrinciples() for Classic Mode
    - Uses getNanoBananaPromptingPrinciples() for Pro Mode
    - Fetches user context (brand profile, preferences, colors)
    - Handles regeneration and reference prompts
  - **Status:** Active - Used by feed planner

- **`app/api/maya/generate-all-feed-prompts/route.ts`**
  - **Purpose:** Batch generation for all 9 feed prompts in a single API call
  - **Usage:** Optimizes cost by reducing 9 API calls to 1
  - **Features:** Uses direct Anthropic API with prompt caching
  - **Status:** Active - Cost optimization endpoint

### 1.3 Direct Prompt Generation
- **`lib/maya/direct-prompt-generation.ts`**
  - **Purpose:** Core logic for direct prompt generation (no extraction/rebuilding)
  - **Usage:** Provides helper functions for prompt validation and fixing
  - **Key Functions:**
    - `applyProgrammaticFixes()` - Fixes syntax errors only
    - `validatePromptLight()` - Lightweight prompt validation
    - `generatePromptDirect()` - Direct prompt generation function
  - **Philosophy:** "Let Claude Be Claude" - no extraction, no rebuilding
  - **Status:** Active - Used in concept generation

- **`lib/maya/prompt-generator.ts`**
  - **Purpose:** High-level prompt generation orchestrator for workbench context
  - **Usage:** Analyzes workbench context and generates optimized prompts
  - **Features:**
    - Uses template system (carousel, UGC, product mockup, etc.)
    - Analyzes workbench images and user intent
    - Generates prompt suggestions based on content type
  - **Status:** Active - Used for prompt suggestions

---

## 2. Example Files

### 2.1 Nano Banana Examples
- **`lib/maya/nano-banana-examples.ts`**
  - **Purpose:** Contains 10 "perfect" Nano Banana Pro prompt examples
  - **Usage:** Embedded in system prompts to teach Maya the desired structure
  - **Content:** Examples showing exact format: [IMAGE TYPE] + [STYLE REFERENCE] + identity preservation + detailed outfit + hair + accessories + expression/pose + lighting + aesthetic
  - **Philosophy:** Examples-based learning instead of rule-based templates
  - **Status:** Active - Used in Pro Mode concept generation (app/api/maya/generate-concepts/route.ts)

---

## 3. Personality & System Prompt Files

### 3.1 Core Personalities
- **`lib/maya/personality.ts`** (563 lines)
  - **Purpose:** Classic Mode personality system prompt (LoRA preservation focus)
  - **Usage:** Used in Classic Mode chat and concept generation
  - **Content:** 
    - MAYA_SYSTEM_PROMPT - Main system prompt for Classic Mode
    - Defines communication style (warm, friendly, emojis)
    - LoRA preservation rules (30-45 word prompts, forbidden words)
    - Feed planner workflow instructions
    - Chat response rules vs prompt generation rules
  - **Status:** Active - Used in Classic Mode

- **`lib/maya/personality-enhanced.ts`**
  - **Purpose:** Enhanced personality for Studio Pro Mode
  - **Usage:** Used in Pro Mode system prompts
  - **Content:**
    - MAYA_PERSONALITY interface and object
    - getMayaPersonality() function
    - Defines Maya as elite fashion photographer
    - Current trends 2026, brand expertise, creative freedom
  - **Status:** Active - Used in Pro Mode

- **`lib/maya/pro-personality.ts`**
  - **Purpose:** Pro Mode specific personality (Creative Director & Production Assistant)
  - **Usage:** Used in Pro Mode chat (app/api/maya/pro/chat/route.ts)
  - **Content:** MAYA_PRO_SYSTEM_PROMPT with production assistant focus
  - **Key Rules:** No instructions after concepts appear, brand-aware guidance
  - **Status:** Active - Used in Pro Mode chat

- **`lib/maya/personality/shared-personality.ts`**
  - **Purpose:** Shared personality components used across both modes
  - **Usage:** Base personality traits for consistency
  - **Content:** SHARED_MAYA_PERSONALITY constant with core traits
  - **Status:** Active - Used by both modes

### 3.2 System Prompt Builders
- **`lib/maya/prompt-builders/system-prompt-builder.ts`**
  - **Purpose:** Builds system prompts dynamically based on context
  - **Usage:** Constructs system prompts with Studio Pro sections, guide prompts, etc.
  - **Content:** SystemPromptContext interface, buildSystemPrompt() function
  - **Status:** Active - Used in concept generation

- **`lib/maya/studio-pro-system-prompt.ts`**
  - **Purpose:** Studio Pro Mode system prompt extension and intent detection
  - **Usage:** Detects when user wants Studio Pro mode features
  - **Content:** 
    - detectStudioProIntent() function
    - StudioProIntent interface
    - Detects brand-scene, text-overlay, transformation modes
  - **Status:** Active - Used in chat route

- **`lib/maya/pro/system-prompts.ts`**
  - **Purpose:** Pro Mode system prompts (placeholder/legacy)
  - **Usage:** Currently empty object, may be deprecated
  - **Status:** Placeholder - Not actively used

---

## 4. Knowledge Base Files

### 4.1 Fashion & Style Knowledge
- **`lib/maya/fashion-knowledge-2025.ts`** (497+ lines)
  - **Purpose:** Comprehensive fashion intelligence for Classic Mode
  - **Usage:** Used in Classic Mode only (skipped in Pro Mode - line 904-906)
  - **Content:**
    - getFashionIntelligencePrinciples() - Main function returning fashion guidance
    - FASHION_TRENDS_2025 - Instagram aesthetics, viral content types
    - GENDER_SPECIFIC_STYLING - Gender-aware styling principles
    - SEASONAL_PALETTES_2025 - Seasonal color and fabric guidance
    - **CRITICAL:** Lines 450-495 contain BRAND DATABASE with specific brand names (The Row, Toteme, COS, etc.)
  - **Status:** Active in Classic Mode only - NOT used in Pro Mode

- **`lib/maya/brand-library-2025.ts`**
  - **Purpose:** Brand library with outfit generation for Classic Mode
  - **Usage:** Used by prompt-constructor.ts in Classic Mode
  - **Content:**
    - generateCompleteOutfit() - Generates branded outfit based on category
    - Brand-specific pieces (Alo Yoga, Lululemon, The Row, etc.)
    - Category-based outfit selection
  - **Status:** Active in Classic Mode - NOT used in Pro Mode direct generation

- **`lib/maya/brand-aesthetics.ts`**
  - **Purpose:** Simple brand aesthetic descriptions (reference material only)
  - **Usage:** Reference material for understanding brand vibes
  - **Content:** BRAND_AESTHETICS record with vibe, style, colors, setting
  - **Status:** Reference only - Currently not imported in system prompts

### 4.2 Lifestyle & Context Knowledge
- **`lib/maya/lifestyle-contexts.ts`**
  - **Purpose:** Lifestyle context intelligence for specific scenarios
  - **Usage:** Provides context-specific guidance (night out, luxury, coffee run, etc.)
  - **Content:** getLifestyleContextIntelligence() function with scenario definitions
  - **Status:** Active - Used in concept generation

- **`lib/maya/luxury-lifestyle-settings.ts`** (135 lines)
  - **Purpose:** Luxury lifestyle elevation guidelines (reference material)
  - **Usage:** Reference material for understanding luxury markers
  - **Content:** 
    - LUXURY_LIFESTYLE_SETTINGS constant
    - Transportation (G-Wagon, Porsche, etc.)
    - Settings (hotels, residences, dining)
    - Props & accessories (champagne, designer items)
  - **Status:** Reference only - Guidance, not templates

- **`lib/maya/instagram-location-intelligence.ts`**
  - **Purpose:** Instagram location knowledge and settings
  - **Usage:** Provides location-specific guidance for prompts
  - **Content:** INSTAGRAM_LOCATION_INTELLIGENCE constant
  - **Status:** Active - Used in concept generation

- **`lib/maya/influencer-posing-knowledge.ts`**
  - **Purpose:** Posing knowledge for influencer-style content
  - **Usage:** Provides pose guidance for natural influencer poses
  - **Content:** INFLUENCER_POSING_KNOWLEDGE constant
  - **Status:** Active - Used in concept generation

### 4.3 Photography & Technical Knowledge
- **`lib/maya/authentic-photography-knowledge.ts`**
  - **Purpose:** Authentic photography craft knowledge (micro-expressions, natural moments)
  - **Usage:** Reference material for creating authentic, unposed moments
  - **Content:** AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE constant with expression and moment guidance
  - **Status:** Active - Used in concept generation

- **`lib/maya/flux-prompting-principles.ts`** (360 lines)
  - **Purpose:** Flux (Classic Mode) prompting principles and best practices
  - **Usage:** Used in Classic Mode only (getFluxPromptingPrinciples())
  - **Content:**
    - FLUX_PROMPTING_PRINCIPLES constant
    - Banned words (ultra realistic, 8K, perfect, etc.)
    - Optimal structure (30-60 words)
    - Authentic iPhone photography style
    - Natural language guidelines
  - **Status:** Active in Classic Mode only - NOT used in Pro Mode

- **`lib/maya/nano-banana-prompt-builder.ts`**
  - **Purpose:** Nano Banana (Pro Mode) prompting principles and helpers
  - **Usage:** Used in Pro Mode (getNanoBananaPromptingPrinciples())
  - **Content:**
    - getNanoBananaPromptingPrinciples() - Main function
    - buildBrandScenePrompt() - Simplified to ~30 lines (removed extraction logic)
    - cleanStudioProPrompt() - Simplified to ~24 lines (minimal formatting only)
  - **Status:** Active - Used in Pro Mode, simplified (no extraction/rebuilding)

- **`lib/maya/flux-prompt-optimization.ts`**
  - **Purpose:** Flux prompt length optimization and face preservation guide
  - **Usage:** Research-backed best practices for Flux models
  - **Content:** FLUX_PROMPT_OPTIMIZATION constant with optimal lengths by shot type
  - **Status:** Reference material - Used for Classic Mode optimization

- **`lib/maya/instagram-loras.ts`**
  - **Purpose:** Instagram LoRA knowledge and recommendations
  - **Usage:** Reference material for LoRA selection
  - **Content:** INSTAGRAM_LORAS constant with LoRA profiles (Instagirl, UltraRealistic, etc.)
  - **Status:** Reference material

- **`lib/maya/storytelling-emotion-guide.ts`**
  - **Purpose:** Storytelling and emotion guidance for Instagram photos
  - **Usage:** Reference material for creating narrative moments
  - **Content:** STORYTELLING_EMOTION_GUIDE constant with story elements
  - **Status:** Reference material

---

## 5. Template Files

### 5.1 High-End Brand Templates
- **`lib/maya/prompt-templates/high-end-brands/index.ts`**
  - **Purpose:** Main index for high-end brand templates
  - **Usage:** Central export for all brand template modules
  - **Content:** Re-exports all brand template modules and utilities
  - **Status:** Active - Template system index

- **`lib/maya/prompt-templates/high-end-brands/brand-registry.ts`**
  - **Purpose:** Brand registry and category definitions
  - **Usage:** Central place for brand-specific aesthetics and visual guidelines
  - **Content:**
    - BrandCategoryKey, BrandCategory interfaces
    - BRAND_PROFILES - Brand profiles with aesthetics
    - BRAND_CATEGORIES - Category definitions
  - **Status:** Active - Brand registry

- **`lib/maya/prompt-templates/high-end-brands/category-mapper.ts`**
  - **Purpose:** Category detection and brand mapping
  - **Usage:** Detects category and suggests brands from user input
  - **Content:**
    - detectCategoryAndBrand() - Main detection function
    - CategoryDetectionResult interface
    - Brand keyword matching
  - **Status:** Active - Category detection

- **`lib/maya/prompt-templates/high-end-brands/fashion-brands.ts`**
  - **Purpose:** Fashion brand templates (Reformation, Everlane, Aritzia)
  - **Usage:** Provides brand-specific prompt templates
  - **Content:** PromptTemplate objects for each brand
  - **Status:** Active - Brand templates

- **`lib/maya/prompt-templates/high-end-brands/luxury-brands.ts`**
  - **Purpose:** Luxury brand templates (Chanel, Dior)
  - **Usage:** High-detail editorial prompts for luxury brands
  - **Content:** Luxury editorial building blocks and templates
  - **Status:** Active - Brand templates

- **`lib/maya/prompt-templates/high-end-brands/wellness-brands.ts`**
  - **Purpose:** Wellness brand templates (Alo Yoga, Lululemon)
  - **Usage:** Nano Banana-ready prompt blueprints for wellness content
  - **Content:** Brand-specific templates with helper functions
  - **Status:** Active - Brand templates

- **`lib/maya/prompt-templates/high-end-brands/lifestyle-brands.ts`**
  - **Purpose:** Lifestyle brand templates (Glossier, Free People)
  - **Usage:** Relatable, authentic aesthetics for lifestyle content
  - **Content:** Brand-specific templates with variations
  - **Status:** Active - Brand templates

- **`lib/maya/prompt-templates/high-end-brands/beauty-brands.ts`**
  - **Purpose:** Beauty lifestyle templates (makeup, skincare, hair)
  - **Usage:** Beauty rituals and self-care content
  - **Content:** Beauty lifestyle templates (not brand-specific)
  - **Status:** Active - Lifestyle templates

- **`lib/maya/prompt-templates/high-end-brands/tech-brands.ts`**
  - **Purpose:** Tech lifestyle templates (digital products, devices)
  - **Usage:** Tech-enhanced lifestyle content
  - **Content:** Tech lifestyle templates (not brand-specific)
  - **Status:** Active - Lifestyle templates

- **`lib/maya/prompt-templates/high-end-brands/travel-lifestyle.ts`**
  - **Purpose:** Travel & airport lifestyle templates
  - **Usage:** "It girl" aspirational travel aesthetic
  - **Content:** TravelLifestyleCategory with templates and variations
  - **Status:** Active - Lifestyle templates

- **`lib/maya/prompt-templates/high-end-brands/seasonal-christmas.ts`**
  - **Purpose:** Seasonal Christmas/holiday templates
  - **Usage:** Cozy luxury + Pinterest editorial aesthetic for November–December
  - **Content:** SeasonalChristmasCategory with templates
  - **Status:** Active - Seasonal templates

- **`lib/maya/prompt-templates/high-end-brands/selfies.ts`**
  - **Purpose:** Selfie lifestyle templates
  - **Usage:** Authentic selfie moments with luxury aesthetic
  - **Content:** Selfie lifestyle templates (not brand-specific)
  - **Status:** Active - Lifestyle templates

### 5.2 Content Type Templates
- **`lib/maya/prompt-templates/carousel-prompts.ts`**
  - **Purpose:** Carousel prompt templates (multi-slide posts)
  - **Usage:** Templates for carousel cover slides and content
  - **Content:** CAROUSEL_TEMPLATES constant with PromptTemplate objects
  - **Status:** Active - Used in template system

- **`lib/maya/prompt-templates/ugc-prompts.ts`**
  - **Purpose:** UGC (User Generated Content) prompt templates
  - **Usage:** Authentic UGC-style content templates
  - **Content:** UGC_TEMPLATES constant (morning routine, etc.)
  - **Status:** Active - Used in template system

- **`lib/maya/prompt-templates/product-mockup-prompts.ts`**
  - **Purpose:** Product mockup prompt templates
  - **Usage:** Product lifestyle mockup content
  - **Content:** PRODUCT_MOCKUP_TEMPLATES constant
  - **Status:** Active - Used in template system

- **`lib/maya/prompt-templates/reel-cover-prompts.ts`**
  - **Purpose:** Reel cover prompt templates
  - **Usage:** Educational and engaging reel cover designs
  - **Content:** REEL_COVER_TEMPLATES constant
  - **Status:** Active - Used in template system

- **`lib/maya/prompt-templates/brand-partnership-prompts.ts`**
  - **Purpose:** Brand partnership prompt templates
  - **Usage:** Brand partnership and sponsored content
  - **Content:** BRAND_PARTNERSHIP_TEMPLATES constant
  - **Status:** Active - Used in template system

- **`lib/maya/prompt-templates/index.ts`**
  - **Purpose:** Main index for all prompt templates
  - **Usage:** Centralized access to all template categories
  - **Content:** ALL_TEMPLATES record, getTemplateById(), getTemplatesByUseCase()
  - **Status:** Active - Template system index

- **`lib/maya/prompt-templates/types.ts`**
  - **Purpose:** Type definitions for template system
  - **Usage:** TypeScript interfaces for templates
  - **Content:**
    - PromptTemplate, PromptContext interfaces
    - ImageReference, BrandProfile interfaces
    - NanoBananaCapability type
  - **Status:** Active - Type definitions

- **`lib/maya/prompt-templates/helpers.ts`**
  - **Purpose:** Helper functions for template generation
  - **Usage:** Utility functions for analyzing images, determining poses, etc.
  - **Content:**
    - analyzeUserFromImage() - Analyzes user from image
    - identifyUserImage() - Identifies user image in context
    - determineEngagingPose() - Determines pose based on content type
  - **Status:** Active - Template helpers

- **`lib/maya/prompt-templates/instagram-text-rules.ts`**
  - **Purpose:** Instagram text placement and typography best practices
  - **Usage:** Rules for text overlays on images
  - **Content:**
    - INSTAGRAM_TEXT_RULES constant
    - TextPlacementConfig, ValidationResult interfaces
    - Rules for cover slides, content slides, etc.
  - **Status:** Active - Text placement rules

- **`lib/maya/concept-templates.ts`**
  - **Purpose:** Concept templates for Studio Pro upload module
  - **Usage:** Ensures consistency between upload module and message building
  - **Content:**
    - CONCEPT_TEMPLATES record organized by category
    - ConceptTemplate interface (value, label, prompt)
    - Categories: brand-content, beauty-self-care, selfie-styles, etc.
  - **Status:** Active - Used in upload module

---

## 6. Builder/Constructor Files

### 6.1 Prompt Constructors
- **`lib/maya/prompt-constructor.ts`**
  - **Purpose:** Classic Mode prompt constructor (250-500 word prompts)
  - **Usage:** Used in Classic Mode only (app/api/maya/generate-concepts/route.ts)
  - **Content:**
    - buildPrompt() - Main prompt builder
    - buildPromptWithFeatures() - Enhanced version
    - validatePromptLength() - Length validation
    - Uses brand-library-2025.ts for outfit generation
  - **Status:** Active in Classic Mode only - NOT used in Pro Mode

- **`lib/maya/prompt-constructor-enhanced.ts`**
  - **Purpose:** Enhanced prompt constructor with additional features
  - **Usage:** Alternative/legacy constructor implementation
  - **Content:** buildEnhancedPrompt() function, EnhancedPromptParams interface
  - **Status:** May be legacy - Check usage

- **`lib/maya/prompt-constructor-integration.ts`**
  - **Purpose:** Integration layer for prompt constructors
  - **Usage:** Provides category detection and validation functions
  - **Content:**
    - detectCategory() - Category detection
    - detectLocation() - Location extraction
    - generateBrandedPrompt() - Brand integration
    - validatePrompt() - Prompt validation
  - **Status:** Active - Used in Classic Mode

### 6.2 Specialized Builders
- **`lib/maya/quote-graphic-prompt-builder.ts`**
  - **Purpose:** Builds prompts for quote graphics (text overlays)
  - **Usage:** Used for quote graphic generation in Studio Pro
  - **Content:** buildSophisticatedQuotePrompt() function with vibe-based aesthetics
  - **Status:** Active - Used for quote graphics

- **`lib/maya/prompt-brand-enhancer.ts`**
  - **Purpose:** Enhances existing prompts with brand library details
  - **Usage:** Analyzes prompts and injects appropriate brand names
  - **Content:** enhancePromptWithBrands() function using brand-library-2025.ts
  - **Status:** Active - Used in Classic Mode

- **`lib/maya/prompt-builders/guide-prompt-handler.ts`**
  - **Purpose:** Handles guide prompts from users (exact prompts for concept #1)
  - **Usage:** Creates concept #1 from guide prompt, then generates consistent variations
  - **Content:**
    - GuidePromptElements, ReferenceImages interfaces
    - mergeGuidePromptWithImages() - Merges guide with image references
    - extractPromptElements() - Extracts outfit, lighting, location from guide
    - createVariationFromGuidePrompt() - Creates variations maintaining consistency
    - shouldIncludeSkinTexture() - Determines if skin texture should be added
  - **Status:** Active - Used in concept generation

- **`lib/maya/scene-composer-template.ts`**
  - **Purpose:** Scene composer system prompt for brand partnership content
  - **Usage:** Generates professional scene concepts combining base photos with products
  - **Content:** getSceneComposerSystemPrompt() function
  - **Status:** Active - Used for brand partnership scenes

---

## 7. Helper & Utility Files

### 7.1 User Context & Preferences
- **`lib/maya/get-user-context.ts`** (341+ lines)
  - **Purpose:** Gets comprehensive user context for Maya (brand profile, preferences, assets)
  - **Usage:** Called in concept generation and chat routes
  - **Content:**
    - getUserContextForMaya() function
    - Fetches: personal memory, brand profile, brand assets, gender, ethnicity
    - Builds context string with brand story, aesthetic, vision
  - **Status:** Active - Used throughout Maya system

- **`lib/maya/user-preferences.ts`**
  - **Purpose:** User preference tracking for motion/video generation
  - **Usage:** Tracks user interactions with videos to learn preferences
  - **Content:**
    - UserMotionPreferences interface
    - trackUserInteraction() - Tracks likes, views, shares
    - getUserMotionPreferences() - Retrieves learned preferences
  - **Status:** Active - Used for video/motion generation

- **`lib/maya/feed-planner-context.ts`**
  - **Purpose:** Feed planner context addon with mode instructions
  - **Usage:** Provides visual design guidance for feed creation
  - **Content:**
    - getFeedPlannerContextAddon() function
    - Mode instructions (Pro vs Classic) based on toggle
    - 5 signature aesthetics with color palettes
    - **CRITICAL:** NO auto-detect - only toggle decides mode
  - **Status:** Active - Used in feed planner workflow

### 7.2 Type Guards & Utilities
- **`lib/maya/type-guards.ts`**
  - **Purpose:** Type guard functions for Studio Pro Mode safety
  - **Usage:** Ensures Classic mode is never accidentally affected by Pro mode changes
  - **Content:**
    - isStudioProMode() - Validates mode is boolean
    - normalizeStudioProMode() - Converts undefined/null to false
    - guardClassicModeRoute() - Safety check for Classic routes
  - **Status:** Active - Used throughout API routes

- **`lib/maya/quality-settings.ts`**
  - **Purpose:** Quality settings for image generation (guidance scale, steps, etc.)
  - **Usage:** Default settings for Flux generation
  - **Content:** MAYA_DEFAULT_QUALITY_SETTINGS and presets (portrait, headshot, etc.)
  - **Status:** Active - Used in image generation

---

## 8. Validator Files

- **`lib/maya/nano-banana-validator.ts`** (54 lines)
  - **Purpose:** Validates Nano Banana Pro prompts for required elements
  - **Usage:** Used in concept generation to check prompt quality
  - **Content:**
    - validateNanoBananaPrompt() function
    - Checks: identity preservation phrase, lighting, aesthetic, length
    - Returns: PromptValidation interface with errors, warnings, wordCount
  - **Status:** Active - Used in app/api/maya/generate-concepts/route.ts

---

## 9. API Route Files

### 9.1 Main Chat & Generation Routes
- **`app/api/maya/chat/route.ts`** (1135+ lines)
  - **Purpose:** Main Maya chat API handling all chat interactions
  - **Usage:** Primary endpoint for Maya chat interface
  - **Features:**
    - Routes to different modes (Classic/Pro) based on headers
    - Contains PROMPT_BUILDER_SYSTEM for prompt builder mode
    - Handles concept generation triggers [GENERATE_CONCEPTS]
    - Processes UI messages and image references
  - **Status:** Active - Primary chat endpoint

- **`app/api/maya/generate-image/route.ts`** (385+ lines)
  - **Purpose:** Generates single images in Classic Mode
  - **Usage:** Called when user generates an image from a concept
  - **Features:** Uses Flux with LoRA, includes trigger word, validates credits
  - **Status:** Active - Classic Mode image generation

- **`app/api/maya/pro/generate-image/route.ts`**
  - **Purpose:** Pro Mode image generation using Nano Banana Pro
  - **Usage:** Called when user generates an image in Pro Mode
  - **Features:** Uses Nano Banana Pro with full 250-500 word prompts, reference images
  - **Status:** Active - Pro Mode image generation

### 9.2 Specialized Generation Routes
- **`app/api/maya/generate-motion-prompt/route.ts`** (252+ lines)
  - **Purpose:** Generates motion prompts for video (WAN-2.5 I2V)
  - **Usage:** Converts Flux prompts to motion prompts for video generation
  - **Features:** Analyzes image, generates motion description, validates format
  - **Status:** Active - Used for video generation

- **`app/api/maya/generate-video/route.ts`**
  - **Purpose:** Video generation endpoint
  - **Usage:** Creates videos from images with motion prompts
  - **Status:** Active - Video generation

- **`app/api/maya/create-photoshoot/route.ts`**
  - **Purpose:** Photoshoot creation with pose variations
  - **Usage:** Creates multiple images with same outfit/location, different poses
  - **Features:** generatePhotoshootPoseVariations() - Creates authentic lifestyle variations
  - **Status:** Active - Photoshoot carousel generation

- **`app/api/maya/generate-studio-pro/route.ts`**
  - **Purpose:** Studio Pro image generation (Nano Banana Pro only)
  - **Usage:** Direct Studio Pro generation endpoint
  - **Features:** Uses Nano Banana Pro, handles credits, saves to database
  - **Status:** Active - Studio Pro generation

- **`app/api/maya/generate-studio-pro-prompts/route.ts`**
  - **Purpose:** Studio Pro prompt generation endpoint
  - **Usage:** Generates prompts for Studio Pro mode
  - **Features:** Uses nanoBananaPromptBuilder, generates multiple prompts
  - **Status:** Active - Studio Pro prompt generation

- **`app/api/maya/generate-prompt-suggestions/route.ts`**
  - **Purpose:** Generates prompt suggestions based on workbench context
  - **Usage:** Analyzes workbench images and user intent to suggest prompts
  - **Features:** Uses PromptGenerator class, returns top 3 suggestions
  - **Status:** Active - Prompt suggestions

### 9.3 Pro Mode Routes
- **`app/api/maya/pro/chat/route.ts`**
  - **Purpose:** Pro Mode chat API endpoint
  - **Usage:** Handles chat interactions specifically for Pro Mode
  - **Features:** Uses MAYA_PRO_SYSTEM_PROMPT, checks credits, handles concept generation
  - **Status:** Active - Pro Mode chat

- **`app/api/maya/pro/generate-concepts/route.ts`**
  - **Purpose:** Pro Mode concept generation endpoint
  - **Usage:** Alternative Pro Mode concept generation
  - **Features:** Uses brand-library-2025.ts for brand variety, generates 150-400 word prompts
  - **Status:** Active - Pro Mode concepts (may be legacy)

- **`app/api/maya/pro/check-generation/route.ts`**
  - **Purpose:** Pro Mode generation status checking
  - **Usage:** Polls Nano Banana Pro prediction status
  - **Features:** Checks prediction completion, handles image saving
  - **Status:** Active - Generation status polling

- **`app/api/maya/pro/library/get/route.ts`**
  - **Purpose:** Pro Mode library retrieval
  - **Usage:** Gets user's image library (selfies, products, people, vibes, intent)
  - **Features:** Returns ImageLibrary structure from database
  - **Status:** Active - Library management

- **`app/api/maya/pro/library/update/route.ts`**
  - **Purpose:** Pro Mode library updates
  - **Usage:** Updates user's image library (add/remove images, update intent)
  - **Features:** UPSERT operations, validates library structure
  - **Status:** Active - Library management

- **`app/api/maya/pro/library/clear/route.ts`**
  - **Purpose:** Pro Mode library clearing
  - **Usage:** Clears all images and intent from user's library
  - **Features:** Resets library to empty state
  - **Status:** Active - Library management

---

## 10. Pro Mode Specific Files

### 10.1 Pro Mode Core
- **`lib/maya/pro/prompt-architecture.ts`**
  - **Purpose:** Pro Mode prompt architecture and brand mixing rules
  - **Usage:** Defines prompt structure and brand selection logic
  - **Content:**
    - PromptArchitecture interface
    - BRAND_POOLS - Brand pools by category
    - BRAND_MIXING_RULES - Rules for mixing brands
    - buildArchitecturedPrompt() - Builds prompts from architecture
  - **Status:** Active - Used in Pro Mode

- **`lib/maya/pro/category-system.ts`**
  - **Purpose:** Pro Mode category system and image library management
  - **Usage:** Category detection and library organization
  - **Content:**
    - ImageLibrary, CategoryInfo interfaces
    - detectCategory() - Detects category from text
    - getAllCategories() - Returns all available categories
    - getCategoryPrompts() - Gets prompts for category
  - **Status:** Active - Used in Pro Mode chat

- **`lib/maya/pro/chat-logic.ts`**
  - **Purpose:** Pro Mode chat logic and message handling
  - **Usage:** Processes Pro Mode messages and determines responses
  - **Content:**
    - ProModeMessage, ProModeResponse interfaces
    - handleProModeMessage() - Main handler
    - isConceptRequest() - Detects concept requests
    - isLibraryUpdate() - Detects library updates
    - buildMayaResponse() - Builds response messages
  - **Status:** Active - Used in Pro Mode chat

- **`lib/maya/pro/types.ts`**
  - **Purpose:** Pro Mode type definitions
  - **Usage:** TypeScript interfaces for Pro Mode
  - **Content:** ImageLibrary, ProModeConcept interfaces
  - **Status:** Active - Type definitions

### 10.2 Pro Mode Knowledge
- **`lib/maya/pro/camera-composition.ts`**
  - **Purpose:** Camera composition knowledge for Pro Mode
  - **Usage:** Provides framing, angles, positions, and composition rules
  - **Content:**
    - FramingType, CameraAngle, CameraPosition, CompositionRule types
    - FRAMING_TYPES, CAMERA_ANGLES, CAMERA_POSITIONS, COMPOSITION_RULES constants
    - buildCameraComposition() - Builds composition description
    - detectFramingPreference() - Detects user preferences
  - **Status:** Active - Used in Pro Mode

- **`lib/maya/pro/photography-styles.ts`**
  - **Purpose:** Photography styles for Pro Mode (authentic vs editorial)
  - **Usage:** Defines style characteristics and detection
  - **Content:**
    - PhotographyStyle type ('authentic' | 'editorial')
    - EDITORIAL_STYLE, AUTHENTIC_STYLE constants
    - detectPhotographyStyle() - Detects style from text
  - **Status:** Active - Used in Pro Mode

- **`lib/maya/pro/influencer-outfits.ts`**
  - **Purpose:** Influencer outfit formulas organized by category
  - **Usage:** Provides outfit templates for different content categories
  - **Content:**
    - OutfitFormula interface
    - LIFESTYLE_OUTFITS, FASHION_OUTFITS, BEAUTY_OUTFITS, etc.
    - selectOutfit() - Selects outfit for category
    - buildOutfitFromFormula() - Builds outfit description
  - **Status:** Active - Used in Pro Mode

- **`lib/maya/pro/seasonal-luxury-content.ts`**
  - **Purpose:** Seasonal luxury content (Christmas, holidays, etc.)
  - **Usage:** Provides seasonal settings, decor, outfits, poses
  - **Content:**
    - CHRISTMAS_INTERIORS, CHRISTMAS_DECOR, CHRISTMAS_OUTFITS constants
    - NEW_YEARS_CONTENT, SEASONAL_POSES, SEASONAL_PHOTOGRAPHY constants
    - detectSeasonalContent() - Detects seasonal requests
  - **Status:** Active - Used in Pro Mode

- **`lib/maya/pro/smart-setting-builder.ts`**
  - **Purpose:** Smart setting builder with detail levels based on framing
  - **Usage:** Builds setting descriptions with appropriate detail level
  - **Content:**
    - getSettingDetailLevel() - Determines detail level (minimal-bokeh, simple, medium, detailed, full)
    - buildBokehBackground(), buildSimpleSetting(), buildMediumSetting() functions
    - buildSmartSetting() - Main builder function
  - **Status:** Active - Used in Pro Mode

- **`lib/maya/pro/design-system.ts`**
  - **Purpose:** Pro Mode design system (typography, colors, spacing, etc.)
  - **Usage:** Design tokens for Pro Mode UI
  - **Content:**
    - Typography, Colors, Spacing, BorderRadius, Layout constants
    - UILabels, ButtonLabels constants
    - getTypographyClasses(), getColorClasses() helper functions
  - **Status:** Active - Used in Pro Mode UI

---

## 11. Feed Planner Files

- **`lib/maya/feed-generation-handler.ts`**
  - **Purpose:** Feed generation handler orchestrating complete feed workflow
  - **Usage:** Parses feed strategy, generates prompts, validates cohesion
  - **Content:**
    - parseFeedStrategy() - Parses Maya's feed strategy JSON
    - generateFeedPrompts() - Generates prompts using feed-prompt-expert
    - ensureFeedCohesion() - Validates visual flow
  - **Status:** Active - Used in feed planner

- **`lib/maya/feed-text-overlays.ts`**
  - **Purpose:** Feed text overlay templates for quote/motivational posts
  - **Usage:** Provides text placement configurations
  - **Content:** FEED_TEXT_OVERLAY_TEMPLATES, INSTAGRAM_FONTS constants
  - **Status:** Active - Used in feed planner

- **`lib/feed-planner/feed-prompt-expert.ts`**
  - **Purpose:** Feed prompt expert - validates and augments Maya's prompts
  - **Usage:** Ensures quality standards, provides fallback generation
  - **Content:**
    - generateFeedPrompt() - Main prompt generator
    - validateFeedPrompt() - Validates Maya's prompts
    - validateAndAugmentPrompt() - Adds missing elements
    - MAYA_SIGNATURE_PALETTES - 5 signature color palettes
  - **Status:** Active - Used in feed planner

---

## 12. Post-Processing Files

- **`lib/maya/post-processing/minimal-cleanup.ts`**
  - **Purpose:** Minimal prompt cleanup (syntax errors only)
  - **Usage:** Fixes double commas, extra spaces, formatting issues
  - **Content:**
    - fixSyntaxErrors() - Fixes syntax errors only
    - fixFormatting() - Fixes formatting issues
    - minimalCleanup() - Main cleanup function
    - **Philosophy:** Only fixes actual errors, preserves user intent
  - **Status:** Active - Used in prompt generation

---

## 13. Universal Prompts System

- **`lib/maya/universal-prompts/index.ts`**
  - **Purpose:** Universal prompts library (250-500 word high-quality prompts)
  - **Usage:** Fallback/reference prompts organized by category
  - **Content:**
    - UniversalPrompt interface
    - findMatchingPrompt() - Finds prompt by ID
    - getRandomPrompts() - Gets random prompts
    - getPromptsForCategory() - Gets prompts for category
    - TRAVEL_UNIVERSAL_PROMPTS, etc.
  - **Status:** Active - Used as reference/fallback

- **`lib/maya/prompt-components/index.ts`**
  - **Purpose:** Prompt components system main export
  - **Usage:** Central export for component system
  - **Content:** Re-exports types, extractor, raw data, category components
  - **Status:** Active - Component system index

- **`lib/maya/prompt-components/types.ts`**
  - **Purpose:** Component type definitions
  - **Usage:** TypeScript interfaces for prompt components
  - **Content:**
    - ComponentType - pose, outfit, location, lighting, etc.
    - PromptComponent interface
    - Component metadata (poseType, framing, etc.)
  - **Status:** Active - Type definitions

- **`lib/maya/prompt-components/component-extractor.ts`**
  - **Purpose:** Component extraction logic from Universal Prompts
  - **Usage:** Parses Universal Prompts and extracts structured components
  - **Content:**
    - ExtractedComponents interface
    - ComponentExtractor class
    - Extracts: pose, outfit, location, lighting, camera, etc.
  - **Status:** Active - Component extraction

- **`lib/maya/prompt-components/universal-prompts-raw.ts`**
  - **Purpose:** Raw universal prompts data
  - **Usage:** Source data for Universal Prompts system
  - **Content:** UNIVERSAL_PROMPTS_RAW record organized by category
  - **Status:** Active - Raw data source

- **`lib/maya/prompt-components/categories/alo-workout.ts`**
  - **Purpose:** Alo workout category components (extracted from ALO Collection)
  - **Usage:** Provides ALO-specific poses and components
  - **Content:** ALO_POSES array with pose components
  - **Status:** Active - Category-specific components

---

## 14. Motion & Video Files

- **`lib/maya/motion-similarity.ts`**
  - **Purpose:** Motion similarity detection for video prompts
  - **Usage:** Detects semantically similar motion prompts to avoid repetition
  - **Content:**
    - extractMotionConcepts() - Extracts motion concepts from prompt
    - calculateConceptSimilarity() - Calculates similarity score
    - Uses body parts, actions, camera movement, intensity, triggers
  - **Status:** Active - Used in video generation

- **`lib/maya/motion-libraries.ts`**
  - **Purpose:** Motion template libraries organized by category
  - **Usage:** Provides context-aware motion suggestions
  - **Content:**
    - MOTION_LIBRARIES constant
    - MotionTemplate interface
    - Categories: lifestyle, fashion, beauty, wellness, etc.
  - **Status:** Active - Used in video generation

- **`lib/maya/photoshoot-session.ts`**
  - **Purpose:** Photoshoot session builder (DEPRECATED)
  - **Usage:** Legacy template system for photoshoots
  - **Content:**
    - PhotoshootSessionBuilder class
    - generatePhotoshootSession() - Creates hardcoded templates
    - **Note:** Being phased out in favor of intelligent prompt generation
  - **Status:** Deprecated - Kept for backward compatibility

---

## 15. Other Supporting Files

- **`lib/maya/brand-aesthetics.ts`**
  - **Purpose:** Brand aesthetic definitions (reference material only)
  - **Usage:** Simple aesthetic descriptions for understanding brand vibes
  - **Content:** BRAND_AESTHETICS record with vibe, style, colors, setting
  - **Status:** Reference only - Not currently imported in system prompts

---

## 🔍 Key Findings

### Files That Affect Pro Mode Prompting
1. **`lib/maya/nano-banana-examples.ts`** - Perfect examples (ACTIVE)
2. **`lib/maya/nano-banana-prompt-builder.ts`** - Principles & helpers (ACTIVE)
3. **`lib/maya/nano-banana-validator.ts`** - Validation (ACTIVE)
4. **`app/api/maya/generate-concepts/route.ts`** - Main generation (ACTIVE)
5. **`app/api/maya/generate-feed-prompt/route.ts`** - Feed prompts (ACTIVE)

### Files That DO NOT Affect Pro Mode (Classic Mode Only)
1. **`lib/maya/fashion-knowledge-2025.ts`** - Skipped in Pro Mode (line 904-906)
2. **`lib/maya/brand-library-2025.ts`** - Not used in direct generation
3. **`lib/maya/prompt-constructor.ts`** - Classic Mode only
4. **`lib/maya/flux-prompting-principles.ts`** - Classic Mode only

### Files That Contain Brand Lists (Potential Issues)
1. **`lib/maya/fashion-knowledge-2025.ts`** - Lines 450-495 (BRAND DATABASE section)
2. **`lib/maya/brand-library-2025.ts`** - Entire file (not used in Pro Mode)
3. **`lib/maya/prompt-templates/high-end-brands/*.ts`** - Brand-specific templates

---

## 📊 File Count Summary

- **Total lib/maya files:** ~80 TypeScript files
- **Total app/api/maya files:** ~35 API route files
- **Core prompt generation:** ~15 files
- **Knowledge base files:** ~12 files
- **Template files:** ~20 files
- **Pro Mode specific:** ~10 files

---

## ✅ Next Steps for Analysis

1. Review each file's purpose and current usage
2. Identify files with hardcoded brand names
3. Check for any remaining extraction/rebuilding logic
4. Verify which files are actually used in Pro Mode
5. Document dependencies between files


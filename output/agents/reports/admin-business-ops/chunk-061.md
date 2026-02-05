Agent Report  
Agent: admin-business-ops  
Specialty: Admin tooling, operational risks, business controls.  
Chunk ID: chunk-061  
Group: app  
Date: 2024-06-17  

Summary:  
- APIs cover user profile management, prompt guides, quota control, referrals, scene composition, Stripe billing, studio activity, training workflows, testimonials, and testing endpoints.  
- Strong authentication checks via Supabase auth in nearly all routes ensure operational security.  
- Critical operations like credit deductions and subscription upgrades have precise logic with fallback and error handling to mitigate risks of improper billing.  
- Training-related APIs show detailed progressive status tracking, adaptive parameter handling, and cache syncing with Replicate model states.  
- Stripe integration has endpoints for cleaning up products, testing, and verifying configuration to maintain billing system integrity.  

Top Findings:  
- Authentication & User Context: Most routes validate user identity via Supabase and map to Neon database user IDs ([app/api/profile/recent-work/route.ts], [app/api/studio/generate/route.ts], [app/api/training/start/route.ts]).  
- Prompt Guide Subscription: Supports multi-system contact sync (Resend, Flodesk) with access token cookie set for subscriber management ([app/api/prompt-guide/subscribe/route.ts]) ensuring marketing controls.  
- Quota Management: Decrement and status endpoints enforce usage counting and support unlimited plans; disabled by default via environment guard ([app/api/quota/decrement/route.ts], [app/api/quota/status/route.ts]).  
- Referral Management: Generates unique referral codes, tracks referrals preventing self-referral, and conditionally awards credits upon signup ([app/api/referrals/generate-code/route.ts], [app/api/referrals/track/route.ts]).  
- Scene Composer Flow: Multi-step process including create scene, generate scene AI output, upload product images, and check generation status with uploads to blob for permanence and saving gallery copies ([app/api/scene-composer/create-scene/route.ts], [app/api/scene-composer/check-status/route.ts], [app/api/scene-composer/upload-product/route.ts]).  
- Stripe Utilities: Includes product cleanup, checkout session creation, subscription portal integration, and environment verification endpoints with rate limiting and fallback logic ([app/api/stripe/cleanup-products/route.ts], [app/api/stripe/create-checkout-session/route.ts], [app/api/stripe/create-portal-session/route.ts], [app/api/stripe/verify-setup/route.ts]).  
- Training Process: Complex routes manage uploading images and zips, starting training with Replicate, tracking progress via logs and metrics, canceling training, deleting images, and syncing versions; extensive logging and fallback used ([app/api/training/start/route.ts], [app/api/training/progress/route.ts], [app/api/training/cancel/route.ts], [app/api/training/sync-version/route.ts]).  
- Error Capturing & Monitoring: Multiple test routes send errors to Sentry for health monitoring; includes flushing to guarantee event delivery ([app/api/sentry-direct-test/route.ts], [app/api/sentry-test/route.ts], [app/api/test-sentry-simple/route.ts]).  

Risks:  
- Billing Edge Cases: Credit deduction occurs before generation start to prevent free usage, but logging failures could cause inconsistent states if deduction or refunds fail ([app/api/studio/generate/route.ts], [app/api/training/start/route.ts]).  
- Referral Abuse: Despite self-referral prevention, there's no evidence of throttling or monitoring repeated referrals that may indicate manipulation ([app/api/referrals/track/route.ts]).  
- Data Consistency: Training progress reconciliation attempts to sync model state with Replicate but depends on consistent API responses; temporary API failures could cause stale client views ([app/api/training/progress/route.ts]).  
- Upload Errors Handling: Some routes detect request body consumption errors but could result in confusing client experience if multiple middlewares consume the same request ([app/api/training/upload-zip/route.ts], [app/api/training/upload/route.ts]).  
- Disabled Endpoints Risk: Some critical endpoints are disabled by default via environment variables (ENABLE_UNUSED_ENDPOINTS), could complicate operational readiness if forgotten or misconfigured ([app/api/quota/decrement/route.ts], [app/api/stripe/cleanup-products/route.ts]).  

Opportunities:  
- Centralize Settings Storage: Currently, user settings are partially stored across maya_profile and user_profiles tables which can be unified or better synchronized ([app/api/settings/route.ts], [app/api/settings/update/route.ts]).  
- Enhanced Referral Analytics: Track more referral lifecycle events to gain insight on conversion and campaign effectiveness beyond base stats ([app/api/referrals/stats/route.ts]).  
- Add Rate-Limiting on Referral Code Generation and Referral Tracking to reduce fraud risk.  
- Improve Error Handling UX: Return consistent error codes and messages for body consumption issues to better inform clients on retries or fixes ([app/api/training/upload-zip/route.ts]).  
- Automate Stripe Product Cleanup periodic tasks maintaining product catalog hygiene without manual triggers ([app/api/stripe/cleanup-products/route.ts]).  

Recommended Actions:  
- Implement monitoring on credit deduction and refund failures for financial reconciliation. Effort: Medium, Impact: High.  
- Add rate limits and anomaly detection on referrals to mitigate abuse. Effort: Medium, Impact: Medium.  
- Document and automate enabling/disabling of sensitive endpoints guarded by environment flags. Effort: Low, Impact: Medium.  
- Consolidate user preference storage in database and expose unified API for admin tools. Effort: Medium, Impact: Medium.  
- Enhance training upload error messages and client retry strategies based on detected errors to improve user experience. Effort: Medium, Impact: Medium.  

Evidence vs Inference

## FILES_REVIEWED
```json
[
  "app/api/profile/recent-work/route.ts",
  "app/api/profile/stats/route.ts",
  "app/api/profile/update/route.ts",
  "app/api/prompt-guide/set-access-cookie/route.ts",
  "app/api/prompt-guide/subscribe/route.ts",
  "app/api/prompt-guides/items/route.ts",
  "app/api/prompt-guides/list/route.ts",
  "app/api/quota/decrement/route.ts",
  "app/api/quota/status/route.ts",
  "app/api/referrals/generate-code/route.ts",
  "app/api/referrals/stats/route.ts",
  "app/api/referrals/track/route.ts",
  "app/api/scene-composer/check-status/route.ts",
  "app/api/scene-composer/create-scene/route.ts",
  "app/api/scene-composer/generate/route.ts",
  "app/api/scene-composer/upload-product/route.ts",
  "app/api/sentry-direct-test/route.ts",
  "app/api/sentry-status/route.ts",
  "app/api/sentry-test/route.ts",
  "app/api/settings/route.ts",
  "app/api/settings/update/route.ts",
  "app/api/stripe/cleanup-products/route.ts",
  "app/api/stripe/create-checkout-session/route.ts",
  "app/api/stripe/create-portal-session/route.ts",
  "app/api/stripe/create-test-coupon/route.ts",
  "app/api/stripe/list-products/route.ts",
  "app/api/stripe/test-checkout/route.ts",
  "app/api/stripe/verify-setup/route.ts",
  "app/api/studio/activity/route.ts",
  "app/api/studio/favorites/route.ts",
  "app/api/studio/generate/route.ts",
  "app/api/studio/generation/[id]/route.ts",
  "app/api/studio/generations/route.ts",
  "app/api/studio/session/route.ts",
  "app/api/studio/sessions/route.ts",
  "app/api/studio/stats/route.ts",
  "app/api/subscription/upgrade-analytics/route.ts",
  "app/api/subscription/upgrade-opportunities/route.ts",
  "app/api/subscription/upgrade/route.ts",
  "app/api/test-purchase-email/route.ts",
  "app/api/test-sentry-simple/route.ts",
  "app/api/test/resend/route.ts",
  "app/api/testimonials/published/route.ts",
  "app/api/testimonials/submit/route.ts",
  "app/api/testing/stripe-mock/route.ts",
  "app/api/training/cancel/route.ts",
  "app/api/training/create-zip-from-blobs/route.ts",
  "app/api/training/delete/route.ts",
  "app/api/training/progress/route.ts",
  "app/api/training/save-uploads/route.ts",
  "app/api/training/start-training/route.ts",
  "app/api/training/start/route.ts",
  "app/api/training/status/route.ts",
  "app/api/training/sync-version/route.ts",
  "app/api/training/upload-images/route.ts",
  "app/api/training/upload-token/route.ts",
  "app/api/training/upload-zip/route.ts",
  "app/api/training/upload/route.ts",
  "app/api/upload-highlight-overlay/route.ts",
  "app/api/upload-image/route.ts"
]
```

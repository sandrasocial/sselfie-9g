Agent Report  
Agent: admin-business-ops  
Specialty: Admin tooling, operational risks, business controls.  
Chunk ID: chunk-074  
Group: components  
Date: 2024-06-05  

Summary:  
- This chunk contains core frontend components focused on user onboarding, account management, referrals, content blueprint landing, and prompt-guide interactions.  
- The unified onboarding wizard handles multi-step brand and style setup with data persistence using SWR and server APIs, streamlining the user experience.  
- Account management includes detailed profile editing, subscription management, brand assets, privacy settings, and model training preferences supporting admin overrides.  
- Referral and social sharing features provide users incentives and streamlined sharing with clipboard fallback and native sharing integration.  
- The paid blueprint landing page is designed for conversion funnel with email capture modal and smooth UX transitions.  

Top Findings:  
- **Unified Onboarding Wizard** (`components/onboarding/unified-onboarding-wizard.tsx`): Multi-step modal that collects detailed brand and style info; uses SWR for data fetching and caching; saves progress via API call to `/api/onboarding/unified-onboarding-complete`. It supports partial saves, form data pre-fill from `existingData`, and selfie uploads using `BlueprintSelfieUpload` with max 3 images. Variation selection for feed style is managed with server-provided variations and user explicit selection prevents auto reset.  
- **Account Screen** (`components/sselfie/account-screen.tsx`): Comprehensive profile and settings management with asynchronous loading and update of user info, profile image selection (`ProfileImageSelector` used here), best work photos with drag-and-drop ordering, subscription management via Stripe portal, notification toggles, privacy settings for model training data, and admin access button routed to `/admin`. Includes upgrade modal targeting users without Studio membership.  
- **Referral Dashboard and Invite Friend CTA** (`components/referrals/referral-dashboard.tsx` and `invite-friends-cta.tsx`): Users can view and copy referral links and codes, share via native system share or clipboard fallback, and generate codes if missing. Dashboard refreshes stats every 30 seconds to show pending/completed referrals and earned credits. InviteFriendsCTA switches views between CTA and dashboard inline.  
- **Social Share Button** (`components/referrals/social-share-button.tsx`): Integrates referral link sharing with caption template, supports image file sharing for richer content, falls back to clipboard copy on failure or unsupported browsers. Auto generates referral code if missing before sharing.  
- **Prompt Guides** components (`prompt-email-capture.tsx` and `prompt-guide-page-client.tsx`): Includes email capture modal with analytics tracking on open and signup, server subscription calls to `/api/prompt-guide/subscribe`. Guide page lists prompt concepts with copy-to-clipboard functionality, locked behind email capture for access control. Upsell CTA for Studio is tracked and open externally.  
- **Paid Blueprint Landing Page** (`components/paid-blueprint/paid-blueprint-landing.tsx`): Marketing landing page with smooth scroll to info, uses `BlueprintEmailCapture` modal for user email capture and routing to checkout. Descriptions stress seamless generation and delivery of 30 custom photos. Includes FAQ, visual proof using grid examples, pricing card with one-time purchase, and footer with links.  
- **Access Control Module** (`components/sselfie/access.ts`): Simple function determining user access state based on subscription status, product type, with admin email override granting full access and suppression of upgrade UI. Distinguishes between paid blueprint only users and full members.  
- **Reset Passwords Button** (`components/reset-passwords-button.tsx`): Provides admin tool to reset all user passwords via an action, displays statuses and messages with loading spinner feedback.  

Risks:  
- Potential data loss if API calls during onboarding save fail; only client alert and console error with no automated retry or offline support noted.  
- Profile image uploads accept any image from device but no validation or size enforcement detailed, could lead to large uploads or inappropriate content risk.  
- Referral and social sharing assume navigator.clipboard and navigator.share capabilities may silently fail without user notification if permissions or platform denied.  
- Admin override in access control hardcodes a specific admin email; risks if email compromised or shared.  
- Sensitive user demographic data (gender, ethnicity, physical preferences) updated and stored without explicit mention of data privacy compliance or user consent flows.  

Opportunities:  
- Enhance onboarding completion reliability by adding autosave with retry or offline queuing to improve UX.  
- Extend profile image handling with validation, compression, and content filtering to mitigate risk and improve loading.  
- Add usage analytics and fallback notices for referral sharing if clipboard or native share unsupported or fails.  
- Expand referral dashboard with more granular analytics and fraud detection for referrals.  
- Introduce user consent and audit logs for sensitive personal data updates (demographics, training data) for compliance.  
- Consider multi-admin roles rather than single admin email override for safer admin access control.  
- Improve UI accessibility and keyboard navigation in modals and interactive components for compliance and inclusivity.  

Recommended Actions:  
- **Implement retry mechanisms for onboarding data saves and show persistent save status to users.** (Effort: Medium, Impact: High)  
- **Add client-side validation and server sanitization of profile image uploads including max file size limits.** (Effort: Medium, Impact: Medium)  
- **Add error and permission state handling for clipboard and share APIs, with user notifications on failure.** (Effort: Low, Impact: Medium)  
- **Replace hardcoded admin email in access control with role-based permissions and secure admin authentication.** (Effort: Medium, Impact: High)  
- **Incorporate explicit user consent screens and logs for demographic and privacy-related data changes.** (Effort: Medium

## FILES_REVIEWED
```json
[
  "components/onboarding/unified-onboarding-wizard.tsx",
  "components/paid-blueprint/paid-blueprint-landing.tsx",
  "components/profile-image-selector.tsx",
  "components/prompt-guides/prompt-email-capture.tsx",
  "components/prompt-guides/prompt-guide-page-client.tsx",
  "components/referrals/invite-friends-cta.tsx",
  "components/referrals/referral-dashboard.tsx",
  "components/referrals/social-share-button.tsx",
  "components/reset-passwords-button.tsx",
  "components/sselfie/academy-screen.tsx",
  "components/sselfie/access.ts",
  "components/sselfie/account-screen.tsx"
]
```

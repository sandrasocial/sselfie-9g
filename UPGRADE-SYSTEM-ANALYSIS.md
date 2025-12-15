# Upgrade System Analysis & Recommendations

## Implementation Snapshot (current work)
- Added detection service `lib/upgrade-detection.ts`
- Added upgrade API `app/api/subscription/upgrade/route.ts`
- Added upgrade analytics `app/api/subscription/upgrade-analytics/route.ts`
- Added opportunity API `app/api/subscription/upgrade-opportunities/route.ts`
- Added UI pieces: `components/upgrade/*`, settings upgrade section, smart banner in `sselfie-app`

## Current State Analysis

### How Users Currently Upgrade

1. **Stripe Customer Portal (Settings Screen)**
   - Users with active subscriptions can click "Manage Subscription" 
   - Redirects to Stripe's hosted portal
   - Allows cancellation, payment method updates, but unclear if it supports upgrades
   - Location: `components/sselfie/settings-screen.tsx` (line 468-475)

2. **Zero Credits Modal**
   - Shows when credits reach exactly 0
   - Offers: "Upgrade to Studio Membership" or "Buy One-Time Session"
   - Location: `components/credits/zero-credits-upgrade-modal.tsx`

3. **Low Credit Warning**
   - Shows when credits < 30
   - Only offers credit top-ups, not upgrades
   - Location: `components/credits/low-credit-modal.tsx`

4. **Academy Screen Upgrade**
   - Shows upgrade button for non-members
   - Only for accessing Academy content
   - Location: `components/sselfie/academy-screen.tsx` (line 114-127)

5. **UpgradeOrCredits Component**
   - Generic component for out-of-credits scenarios
   - Location: `components/UpgradeOrCredits.tsx`

### Current Pricing Tiers

Based on `lib/pricing.config.ts` and `lib/products.ts`:

1. **One-Time Session** - $49 (50 credits)
2. **Studio Membership** - $99/month (250 credits/month) - Popular tier
3. **Brand Studio** - $149/month (300 credits/month) - Exists in code but may not be fully active

### Key Issues Identified

#### 1. **No In-App Upgrade Flow for Existing Subscribers**
   - Users with `sselfie_studio_membership` cannot upgrade to `brand_studio_membership` in-app
   - Must use Stripe portal (unclear if it supports upgrades)
   - No upgrade path visualization

#### 2. **No Smart Upgrade Detection**
   - No detection of high credit usage patterns
   - No detection of feature limitations
   - No detection of upgrade opportunities based on behavior
   - Upgrade prompts only appear when credits are depleted

#### 3. **Limited Upgrade Visibility**
   - No upgrade cards in Studio screen
   - No upgrade cards in Gallery
   - No upgrade cards in Maya chat
   - No upgrade section in Settings
   - Upgrade options only appear reactively (when credits run out)

#### 4. **No Tier Comparison**
   - Users can't see what they're missing
   - No feature comparison between tiers
   - No "Upgrade to unlock X" messaging

#### 5. **Checkout Flow Doesn't Handle Upgrades**
   - `startProductCheckoutSession` in `app/actions/stripe.ts` creates new checkout sessions
   - Doesn't check if user already has subscription
   - Could create duplicate subscriptions instead of upgrading

## Recommendations

### 1. Smart Upgrade Detection System

Create a centralized upgrade detection service that tracks:

```typescript
// lib/upgrade-detection.ts
interface UpgradeOpportunity {
  type: 'high_usage' | 'feature_limit' | 'credit_depletion' | 'time_based'
  priority: 'high' | 'medium' | 'low'
  message: string
  suggestedTier: string
  showUpgradePrompt: boolean
}

// Detection triggers:
- High credit usage (using >80% of monthly credits consistently)
- Frequent credit top-ups (3+ top-ups in 30 days)
- Feature access attempts (trying to use Brand Studio features)
- Time-based (after 2-3 months of consistent usage)
- Credit depletion patterns (running out multiple times)
```

### 2. Upgrade Flow for Existing Subscribers

**Option A: Stripe Subscription Modification (Recommended)**
- Use Stripe's subscription modification API
- Prorate the upgrade cost
- Update subscription immediately or at period end

**Option B: In-App Upgrade Checkout**
- Detect existing subscription
- Show upgrade comparison
- Create checkout that modifies existing subscription
- Handle proration automatically

### 3. Strategic Upgrade Card Placement

#### A. Settings Screen - "Upgrade Your Plan" Section
- Show current tier with upgrade options
- Feature comparison table
- "Upgrade to Brand Studio" CTA
- Location: After subscription management section

#### B. Studio Screen - Contextual Upgrade Card
- Show when user is approaching credit limits
- "Running low? Upgrade for more credits"
- Non-intrusive banner or card

#### C. Gallery Screen - Feature-Based Upgrade
- Show upgrade prompt when accessing premium features
- "Unlock Brand Studio features" messaging

#### D. Maya Chat - Smart Upgrade Suggestions
- Detect when user requests Brand Studio features
- Show contextual upgrade prompt
- "This feature requires Brand Studio membership"

#### E. Credits Display - Upgrade Integration
- Add "Upgrade" button next to credit balance
- Show upgrade options when clicking credits

### 4. Upgrade Detection Logic

```typescript
// When to show upgrade prompts:

1. **High Usage Pattern** (High Priority)
   - User uses >80% of monthly credits for 2+ months
   - Show: "You're a power user! Upgrade to Brand Studio for 300 credits/month"

2. **Frequent Top-Ups** (High Priority)
   - User buys credits 3+ times in 30 days
   - Show: "Save money with Brand Studio - includes 300 credits/month"

3. **Feature Limitation** (Medium Priority)
   - User tries to access Brand Studio feature
   - Show: "Upgrade to Brand Studio to unlock this feature"

4. **Credit Depletion** (Medium Priority)
   - User runs out of credits 2+ times
   - Show: "Never run out - upgrade to Brand Studio"

5. **Time-Based** (Low Priority)
   - User has been on Studio Membership for 3+ months
   - Show: "Ready for more? Upgrade to Brand Studio"

6. **Credit Balance Threshold** (Low Priority)
   - User consistently maintains <50 credits
   - Show: "Get more credits with Brand Studio"
```

### 5. Upgrade UI Components

#### A. Upgrade Comparison Card
```typescript
// components/upgrade/upgrade-comparison-card.tsx
- Current tier highlighted
- Feature comparison table
- Upgrade CTA button
- "What you get" section
```

#### B. Smart Upgrade Banner
```typescript
// components/upgrade/smart-upgrade-banner.tsx
- Contextual messaging based on detection
- Dismissible (with cooldown)
- Non-intrusive design
- Appears in Studio/Gallery/Maya screens
```

#### C. Upgrade Modal
```typescript
// components/upgrade/upgrade-modal.tsx
- Full tier comparison
- Upgrade flow
- Proration explanation
- Success confirmation
```

### 6. Implementation Priority

#### Phase 1: Foundation (Week 1)
1. ✅ Create upgrade detection service
2. ✅ Add upgrade API endpoint for existing subscribers
3. ✅ Create upgrade comparison component
4. ✅ Add upgrade section to Settings screen

#### Phase 2: Smart Detection (Week 2)
1. ✅ Implement usage pattern tracking
2. ✅ Add upgrade detection logic
3. ✅ Create smart upgrade banners
4. ✅ Add upgrade prompts to Studio screen

#### Phase 3: Enhanced Experience (Week 3)
1. ✅ Add upgrade cards to Gallery
2. ✅ Add contextual upgrades to Maya
3. ✅ Implement upgrade analytics
4. ✅ A/B test upgrade messaging

### 7. Technical Implementation

#### A. Upgrade API Endpoint
```typescript
// app/api/subscription/upgrade/route.ts
- Check existing subscription
- Validate upgrade path (one-time → studio → brand)
- Create Stripe subscription modification
- Handle proration
- Update database
- Grant additional credits immediately
```

#### B. Upgrade Detection Service
```typescript
// lib/upgrade-detection.ts
- Track credit usage patterns
- Analyze purchase history
- Detect feature access attempts
- Calculate upgrade opportunity score
- Return upgrade recommendations
```

#### C. Database Tracking
```sql
-- Add upgrade tracking table
CREATE TABLE upgrade_opportunities (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  opportunity_type TEXT,
  detected_at TIMESTAMP,
  shown_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  converted_at TIMESTAMP
);
```

### 8. Upgrade Messaging Strategy

#### For One-Time Users → Studio Membership
- "Get unlimited photos every month"
- "Never run out of credits"
- "Join 10,000+ creators"

#### For Studio Members → Brand Studio
- "Get 50% more credits (300/month)"
- "Unlock premium features"
- "Perfect for power users"

### 9. Analytics & Tracking

Track:
- Upgrade opportunity detections
- Upgrade prompt impressions
- Upgrade prompt dismissals
- Upgrade conversions
- Time to upgrade after detection
- Most effective upgrade triggers

### 10. User Experience Considerations

- **Non-Intrusive**: Don't show upgrade prompts too frequently
- **Contextual**: Show upgrades when relevant
- **Clear Value**: Always explain what they get
- **Easy Dismissal**: Allow users to dismiss (with cooldown)
- **Respectful**: Don't pressure users who can't afford upgrades

## Next Steps

1. **Review this analysis** with team
2. **Prioritize features** based on business goals
3. **Design upgrade UI components** following SSELFIE design system
4. **Implement Phase 1** (Foundation)
5. **Test upgrade flow** thoroughly
6. **Monitor upgrade conversion rates**
7. **Iterate based on data**

## Questions to Consider

1. Should upgrades be immediate or at period end?
2. How should proration be handled?
3. Should there be upgrade incentives (discounts, bonuses)?
4. What's the upgrade conversion goal?
5. Should we show upgrade prompts to all users or only power users?
6. How often should upgrade prompts appear?
7. Should we track upgrade intent (clicks, views) separately?

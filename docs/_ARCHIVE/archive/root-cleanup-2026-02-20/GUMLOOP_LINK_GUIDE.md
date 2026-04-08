# 🔗 GUMLOOP EMAIL LINK GUIDE

Quick reference for which links to use in your AI-generated newsletters.

---

## 📋 AVAILABLE LINK PLACEHOLDERS

Copy/paste these into your Gumloop Content Writer agent prompt:

```
LINK PLACEHOLDERS:
Use these exact placeholder tags (I'll replace them with tracked links):

1. Blueprint Landing Page:
   [link_blueprint]Get Your Free Blueprint[/link_blueprint]
   → Goes to: /blueprint (educational, awareness)

2. Blueprint Checkout:
   [link_blueprintCheckout]Buy Blueprint Now[/link_blueprintCheckout]
   → Goes to: /checkout/blueprint (direct purchase)

3. Studio Features/Landing:
   [link_studio]Explore Studio[/link_studio]
   → Goes to: /studio (learn about membership)

4. Studio Why Page:
   [link_whyStudio]Why Join Studio?[/link_whyStudio]
   → Goes to: /why-studio (overcome objections)

5. Membership Checkout:
   [link_membership]Join Membership[/link_membership]
   → Goes to: /checkout/membership (direct purchase)

6. Dashboard (logged-in users):
   [link_dashboard]Go to Your Dashboard[/link_dashboard]
   → Goes to: /studio (app access)

7. Instagram:
   [link_instagram]Follow on Instagram[/link_instagram]
   → Goes to: Instagram profile

8. Email Preferences:
   [link_preferences]Update Preferences[/link_preferences]
   → Goes to: /email-preferences

9. Unsubscribe:
   [link_unsubscribe]Unsubscribe[/link_unsubscribe]
   → Goes to: /unsubscribe
```

---

## 🎯 WHEN TO USE EACH LINK

### **Weekly Newsletter (Educational Content)**

**Goal:** Build trust, share value, nurture relationship

**Best Links:**
- ✅ `[link_blueprint]` - Soft CTA to free tool
- ✅ `[link_studio]` - "Learn more about Studio"
- ✅ `[link_instagram]` - "Follow for daily tips"

**Example:**
> "I just analyzed 500 Instagram profiles. Here's what the top performers do differently..."
>
> "Want your personalized strategy? [link_blueprint]Get your free blueprint[/link_blueprint]"

---

### **Promotional Email (Limited Offer)**

**Goal:** Drive immediate sales

**Best Links:**
- ✅ `[link_membership]` - Direct to checkout
- ✅ `[link_blueprintCheckout]` - If selling paid blueprint

**Example:**
> "Flash Sale: 50% off Studio Membership (ends tonight!)"
>
> "[link_membership]Claim Your 50% Discount[/link_membership]"

---

### **Feature Announcement**

**Goal:** Showcase what's new, get people excited

**Best Links:**
- ✅ `[link_studio]` - For non-members: "See what you're missing"
- ✅ `[link_dashboard]` - For members: "Try it now"

**Example:**
> "We just launched AI-powered caption writing!"
>
> "Members: [link_dashboard]Try it in your dashboard[/link_dashboard]"
>
> "Not a member yet? [link_studio]See what Studio can do[/link_studio]"

---

### **Re-engagement / Win-Back**

**Goal:** Bring back inactive subscribers

**Best Links:**
- ✅ `[link_blueprint]` - Low-pressure re-entry
- ✅ `[link_membership]` - With discount code

**Example:**
> "We miss you! Here's 40% off to come back."
>
> "[link_membership]Claim Your Comeback Offer[/link_membership]"
>
> "Not ready? Start with our [link_blueprint]free blueprint tool[/link_blueprint]"

---

## 🚦 DECISION FLOWCHART

```
Is the reader ready to buy?
│
├─ YES → Use checkout links
│   ├─ Selling membership? → [link_membership]
│   └─ Selling blueprint? → [link_blueprintCheckout]
│
└─ NO → Use landing/educational links
    ├─ Introducing blueprint? → [link_blueprint]
    ├─ Explaining membership? → [link_studio]
    ├─ Overcoming objections? → [link_whyStudio]
    └─ Social proof/community? → [link_instagram]
```

---

## ✅ LINK CHECKLIST

Every newsletter should have:

- [ ] **Main CTA** - One primary action (blueprint, membership, or studio)
- [ ] **Social link** - Instagram follow (builds community)
- [ ] **Preferences** - [link_preferences] in footer
- [ ] **Unsubscribe** - [link_unsubscribe] in footer (required by law!)

---

## 💡 PRO TIPS

### **1. One Primary CTA**
Don't overwhelm with choices. Pick ONE main action:
- Educational newsletter? → `[link_blueprint]`
- Promotional email? → `[link_membership]`
- Feature update? → `[link_dashboard]` or `[link_studio]`

### **2. Soft → Hard**
Use the "nurture ladder":
1. Week 1: Educational content + `[link_instagram]`
2. Week 2: Value content + `[link_blueprint]`
3. Week 3: Case study + `[link_studio]`
4. Week 4: Offer + `[link_membership]`

### **3. Context Matters**
Match link to content:
- Teaching Instagram tips? → `[link_instagram]`
- Talking about brand strategy? → `[link_blueprint]`
- Showcasing member results? → `[link_membership]`

### **4. Test & Track**
All links automatically get UTM tracking. Monitor which links get the most clicks in your analytics.

---

## 🎨 EXAMPLE NEWSLETTER STRUCTURE

```
Subject: The Instagram algorithm changed again (here's what to do)

Hey [NAME],

Instagram just rolled out a major update that's affecting reach.

I tested 50 different post types this week. Here's what's working now:

[MAIN CONTENT - 2-3 paragraphs with insights]

The biggest change? Video posts are getting 3x more reach than images.

Want me to analyze YOUR account and tell you exactly what to post?

[link_blueprint]Get your free personalized content strategy[/link_blueprint]

It takes 5 minutes and shows you:
• What content types work for your audience
• Your optimal posting schedule
• 30 days of caption ideas

Talk soon,
Sandra

P.S. [link_instagram]Follow me on Instagram[/link_instagram] for daily strategy tips

---
[link_preferences]Update your email preferences[/link_preferences] | [link_unsubscribe]Unsubscribe[/link_unsubscribe]
```

---

## ⚙️ GUMLOOP AGENT PROMPT (COPY THIS)

Add this to your Content Writer agent in Gumloop:

```
LINK USAGE RULES:

1. Every email must include ONE main CTA using these placeholders:
   - Educational content: [link_blueprint]Get your free blueprint[/link_blueprint]
   - Promotional content: [link_membership]Join membership[/link_membership]
   - Feature updates: [link_studio]Explore Studio[/link_studio]

2. Every email footer must include:
   - [link_instagram]Follow on Instagram[/link_instagram]
   - [link_preferences]Update preferences[/link_preferences]
   - [link_unsubscribe]Unsubscribe[/link_unsubscribe]

3. DO NOT use raw URLs. Always use placeholders.

4. Match the link to the content:
   - Teaching Instagram? Mention [link_instagram]
   - Explaining blueprint? Use [link_blueprint]
   - Selling membership? Use [link_membership]
```

---

## 🔄 UPDATES & MAINTENANCE

**When to update links:**
- New product launch → Add new link to link-library.ts
- URL structure changes → Update link-library.ts
- A/B testing → Create variant links

**File to edit:** `/lib/email/link-library.ts`

**After changes:**
```bash
git add lib/email/link-library.ts
git commit -m "Update email links"
git push
```

---

## ❓ FAQ

**Q: Can I use multiple CTAs in one email?**
A: Technically yes, but ONE primary CTA performs better. Secondary CTAs should be softer (social follow, preferences).

**Q: What if I want to link to a blog post?**
A: Use `[link_blogPost]` and I'll add the specific URL parameter support.

**Q: Do I need both /studio and /membership links?**
A: Different purposes:
- `/studio` = Learn about membership (awareness)
- `/checkout/membership` = Buy membership (conversion)

**Q: What about discount codes?**
A: Add them in your link-library.ts as UTM parameters or as separate link variants.

**Q: How do I track which links perform best?**
A: All links get UTM tracking automatically. Check Google Analytics → Acquisition → Campaigns.

---

**You're all set!** Use this guide whenever you're configuring Gumloop content or reviewing newsletters. 🎉

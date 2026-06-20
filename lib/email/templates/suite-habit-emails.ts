// SUITE month-one habit system — the three lifecycle emails that turn "joined" into "weekly
// habit". Copy approved by Sandra 2026-06-10 (docs/email/SUITE_HABIT_EMAILS_DRAFTS_2026-06-10.md
// on studio-v3-staging). Why this exists: average member lifetime is ~102 days, churn clusters
// at month 3, and credits pile up unused — the product's job is the weekly habit, not the tool.

import { renderStoneButton, renderStoneShell } from "./stone-email"

export const SUITE_DAY0_EMAIL_TYPE = "suite-day0-first-shoot"
export const SUITE_NUDGE_EMAIL_TYPE = "suite-48h-first-shoot-nudge"
export const SUITE_WEEKLY_DROP_EMAIL_TYPE = "suite-weekly-drop"

const STUDIO_URL = "https://sselfie.ai/app"  // APP-CUTOVER-01: members now land in the new app

/** Day 0 — right after joining. One action: first brand shoot today. */
export function generateSuiteDay0Email({ firstName }: { firstName: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Welcome in. I'm so glad you're here.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Before anything else, let's get your first photos done today. It takes about 5 minutes:</p>
    <ol style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.9;">
      <li>Take one selfie by a window. Face visible, soft light. Don't overthink it.</li>
      <li>Open your studio.</li>
      <li>Upload the selfie, pick the look that feels most like you, and hit create.</li>
    </ol>
    <div style="margin:26px 0 22px;">${renderStoneButton("Open your studio", STUDIO_URL)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That's it. Maya keeps you recognizable, your age, your features. The photos will look like you, because they're made from you.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">The first time you see yourself in a real brand shoot is the moment this clicks. Go get it.</p>
  `
  return {
    subject: "your first brand shoot (5 minutes, one selfie)",
    html: renderStoneShell({
      title: "Your first brand shoot.",
      eyebrow: "SSELFIE SUITE",
      subtitle: "One selfie. Five minutes. Done today.",
      bodyHtml,
      footerLead: "Stuck anywhere? Just reply. A real person answers.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

Welcome in. I'm so glad you're here.

Before anything else, let's get your first photos done today. It takes about 5 minutes:

1. Take one selfie by a window. Face visible, soft light. Don't overthink it.
2. Open your studio: ${STUDIO_URL}
3. Upload the selfie, pick the look that feels most like you, and hit create.

That's it. Maya keeps you recognizable, your age, your features. The photos will look like you, because they're made from you.

The first time you see yourself in a real brand shoot is the moment this clicks. Go get it.

Stuck anywhere? Just reply. A real person answers.

Sandra x`,
  }
}

/** +48h — ONLY if she still hasn't generated anything. */
export function generateSuiteNudgeEmail({ firstName }: { firstName: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Quick nudge, with love: your first brand shoot is still waiting.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Most members tell me the same thing: they put it off because they don't have a "good enough" selfie. You don't need one. You need a window and 30 seconds.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Open your studio", STUDIO_URL)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">One selfie. Three directions. Pick your favorite. Done before your coffee's cold.</p>
  `
  return {
    subject: "still here when you're ready",
    html: renderStoneShell({
      title: "Still here when you're ready.",
      eyebrow: "SSELFIE SUITE",
      subtitle: "Your first shoot takes one selfie and a window.",
      bodyHtml,
      footerLead: "Reply if anything's in your way. I read these.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

Quick nudge, with love: your first brand shoot is still waiting.

Most members tell me the same thing: they put it off because they don't have a "good enough" selfie. You don't need one. You need a window and 30 seconds.

${STUDIO_URL}

One selfie. Three directions. Pick your favorite. Done before your coffee's cold.

Reply if anything's in your way. I read these.

Sandra x`,
  }
}

/** The Monday weekly drop — the habit anchor. The look rotates by ISO week. */
export interface WeeklyDropLook {
  name: string
  oneLiner: string
}

export const WEEKLY_DROP_LOOKS: WeeklyDropLook[] = [
  { name: "Quiet Luxury London", oneLiner: "Camel coat, London morning, coffee in hand. Quiet luxury energy." },
  { name: "Clean Girl Founder Morning", oneLiner: "Cream knit, slow coffee, soft window light. The founder morning." },
  { name: "Dark Feminine Café", oneLiner: "Black blazer, marble table, moving through the city like you own it." },
  { name: "Dark Balcony", oneLiner: "City lights below, evening silk. Luxury after dark." },
  { name: "Coastal White", oneLiner: "White linen, salt air, golden light on water." },
  { name: "Marble Café Wine", oneLiner: "Candlelit marble, a glass of wine at dusk." },
  { name: "Denim Street", oneLiner: "Golden hour, soft blazer, light denim. Effortless." },
  { name: "Cozy Leather", oneLiner: "Leather jacket over an oversized knit, Sunday-morning mirror light." },
  { name: "Noir Femme", oneLiner: "Black lace, European cobblestones, deep black and white." },
  { name: "Mysterious Vogue", oneLiner: "Deep shadow, one beam of warm light. Real editorial drama." },
]

/** Deterministic look for a given date (ISO week), so every member gets the same drop. */
export function weeklyDropLookForDate(date: Date): WeeklyDropLook {
  const jan1 = Date.UTC(date.getUTCFullYear(), 0, 1)
  const week = Math.floor((date.getTime() - jan1) / (7 * 24 * 3600 * 1000))
  return WEEKLY_DROP_LOOKS[week % WEEKLY_DROP_LOOKS.length]
}

export function generateSuiteWeeklyDropEmail({
  firstName,
  look,
  credits,
}: {
  firstName: string
  look: WeeklyDropLook
  credits: number | null
}) {
  const creditsLine =
    typeof credits === "number" && credits > 0
      ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#8A8780;">P.S. You have ${credits} credits ready. They're there to be used.</p>`
      : ""
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your week of content starts here. This week's look: <strong>${look.name}</strong>.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">${look.oneLiner}</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Open your studio and Maya will pull three directions in this look for you.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Create this week's photos", STUDIO_URL)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">One photo today is enough. Post it, and you're ahead of most people who are still overthinking.</p>
    ${creditsLine}
  `
  return {
    subject: "this week's shoot is ready",
    html: renderStoneShell({
      title: `This week: ${look.name}.`,
      eyebrow: "SSELFIE SUITE · WEEKLY DROP",
      subtitle: look.oneLiner,
      bodyHtml,
      footerLead: "Want a different vibe this week? Reply and tell me.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

Your week of content starts here. This week's look: ${look.name}.

${look.oneLiner}

Open your studio and Maya will pull three directions in this look for you: ${STUDIO_URL}

One photo today is enough. Post it, and you're ahead of most people who are still overthinking.
${typeof credits === "number" && credits > 0 ? `\nP.S. You have ${credits} credits ready. They're there to be used.\n` : ""}
Sandra x`,
  }
}

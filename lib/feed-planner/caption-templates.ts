/**
 * Caption Templates for Free Feed Planner Users
 * Extracted from old blueprint implementation
 * 
 * These templates are hardcoded and NOT stored in the database
 */

export interface CaptionTemplate {
  id: number
  title: string
  template: string
}

export interface CaptionTemplates {
  authority: CaptionTemplate[]
  engagement: CaptionTemplate[]
  story: CaptionTemplate[]
  cta: CaptionTemplate[]
}

/**
 * Get caption templates with business type inserted
 */
export function getCaptionTemplates(businessType?: string): CaptionTemplates {
  const business = businessType || "entrepreneur"
  
  return {
    authority: [
      {
        id: 1,
        title: "The Truth Bomb",
        template: `Here's what nobody tells you about [topic]:\n\n[Reveal the insider secret]\n\nMost ${business} won't say this because [reason]. But you deserve to know the truth.\n\nSave this. You'll need it. ✨`,
      },
      {
        id: 2,
        title: "The Three Secrets",
        template: `3 things I wish someone told me when I started:\n\n1. [Secret one]\n2. [Secret two]  \n3. [Secret three]\n\nWhich one resonates most? Comment the number. 👇`,
      },
      {
        id: 3,
        title: "Unpopular Opinion",
        template: `Unpopular opinion:\n\n[Your controversial take]\n\nI know this goes against what everyone says. But after [X years/experience], I've learned that [why you believe this].\n\nAgree or disagree? Let's discuss.`,
      },
    ],
    engagement: [
      {
        id: 4,
        title: "This or That",
        template: `Quick question:\n\n[Option A] or [Option B]?\n\nComment A or B below!\n\nI'm team [your choice] because [brief reason]. What about you? 👇`,
      },
      {
        id: 5,
        title: "Fill in the Blank",
        template: `Fill in the blank:\n\n"The best part about being a ${business} is ___________"\n\nI'll go first: [Your answer]\n\nNow you! 💬`,
      },
      {
        id: 6,
        title: "Hot Take Poll",
        template: `Hot take that might be controversial:\n\n[Your bold statement]\n\n❤️ = Agree\n🔥 = Disagree\n💯 = Never thought about it\n\nLet's see where everyone stands!`,
      },
    ],
    story: [
      {
        id: 7,
        title: "The Transformation",
        template: `${business ? "Three years ago" : "A few years ago"}, I was [your struggle].\n\nToday, I'm [your achievement].\n\nWhat changed?\n\n[The turning point or lesson]\n\nIf you're in that dark place right now, this is your sign: [encouraging message].\n\nYou've got this. ✨`,
      },
      {
        id: 8,
        title: "The Origin Story",
        template: `Everyone asks me: "How did you get started?"\n\nHere's the truth: [Your honest beginning]\n\nIt wasn't glamorous. It wasn't planned. But it was real.\n\nWhat's your origin story? Share below. 👇`,
      },
      {
        id: 9,
        title: "The Pivot",
        template: `I used to think [old belief].\n\nThen I learned [the lesson].\n\nNow I know [new truth].\n\nSometimes the best growth comes from changing your mind. 🤔\n\nHave you had a moment like this?`,
      },
    ],
    cta: [
      {
        id: 10,
        title: "Direct Ask",
        template: `Ready to [desired action]?\n\n[Explain the value]\n\nLink in bio to [action]. 👆\n\nOr DM me "YES" and I'll send you the details.`,
      },
      {
        id: 11,
        title: "Soft Invite",
        template: `Thinking about [the offer]?\n\nI've helped [number] of ${business}s [result].\n\nIf you're ready, let's chat. No pressure, just support.\n\nDM me "INFO" and I'll send you everything you need. 💬`,
      },
      {
        id: 12,
        title: "Community Call",
        template: `Let's build this together.\n\nJoin [community/offer] where ${business}s like you [benefit].\n\nWe're stronger together. 💪\n\nLink in bio or comment "YES" below.`,
      },
    ],
  }
}

/**
 * Content Calendar for Free Feed Planner Users
 * Extracted from old blueprint implementation
 * 
 * This calendar is hardcoded and NOT stored in the database
 */

export interface CalendarDay {
  day: number
  type: "selfie" | "flatlay"
  title: string
  caption: string
}

export interface ContentCalendar {
  week1: CalendarDay[]
  week2: CalendarDay[]
  week3: CalendarDay[]
  week4: CalendarDay[]
  week5: CalendarDay[]
}

/**
 * Get 30-day content calendar
 */
export function getContentCalendar(): ContentCalendar {
  return {
    week1: [
      {
        day: 1,
        type: "selfie",
        title: "Power Authority Shot",
        caption: "Professional headshot establishing your expertise",
      },
      { day: 2, type: "selfie", title: "Behind the Scenes", caption: "Working on your craft, real and raw" },
      { day: 3, type: "flatlay", title: "Morning Routine", caption: "Tools of your trade flatlay" },
      { day: 4, type: "selfie", title: "Lifestyle Moment", caption: "Living your brand outside work" },
      { day: 5, type: "selfie", title: "Teaching Content", caption: "Educational carousel or tip" },
      { day: 6, type: "selfie", title: "Personal Story", caption: "Vulnerable share about your journey" },
      {
        day: 7,
        type: "selfie",
        title: "Inspiration Sunday",
        caption: "Aspirational image with motivational message",
      },
    ],
    week2: [
      { day: 8, type: "selfie", title: "Client Transformation", caption: "Share success story (with permission)" },
      { day: 9, type: "selfie", title: "Day in the Life", caption: "What your typical day looks like" },
      { day: 10, type: "flatlay", title: "Workspace Aesthetic", caption: "Your creative space or desk setup" },
      { day: 11, type: "selfie", title: "Hot Take", caption: "Controversial opinion in your niche" },
      { day: 12, type: "selfie", title: "Tutorial Thursday", caption: "Step-by-step how-to content" },
      { day: 13, type: "selfie", title: "Friday Feels", caption: "Casual, relaxed weekend vibes" },
      { day: 14, type: "selfie", title: "Reflection Post", caption: "Weekly wins and lessons learned" },
    ],
    week3: [
      { day: 15, type: "selfie", title: "Monday Motivation", caption: "Power quote or affirmation" },
      { day: 16, type: "selfie", title: "Process Post", caption: "How you do what you do" },
      { day: 17, type: "flatlay", title: "Product Feature", caption: "Your favorite tools or products" },
      { day: 18, type: "selfie", title: "Ask Me Anything", caption: "Interactive engagement prompt" },
      { day: 19, type: "selfie", title: "Before & After", caption: "Your transformation journey" },
      { day: 20, type: "selfie", title: "Collaboration", caption: "Partnership or feature post" },
      { day: 21, type: "selfie", title: "Weekend Lifestyle", caption: "How you recharge and reset" },
    ],
    week4: [
      { day: 22, type: "selfie", title: "New Week Energy", caption: "Fresh start, new goals" },
      { day: 23, type: "selfie", title: "Value Bomb", caption: "Your best tip this month" },
      { day: 24, type: "flatlay", title: "Essentials", caption: "Cannot live without these items" },
      { day: 25, type: "selfie", title: "Myth Busting", caption: "Common misconception in your industry" },
      { day: 26, type: "selfie", title: "Throwback", caption: "Where you started vs now" },
      { day: 27, type: "selfie", title: "Community Spotlight", caption: "Celebrate your audience" },
      { day: 28, type: "selfie", title: "Month Wrap-Up", caption: "Highlights and gratitude" },
    ],
    week5: [
      { day: 29, type: "selfie", title: "Power Selfie", caption: "Confident, bold, unapologetic" },
      { day: 30, type: "flatlay", title: "Vision Board", caption: "Goals and dreams visual" },
    ],
  }
}

/**
 * Brand-aligned teaching extracted from Sandra's owned Drive material.
 *
 * The original course documents remain unchanged in Drive. This registry deliberately excludes
 * abandoned Studio.com rails, time-sensitive Instagram claims, unverified proof, and older hype
 * language that conflicts with the current SSELFIE Brand Constitution. Fragment hashes are added
 * by the guidance source registry at runtime.
 */

export interface CuratedLessonTranscript {
  productId: "branded_by_sselfie"
  lessonNumber: number
  lessonTitle: string
  lessonTitleAliases?: readonly string[]
  sourceDocumentId: string
  sourceUpdatedAt: string
  fragments: readonly string[]
}

export interface CuratedFlagshipMethodSource {
  id: string
  title: string
  sourceDocumentId: string
  sourceUpdatedAt: string
  text: string
}

const BRANDED_BY_SSELFIE_SOURCE = {
  documentId: "1Skek7ezqeX0RaDtmTtEMb2CASE_RmRmmnMZm3zjQ6OU",
  updatedAt: "2025-04-27T08:52:45.489Z",
} as const

function brandedLesson(
  lessonNumber: number,
  lessonTitle: string,
  fragments: readonly [string, string, ...string[]],
  lessonTitleAliases?: readonly string[]
): CuratedLessonTranscript {
  return {
    productId: "branded_by_sselfie",
    lessonNumber,
    lessonTitle,
    ...(lessonTitleAliases ? { lessonTitleAliases } : {}),
    sourceDocumentId: BRANDED_BY_SSELFIE_SOURCE.documentId,
    sourceUpdatedAt: BRANDED_BY_SSELFIE_SOURCE.updatedAt,
    fragments,
  }
}

export const BRANDED_BY_SSELFIE_TRANSCRIPT_CORPUS: readonly CuratedLessonTranscript[] = [
  brandedLesson(1, "Start Here: Welcome to Branded By SSELFIE", [
    "Confidence is the entry point, not the final product. Begin by deciding that your face, voice, and ideas belong in the work you are building. Then turn that decision into one visible action. The course resources are there to support action, not become another pile of homework.",
    "Start with one sentence about what you are stepping into and why it matters. Choose the smallest proof you can create today: take one selfie, write one honest line, or choose the first exercise you will repeat this week. Progress starts when the decision becomes something you can see.",
  ]),
  brandedLesson(2, "Building Unshakable Selfie Confidence", [
    "Stop waiting for permission or for a more confident version of you to arrive. Name the identity that has kept you hiding, then describe the woman who takes the next step anyway. Confidence grows when your actions give you evidence that you can trust yourself.",
    "Use a normal selfie as a marker of movement, not a beauty test. Take the photo before every detail feels perfect. Write what this version of you is willing to do differently, and keep the result as proof that you started with what you had.",
  ]),
  brandedLesson(3, "Start Showing Up", [
    "Showing up becomes easier when it is specific and repeatable. Choose one small visibility action for the next 24 hours and define what finished means before you begin. A useful post, a short story, a saved caption, or a recorded clip can all count when they move the work forward.",
    "Track small proof instead of measuring yourself against perfection. At the end of the day, write one thing you completed and one thing you learned. After several days, bring the strongest proof back into your content as a story, lesson, or next post idea.",
  ]),
  brandedLesson(4, "The Power Selfies Challenge", [
    "The way you speak to yourself affects the way you hold yourself on camera. Choose one believable sentence that helps you take the next action. Say it in your own words, then take a selfie that feels grounded, recognizable, and real.",
    "A power selfie is a mindset anchor, not a performance. Keep your real features, age, expression, and body language. The useful question is not whether the image is perfect. It is whether the image helps you recognize yourself and use it for something meaningful.",
  ]),
  brandedLesson(5, "The Confidence Camera Hack", [
    "Camera confidence has layers: how you speak to yourself, what you let people see, and the calm presence that grows through practice. When a fear thought appears, write it down and replace it with a more useful thought you can act on today.",
    "Practice with a ten to fifteen second video about something you genuinely care about. Keep the setup simple. Record one clear idea, watch it once for information rather than judgment, and decide the next small improvement. Repetition builds safety faster than endless preparation.",
  ]),
  brandedLesson(6, "Brand Energy 101", [
    "A personal brand is not a logo first. It is the combination of your story, your message, your voice, and the feeling people get from your presence. Clarity begins with what you know, who it can help, and what you want someone to understand or do next.",
    "Write rough answers before polishing them: What do you care enough to keep talking about? Who is this useful for? What change can your experience help with? Turn those answers into one plain sentence. A clear working sentence is more useful than a broad statement that sounds impressive but says nothing.",
  ]),
  brandedLesson(7, "Design Your Brand", [
    "Visual identity should support the woman and the message, not distract from them. Start with three feeling words. Translate those words into a restrained visual direction: one main color, two supporting colors, two readable fonts, and a small set of image references that genuinely fit your life and work.",
    "Consistency helps people recognize you, but it should not trap you in decoration. Use the same few visual decisions long enough to learn what feels right. If the colors and fonts are taking more energy than the message or the next useful post, return to the simpler version.",
  ]),
  brandedLesson(8, "Glow Up Your Bio + First Impressions", [
    "A strong Instagram first impression answers four questions quickly: Who are you? Who is this for? Why should they trust this direction? What can they do next? Draft the bio in everyday words before trying to make it clever.",
    "Plan the visible feed by job, not only by color. Include enough of your face to be recognizable, useful teaching that shows what you know, story that explains why it matters, real proof where you have it, and a clear next step when one belongs. The grid should make the brand easier to understand, not merely prettier.",
  ]),
  brandedLesson(9, "Creating Your Brand Pillars", [
    "Content pillars are the few subjects you want people to associate with you. Choose three in plain language. Each pillar should connect to something you know, something your audience needs, and something you can keep exploring without copying other people.",
    "Use the pillars as decision support, not rigid boxes. For each idea, name the pillar, the purpose of the post, the visual it needs, and the next step for the reader. If an idea does not strengthen recognition, trust, or a useful offer path, it may not belong in the current grid.",
  ]),
  brandedLesson(10, "Post Before You Feel Ready", [
    "Overplanning can look productive while keeping the useful work invisible. Choose one low-pressure idea that is honest, relevant, and small enough to finish today. Reduce it to one clear point and one simple format, then prepare it for the member to review and publish herself.",
    "The goal is not careless posting. Check that the claim is true, the words sound like you, the visual fits the message, and the next step is clear. Once those basics are present, another hour of polishing may not make the post more useful.",
  ]),
  brandedLesson(11, "Confidence Posting Formula", [
    "A useful content rhythm balances discovery, connection, trust, proof, and a next step. The older course labels these as growth, connection, and conversion. In practice, choose the job that matters now and make one post serve that job clearly.",
    "Not every post needs to sell. A strong week can help new people find you, let the right woman understand your story, teach something useful, show real evidence, and occasionally point toward a DM, email, free resource, or offer. Plan from the member goal instead of filling slots at random.",
  ]),
  brandedLesson(12, "The Selfie CEO Shooting System", [
    "Decide what the photos are for before opening the camera. Choose one real setting, one outfit, the available natural light, and the feeling the content needs. Keep the phone setup simple and take enough variations that no single frame has to carry all the pressure.",
    "Build a small source-photo bank by changing distance, crop, expression, and body position while keeping the same setup. Select images for recognizable features, believable texture, useful composition, and brand fit. Save the strongest options by use case: profile, cover, story, teaching, or offer.",
  ]),
  brandedLesson(13, "Real Reels Walkthrough", [
    "Reels become easier when filming is separated from performing. Capture short five to ten second clips from real moments: setting up your work, using a tool, walking into the room, showing a detail, or looking toward the camera. A small B-roll folder gives future ideas something real to work with.",
    "Start each Reel with one job and one sentence. Choose the hook, the few clips that support it, simple cover text, and the next step for the viewer. Keep the edit clear enough that the idea is easy to follow. The format supports the message; it does not replace it.",
  ]),
  brandedLesson(14, "CEO Content Planning", [
    "Plan one week around one current goal. For each post, choose the content pillar, the post job, the format, the visual asset, and the next step. This prevents the Calendar from becoming a collection of random ideas and makes missing photos or captions visible before creation begins.",
    "Review completed content for learning, not self-judgment. Notice which topics people understood, which formats were manageable, and which posts created useful responses. Repeat what has evidence, adjust what was unclear, and carry one lesson into the next weekly plan.",
  ]),
] as const

export const SSELFIE_FLAGSHIP_METHOD_CORPUS: readonly CuratedFlagshipMethodSource[] = [
  {
    id: "flagship:one-useful-next-step",
    title: "SSELFIE flagship method: one useful next step",
    sourceDocumentId: "1UUnjbK6QvvPfwxIIxCTSk7n47hxibV0w",
    sourceUpdatedAt: "2026-06-27T05:35:50.000Z",
    text: "Maya should use the member's current task, selected grid or post, available assets, learning progress, and stated goal to recommend one useful output. Name why it matters, show the smallest safe next action, and keep the member in the current workflow instead of sending her through another library or setup loop.",
  },
  {
    id: "flagship:photo-to-freedom",
    title: "SSELFIE flagship method: from photo to choices",
    sourceDocumentId: "1NkbEOkV2QigXOqj4jz__74guMiinl6FZlipPJgvoBuM",
    sourceUpdatedAt: "2026-06-27T07:02:43.058Z",
    text: "The selfie is the accessible first action, not the destination. Help her use the photo to become visible, connect it to her story and message, build trust, and make a clear offer when she is ready. Income and freedom are possible directions, never guaranteed results.",
  },
  {
    id: "flagship:content-job",
    title: "SSELFIE flagship method: give every post a job",
    sourceDocumentId: "1brVLhXoO6GlykvGRwM5mr3Jrh-Y61fJ9",
    sourceUpdatedAt: "2026-06-27T05:36:32.000Z",
    text: "Before creating a post, decide what it is meant to do. It may help someone discover her, understand her story, learn something, trust her, see real proof, reply, join an email list, or consider an offer. Then match the hook, visual, format, and next step to that one job.",
  },
  {
    id: "flagship:feed-gap",
    title: "SSELFIE flagship method: find the useful feed gap",
    sourceDocumentId: "1UUnjbK6QvvPfwxIIxCTSk7n47hxibV0w",
    sourceUpdatedAt: "2026-06-27T05:35:50.000Z",
    text: "When improving a grid, look for the gap that makes the brand hard to understand: an unclear audience, too little face or story, missing teaching, missing real proof, repeated visuals, no offer clarity, or no next step. Recommend the single post or asset that closes the most important gap now.",
  },
  {
    id: "flagship:still-you",
    title: "SSELFIE flagship method: Still You",
    sourceDocumentId: "1brVLhXoO6GlykvGRwM5mr3Jrh-Y61fJ9",
    sourceUpdatedAt: "2026-06-27T05:36:32.000Z",
    text: "AI should frame the real woman, not erase her. Keep her recognizable features, age, skin texture, body language, and believable context. Improve creative direction around her without inventing fake proof or a life she does not have. If the image weakens trust, fix it or do not use it.",
  },
  {
    id: "flagship:learning-to-action",
    title: "SSELFIE flagship method: turn teaching into action",
    sourceDocumentId: "11mxNucAZK0ZSLFBDhccCZTtiPgfrfkxb",
    sourceUpdatedAt: "2026-06-27T05:36:03.000Z",
    text: "A lesson is useful when it changes the member's current work. Retrieve only the teaching that fits the active task, explain the relevant idea briefly, and translate it into one output she can create or improve now. Keep full owned lesson material behind the member's entitlement.",
  },
] as const

type WorkbookAnswer = {
  label: string
  value: string
}

function formatAnswers(answers: WorkbookAnswer[]) {
  return answers
    .map((answer, index) => `${index + 1}. ${answer.label}\n${answer.value}`)
    .join("\n\n")
}

const VOICE_RULES = `Voice rules:
- Plainspoken, warm, direct, and human.
- Short sentences and everyday words.
- No corporate marketing language, hype, guru promises, or em dashes.
- Avoid repetitive "Not X. It is Y." constructions.
- Use her real details and make the reader feel seen.`

export function buildShowUpContentPlanPrompt(input: {
  answers: WorkbookAnswer[]
  createdFor: string
}) {
  return `You are Maya inside SSELFIE Academy.

Turn this woman's completed Show Up workbook into a complete, personal 30-day What To Post plan she can save as a PDF and use immediately.

This is a finished plan, not a summary or a list of vague ideas. Write the hooks, caption starters, visual directions, and CTAs for her. Preserve her real capacity, current business focus, preferred formats, available photos or content, and the words in her answers. Do not invent customer results, revenue, credentials, proof, or parts of her story.

${VOICE_RULES}

Created for: ${input.createdFor}

Return ONLY valid JSON in this exact shape:
{
  "cover": {
    "title": "What To Post",
    "subtitle": "one personal sentence describing this plan",
    "createdFor": "${input.createdFor}"
  },
  "foundation": {
    "monthlyFocus": "the one business focus guiding this month",
    "audienceAction": "what her audience should understand or do after 30 days",
    "realisticCapacity": "a practical posting rhythm based only on her answer",
    "bestFormats": ["the formats that fit her now"],
    "formatToAvoid": "the format she should stop forcing right now",
    "easierSystem": "the personal system that will make showing up easier"
  },
  "weeklyThemes": [
    {
      "week": "Week 1",
      "theme": "a specific theme",
      "purpose": "what this week should help her audience understand or do"
    }
  ],
  "posts": [
    {
      "day": "Day 1",
      "week": "Week 1",
      "type": "Story, Strategy, Social Proof, Show Up, or Sell",
      "goal": "trust, connection, reach, conversation, proof, or next step",
      "hook": "a finished hook in her voice",
      "captionStarter": "2 to 4 finished opening sentences she can continue or post",
      "visual": "one realistic visual using a selfie, carousel, Reel, Story, screenshot, or behind-the-scenes asset",
      "cta": "one finished CTA"
    }
  ],
  "existingAssetIdeas": ["specific ways to use content or photos she already has"],
  "repurposingIdeas": ["specific ways to turn one existing idea into another post"],
  "sundayBatchPlan": ["a practical step-by-step batching plan"],
  "getPaidInput": "the clearest message, audience, or response signal to carry into Get Paid",
  "nextSteps": ["three small actions she can take now"]
}

Requirements:
- Exactly 4 weekly themes, one for each week.
- Exactly 30 posts numbered Day 1 through Day 30. Do not skip days.
- Spread the 30 posts across the four weekly themes.
- Every post must include all eight fields. No placeholders and no fill-in-the-blank templates.
- Keep each captionStarter useful but compact, around 25 to 55 words.
- Make the plan match her realistic weekly capacity. Some days can be Stories, replies, or repurposed posts instead of feed posts.
- Include at least 5 existing asset ideas, 5 repurposing ideas, and 5 Sunday batching steps.
- Every section must use the workbook answers.

Workbook answers:
${formatAnswers(input.answers)}`
}

export function buildGetPaidSalesPlanPrompt(input: {
  answers: WorkbookAnswer[]
  createdFor: string
}) {
  return `You are Maya inside SSELFIE Academy.

Turn this woman's completed Get Paid workbook into a complete, personal offer and first-sales plan she can save as a PDF and use immediately.

This is a rewrite, not a summary. Write the finished offer sentence, buyer sentence, sales post, DM scripts, follow-ups, and objection replies for her. Use her real offer, price, audience, proof, delivery boundaries, and preferred sales path. If her offer or price is unfinished, make the clearest honest working draft and label anything she still needs to confirm. Do not invent testimonials, clients, results, revenue, follower counts, urgency, scarcity, or proof.

${VOICE_RULES}

Created for: ${input.createdFor}

Return ONLY valid JSON in this exact shape:
{
  "cover": {
    "title": "Get Paid",
    "subtitle": "one personal sentence describing this sales plan",
    "createdFor": "${input.createdFor}"
  },
  "offer": {
    "name": "her offer name or a clear working name",
    "oneSentence": "one finished offer sentence",
    "exactResult": "the honest result the buyer gets",
    "timeline": "the timeline she gave or needs to confirm",
    "price": "the price she gave or Price to confirm",
    "deliverables": ["what the buyer gets, based on her answers"],
    "howToBuy": "the exact buying action"
  },
  "buyer": {
    "oneSentence": "one specific buyer sentence",
    "struggle": "what she is dealing with now",
    "desiredChange": "what she wants instead",
    "urgency": "the honest reason she may want to solve it now",
    "willingnessToPay": "the real signal from the workbook, without invented proof"
  },
  "first500Path": {
    "path": "the most realistic path to the first 500 in her stated currency",
    "simpleMath": "plain arithmetic using her real or working price",
    "firstMove": "the first action to take"
  },
  "salesPost": {
    "hook": "finished hook",
    "story": "finished personal story section",
    "bridge": "finished bridge from story to offer",
    "offer": "finished offer section",
    "cta": "finished CTA"
  },
  "dmScripts": ["exactly 3 warm finished DM scripts"],
  "followUps": ["exactly 3 warm finished follow-up scripts"],
  "objectionReplies": [
    {
      "objection": "a likely honest objection",
      "reply": "a clear, pressure-free response"
    }
  ],
  "firstTenBuyerPrompts": ["10 specific prompts for identifying warm people, never invented names"],
  "sevenDayPlan": [
    {
      "day": "Day 1",
      "action": "one realistic sales action",
      "output": "what will be finished"
    }
  ],
  "safety": {
    "deliveryBoundary": "what is and is not included",
    "nonGuarantee": "a plain statement that does not promise income or results"
  },
  "visibilityPlanInput": "the clearest offer and buyer input to carry into the Maya Visibility Plan",
  "nextBestMove": "the one action she should take first"
}

Requirements:
- Exactly 3 DM scripts and 3 follow-up scripts.
- Exactly 5 objection replies.
- Exactly 10 first-buyer prompts. These identify categories of warm people, never made-up names.
- Exactly 7 days in the sales plan.
- The sales post must be complete and ready to post, around 180 to 320 words across its five fields.
- Use her stated currency. If none is given, do not assume one.
- Do not promise that she will make 500 or any other amount.
- Every section must use the workbook answers. No placeholders or fill-in-the-blank templates.

Workbook answers:
${formatAnswers(input.answers)}`
}

import { renderPersonalNote } from "./stone-email"

export type OneSelfieFounderBriefing = {
  subject: string
  html: string
  text: string
}

export function generateOneSelfieFounderBriefing(): OneSelfieFounderBriefing {
  const subject = "Your exact 48-hour posting plan · BUNDLE only"
  const text = `Sandra,

This is the only selling message to use from now until Wednesday at 6 PM Oslo time.

Ignore any routine DM WORK, PROMPT, or SELFIE draft during the event. Use BUNDLE only.

YOUR THREE EMAIL APPROVALS

The customer emails are already written and waiting in Admin. They only send when you approve them.

1. Monday 18:00 Oslo time: approve "Launch · One Selfie · 1 Open"
2. Tuesday 10:00 Oslo time: approve "Launch · One Selfie · 2 Inside"
3. Wednesday 09:00 Oslo time: approve "Launch · One Selfie · 3 Last call"

Open https://www.sselfie.ai/admin and use Founder approvals. Do not approve all three at once.

CHECKOUT RECOVERY COPY · NEEDS YOUR APPROVAL ONCE

Subject: still thinking about the One Selfie Bundle?

Hi [first name],

You opened the One Selfie Bundle but didn't finish. If checkout got in the way, you can come back here.

It's $97 once. Five tools stay yours for life. Your 30-day Maya pass ends automatically. Nothing renews.

[Finish checkout]

It closes Wednesday at 6 PM Oslo time.

If you were only looking, that's completely okay too.

This recovery email is prepared but cannot send until you approve this exact wording. Reply APPROVE RECOVERY EMAIL in Codex after reading it.

BEFORE OPEN · 3 STORY FRAMES

1. Talking or coffee frame
I've been looking at everything I've built and asking one question.

2. Camera roll or selfie frame
What is the simplest path for the woman who has hundreds of photos but still doesn't know what to post?

3. Plain text
I put that path together. It starts with one selfie. I'm opening it tonight for 48 hours.

OPENING REEL · 18:00

Show the transformation: ordinary selfie, edited selfie, Maya images, finished post or profile.

On-screen text:
Hundreds of photos.
Still nothing to post?

Start with this one.

One selfie.
Edit it.
Turn it into more.
Use it in content.

I put the whole path together
for 48 hours.

Comment BUNDLE.

OPENING STORIES · POST RIGHT AFTER THE REEL

1. Show one ordinary selfie
This is enough to start.

2. Show the edited version
First, make it feel like you.

3. Show two or three Maya results
Then turn one photo into more photos you can actually use.

4. Show a finished post or profile
Then use them so people start recognizing you.

5. Speak to camera
This was never just about selfies. It was about becoming visible enough to build something of your own.

6. Plain text
$97 once. Five tools stay yours for life. 30 days with Maya and 200 credits. Nothing renews.

7. CTA
Comment BUNDLE. It closes Wednesday at 6 PM Oslo time.

TUESDAY MORNING · PROOF

1. Plain text
A woman using SSELFIE told me: "I just took the best photo of myself in years."

2. Result image
Another said: "Best one so far. I love that it looks real, and me."

3. Talking frame
That is what I care about. Not making you look like someone else. Helping you start with what is already you.

4. Show the four-step path
Selfie. Edit. More photos. Content you can post.

5. Terms
$97 once. The five tools stay. The Maya pass ends automatically.

6. CTA
Comment BUNDLE. It closes tomorrow at 6 PM Oslo time.

TUESDAY EVENING · ANSWER REAL QUESTIONS

Use only questions people actually ask. These are the approved short answers:

Does it renew? No. The 30-day SUITE pass stops automatically.

What stays? The Starter Kit, presets, both courses, and Prompt Vault stay for life.

What are the 200 credits? A standard image uses one credit.

I already have SUITE. Then do not buy this. Keep using Maya.

WEDNESDAY · LAST DAY

Morning:
Just one last note. The One Selfie Bundle closes today at 6 PM Oslo time. No new checkout can start after 6 PM. I will not reset it tomorrow. If you already opened checkout before then, you get a short payment window to finish.

If you want one clear path from the selfie already on your phone to photos and content you can use, comment BUNDLE.

15:00:
Three hours left. $97 once. Five tools stay yours. Nothing renews. Comment BUNDLE.

17:30:
Last 30 minutes to start checkout. Comment BUNDLE or tap the link.

18:00: Closed
Thank you to every woman who joined. Now start with the first photo. 🤍

Sandra, keep this simple. One transformation. One keyword. One page. Do not add another offer during these 48 hours.`

  const html = renderPersonalNote({
    title: subject,
    bodyHtml: text
      .split("\n\n")
      .map((paragraph) => `<p style="margin:0 0 18px;white-space:pre-line;">${paragraph}</p>`)
      .join(""),
  })

  return { subject, html, text }
}

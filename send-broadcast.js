const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_AdXwyunq_ArJKymaaBBePUSbzwQkb3jUi';
const AUDIENCE_ID = '3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd';

const subject = "Let me be really honest with you";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Let me be really honest with you</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" style="border-collapse:collapse;background:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" style="max-width:600px;border-collapse:collapse;">
          <tr>
            <td style="padding:0 0 36px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.3);font-size:10px;font-weight:500;letter-spacing:0.5em;text-transform:uppercase;">SSELFIE STUDIO</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 0;">
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">I started SSELFIE because I wanted to be my own boss.</p>
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">I wanted to choose my own path. Something that worked for <em style="color:#ffffff;">me</em> — something I could stay consistent with and build over time.</p>
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">I have a degree in digital marketing. I know it's possible to make money online. We can reach the entire world with one video, one post.</p>
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">But at the same time — everything is saturated. Everyone is selling something. Trust is low. And it's so easy to get lost.</p>
              <p style="margin:0 0 6px;color:rgba(255,255,255,0.55);font-size:15px;line-height:1.85;font-weight:300;font-style:italic;">Why is she making more than me?</p>
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.55);font-size:15px;line-height:1.85;font-weight:300;font-style:italic;">Why is this working for them and not for me?</p>
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">At the core of it all, what I wanted was simple: I wanted to live freely. I wanted to be myself. I wanted to be happy.</p>
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">I never wanted the 9–5 life where you work all year just to get a few weeks off. I never wanted to trade my time for money.</p>
            </td>
          </tr>
          <tr><td style="padding:12px 0 28px;"><div style="height:1px;background:rgba(255,255,255,0.08);"></div></td></tr>
          <tr>
            <td style="padding:0 0 0;">
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">I know a lot of people are scared of AI. And I get it. It is moving fast. It is uncomfortable.</p>
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">But we have two choices: sit back and wait… or take control and use what's available <em style="color:#ffffff;">now</em> to shape our future.</p>
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">A few years ago, building a brand took insane amounts of time and money. Today? You don't have to quit your job. You don't have to know everything. AI can help you plan, strategize, create — even figure out what you should be doing in the first place.</p>
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">I've been deep in AI since ChatGPT launched in 2022. I follow the trends. I see the patterns. I don't know exactly where this ends up — no one does. But I know I'm not sitting on the sidelines.</p>
              <p style="margin:0 0 28px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">I'm using this advantage for my family. And I want to bring as many women with me as possible.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 28px;">
              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);padding:28px 28px 24px;">
                <p style="margin:0 0 10px;color:rgba(255,255,255,0.38);font-size:10px;font-weight:500;letter-spacing:0.4em;text-transform:uppercase;">That's why I built this</p>
                <p style="margin:0 0 16px;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:300;line-height:1.2;letter-spacing:-0.01em;">Your free brand strategy — from Maya.</p>
                <p style="margin:0 0 20px;color:rgba(255,255,255,0.75);font-size:15px;line-height:1.8;font-weight:300;">Answer 5 questions. Get your own personalised brand strategy in under a minute. Free. No login. No catch.</p>
                <table role="presentation" width="100%" style="border-collapse:collapse;">
                  <tr><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><p style="margin:0;color:rgba(255,255,255,0.78);font-size:14px;line-height:1.5;font-weight:300;"><span style="color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:0.3em;text-transform:uppercase;margin-right:10px;">01</span>Your positioning statement</p></td></tr>
                  <tr><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><p style="margin:0;color:rgba(255,255,255,0.78);font-size:14px;line-height:1.5;font-weight:300;"><span style="color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:0.3em;text-transform:uppercase;margin-right:10px;">02</span>3–5 content pillars for your business</p></td></tr>
                  <tr><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><p style="margin:0;color:rgba(255,255,255,0.78);font-size:14px;line-height:1.5;font-weight:300;"><span style="color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:0.3em;text-transform:uppercase;margin-right:10px;">03</span>Your brand voice guide</p></td></tr>
                  <tr><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><p style="margin:0;color:rgba(255,255,255,0.78);font-size:14px;line-height:1.5;font-weight:300;"><span style="color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:0.3em;text-transform:uppercase;margin-right:10px;">04</span>10 caption starters written for your vibe</p></td></tr>
                  <tr><td style="padding:7px 0;"><p style="margin:0;color:rgba(255,255,255,0.78);font-size:14px;line-height:1.5;font-weight:300;"><span style="color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:0.3em;text-transform:uppercase;margin-right:10px;">05</span>3 example posts ready to adapt</p></td></tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0 32px;text-align:center;">
              <a href="https://sselfie.ai/freebie/brand-strategy" style="display:inline-block;padding:17px 44px;background:#ffffff;color:#0a0a0a;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.35em;text-transform:uppercase;">GET MY FREE STRATEGY &#8594;</a>
              <p style="margin:12px 0 0;color:rgba(255,255,255,0.3);font-size:12px;">Takes 2 minutes. Lives on your own page forever.</p>
            </td>
          </tr>
          <tr><td style="padding:0 0 28px;"><div style="height:1px;background:rgba(255,255,255,0.08);"></div></td></tr>
          <tr>
            <td style="padding:0 0 36px;">
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">Wild, right? That something this personalised is free now.</p>
              <p style="margin:0 0 28px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">This is me using the advantage. And bringing you with me.</p>
              <p style="margin:0;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.85;font-weight:300;">Love,<br/><strong style="color:#ffffff;font-weight:500;">Sandra</strong><br/><span style="color:rgba(255,255,255,0.4);font-size:13px;letter-spacing:0.05em;">The Selfie Queen</span></p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;border-top:1px solid rgba(255,255,255,0.07);text-align:center;">
              <p style="margin:0 0 6px;color:rgba(255,255,255,0.22);font-size:11px;line-height:1.6;">SSELFIE Studio &middot; <a href="https://sselfie.ai" style="color:rgba(255,255,255,0.3);text-decoration:none;">sselfie.ai</a></p>
              <p style="margin:0;color:rgba(255,255,255,0.22);font-size:11px;">You're receiving this because you signed up at sselfie.ai. <a href="{{unsubscribe_url}}" style="color:rgba(255,255,255,0.3);text-decoration:none;">Unsubscribe</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const text = `SSELFIE STUDIO
─────────────────────

I started SSELFIE because I wanted to be my own boss.

I wanted to choose my own path. Something that worked for me — something I could stay consistent with and build over time.

I have a degree in digital marketing. I know it's possible to make money online. We can reach the entire world with one video, one post.

But at the same time — everything is saturated. Everyone is selling something. Trust is low. And it's so easy to get lost.

  "Why is she making more than me?"
  "Why is this working for them and not for me?"

At the core of it all, what I wanted was simple: I wanted to live freely. I wanted to be myself. I wanted to be happy.

I never wanted the 9–5 life where you work all year just to get a few weeks off. I never wanted to trade my time for money.

─────────────────────

I know a lot of people are scared of AI. And I get it. It is moving fast. It is uncomfortable.

But we have two choices: sit back and wait… or take control and use what's available now to shape our future.

A few years ago, building a brand took insane amounts of time and money. Today? You don't have to quit your job. You don't have to know everything. AI can help you plan, strategize, create — even figure out what you should be doing in the first place.

I've been deep in AI since ChatGPT launched in 2022. I follow the trends. I see the patterns. I don't know exactly where this ends up — no one does. But I know I'm not sitting on the sidelines.

I'm using this advantage for my family. And I want to bring as many women with me as possible.

─────────────────────
THAT'S WHY I BUILT THIS
─────────────────────

Your free brand strategy — from Maya.

Answer 5 questions. Get your own personalised brand strategy in under a minute.
Free. No login. No catch.

01 — Your positioning statement
02 — 3–5 content pillars for your business
03 — Your brand voice guide
04 — 10 caption starters written for your vibe
05 — 3 example posts ready to adapt

→ GET MY FREE STRATEGY: https://sselfie.ai/freebie/brand-strategy

Takes 2 minutes. Lives on your own page forever.

─────────────────────

Wild, right? That something this personalised is free now.

This is me using the advantage. And bringing you with me.

Love,
Sandra
The Selfie Queen

─────────────────────
SSELFIE Studio · sselfie.ai
Unsubscribe: {{unsubscribe_url}}`;

async function run() {
  // Step 1: Create broadcast
  console.log('Creating broadcast...');
  const createRes = await fetch('https://api.resend.com/broadcasts', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Freebie Launch — Free Brand Strategy (2026-03-01)',
      audience_id: AUDIENCE_ID,
      from: 'Sandra — SSELFIE <hello@sselfie.ai>',
      subject: subject,
      html: html,
      text: text,
    }),
  });

  const createData = await createRes.json();
  console.log('Create status:', createRes.status);
  console.log('Create response:', JSON.stringify(createData, null, 2));

  if (!createRes.ok || !createData.id) {
    console.error('Failed to create broadcast');
    process.exit(1);
  }

  const broadcastId = createData.id;
  console.log('Broadcast ID:', broadcastId);

  // Step 2: Send broadcast
  console.log('Sending broadcast...');
  const sendRes = await fetch('https://api.resend.com/broadcasts/' + broadcastId + '/send', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const sendData = await sendRes.json();
  console.log('Send status:', sendRes.status);
  console.log('Send response:', JSON.stringify(sendData, null, 2));
}

run().catch(console.error);

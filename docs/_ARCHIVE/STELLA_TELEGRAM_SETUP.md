# Stella Telegram Setup

## Requirements
- Telegram bot token from BotFather
- Optional secret token for webhook validation
- Allowed chat IDs list

## Environment Variables
Add to `.env.local`:

```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_SECRET_TOKEN=your_secret_token
TELEGRAM_ALLOWED_CHAT_IDS=123456789,987654321
```

Notes:
- `TELEGRAM_SECRET_TOKEN` is optional but recommended.
- `TELEGRAM_ALLOWED_CHAT_IDS` is required; only these chats can talk to Stella.

## Set the Webhook
Replace `YOUR_DOMAIN` with your deployed domain (HTTPS required).

```
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://YOUR_DOMAIN/api/telegram/webhook","secret_token":"'$TELEGRAM_SECRET_TOKEN'"}'
```

## Get Your Chat ID
1. Message your bot on Telegram.
2. Visit:
```
https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates
```
3. Find `chat.id` and add it to `TELEGRAM_ALLOWED_CHAT_IDS`.

## Message Stella
You can prefix a message with a mode:
- `mode: vision`
- `mode: growth`
- `mode: content`
- `mode: systems`
- `mode: product`

If no mode is provided, Stella uses General mode.

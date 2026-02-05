# Stella + Clawdbot Bridge (WhatsApp Operator Layer)

This guide connects Clawdbot to SSELFIE’s Stella brain so WhatsApp messages
are handled by the same Stella you use inside Admin.

## 1) SSELFIE environment variables

Add to `.env.local` (and your hosting dashboard):

```
STELLA_BRIDGE_TOKEN=your_long_random_secret
```

Your Stella bridge endpoint is:

```
https://sselfie.ai/api/stella/bridge
```

## 2) Clawdbot plugin (stella-bridge)

We install a small plugin that adds a tool called `stella_bridge`.
The Clawdbot agent will call this tool to forward messages to SSELFIE.

Required env vars for Clawdbot:

```
STELLA_BRIDGE_URL=https://sselfie.ai/api/stella/bridge
STELLA_BRIDGE_TOKEN=your_long_random_secret
```

## 3) Clawdbot config (allowlist + tools)

Minimal config example (`~/.clawdbot/clawdbot.json`):

```json5
{
  agents: {
    defaults: {
      workspace: "~/stella",
      tools: {
        allow: ["stella_bridge"]
      }
    }
  },
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15555550123"]
    }
  }
}
```

## 4) Stella routing in Clawdbot workspace

In your Clawdbot workspace (`~/stella/AGENTS.md`), add:

```
You must call the tool `stella_bridge` for every incoming user message.
Do not answer directly. Return only Stella’s response.
```

## 5) Test

1) Send a WhatsApp message to the bot number.
2) The agent calls `stella_bridge`.
3) The response comes back from SSELFIE.

If you see errors, check:
- Clawdbot logs
- SSELFIE logs
- `STELLA_BRIDGE_TOKEN` matches on both sides

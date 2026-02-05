import { NextRequest, NextResponse } from "next/server"
import { stellaReply, parseStellaMode } from "@/lib/stella/runtime"

const TELEGRAM_API = "https://api.telegram.org"

type TelegramMessage = {
  message_id: number
  text?: string
  chat: { id: number; type: string; title?: string; username?: string }
  from?: { id: number; username?: string; first_name?: string }
}

type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
}

function isAllowedChat(chatId: number): boolean {
  const allow = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "").trim()
  if (!allow) {
    return false
  }
  const allowed = allow.split(",").map(id => id.trim()).filter(Boolean)
  return allowed.includes(String(chatId))
}

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  const url = `${TELEGRAM_API}/bot${token}/sendMessage`
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  })
}

export async function POST(req: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      console.error("[Stella] TELEGRAM_BOT_TOKEN not configured")
      return NextResponse.json({ error: "Telegram bot token not configured" }, { status: 500 })
    }

    const secretToken = process.env.TELEGRAM_SECRET_TOKEN
    if (secretToken) {
      const header = req.headers.get("x-telegram-bot-api-secret-token")
      if (header !== secretToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const update = (await req.json()) as TelegramUpdate
    const msg = update.message

    if (!msg || !msg.text) {
      return NextResponse.json({ ok: true })
    }

    const chatId = msg.chat.id
    if (!isAllowedChat(chatId)) {
      await sendTelegramMessage(token, chatId, "Stella is not configured for this chat yet.")
      return NextResponse.json({ ok: true })
    }

    const parsed = parseStellaMode(msg.text)
    const reply = await stellaReply({ message: parsed.cleaned, mode: parsed.mode })

    await sendTelegramMessage(token, chatId, reply)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[Stella] Telegram webhook error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}

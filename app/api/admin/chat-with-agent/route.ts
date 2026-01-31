import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { agentId, message } = await req.json()

    // TODO: Replace with actual Gumloop API call
    // For now, return a placeholder response

    // When you're ready to connect Gumloop:
    /*
    const response = await fetch(`https://api.gumloop.com/v1/agents/${agentId}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GUMLOOP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        session_id: 'admin-session-' + Date.now()
      })
    })

    const data = await response.json()

    return NextResponse.json({
      response: data.message,
      agentId,
      timestamp: new Date().toISOString()
    })
    */

    // Placeholder response
    return NextResponse.json({
      response: `🤖 This is a placeholder response from ${agentId}.

To enable live agent responses:

1. Get your Gumloop API key from https://gumloop.com
2. Add to your .env file:
   GUMLOOP_API_KEY=your_key_here
3. Uncomment the Gumloop API call code in this file
4. Test the connection

Your message was: "${message}"

See CLEAN_ADMIN_ARCHITECTURE.md for detailed setup instructions.`,
      agentId,
      timestamp: new Date().toISOString(),
      placeholder: true
    })

  } catch (error) {
    console.error("[Admin] Error in chat-with-agent:", error)
    return NextResponse.json(
      { error: "Failed to chat with agent" },
      { status: 500 }
    )
  }
}

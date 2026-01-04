import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Find the user by email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, name")
      .eq("email", email)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "User not found",
          details: userError?.message,
        },
        { status: 404 },
      )
    }

    console.log("[v0] Found user:", user)

    // Find the user's model
    const { data: model, error: modelError } = await supabase
      .from("user_models")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (modelError || !model) {
      return NextResponse.json(
        {
          error: "Model not found for user",
          details: modelError?.message,
        },
        { status: 404 },
      )
    }

    console.log("[v0] Found model:", model)

    // Update the lora_scale if it's missing or null
    const defaultLoraScale = 1.0
    const { data: updatedModel, error: updateError } = await supabase
      .from("user_models")
      .update({
        lora_scale: model.lora_scale || defaultLoraScale,
        updated_at: new Date().toISOString(),
      })
      .eq("id", model.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        {
          error: "Failed to update model",
          details: updateError.message,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Updated model:", updatedModel)

    // Check for lora_weights entry
    const { data: loraWeights, error: loraError } = await supabase
      .from("lora_weights")
      .select("*")
      .eq("user_id", user.id)

    console.log("[v0] Lora weights:", loraWeights)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      model: updatedModel,
      loraWeights: loraWeights || [],
      message: `Successfully updated lora_scale to ${updatedModel.lora_scale} for ${user.email}`,
    })
  } catch (error: any) {
    console.error("[v0] Error fixing lora data:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"

export async function POST(request: Request): Promise<NextResponse> {
  try {
    console.log("[v0] ========= UPLOAD ENDPOINT CALLED =========")
    console.log("[v0] Request URL:", request.url)
    console.log("[v0] Request method:", request.method)
    console.log("[v0] Content-Type:", request.headers.get("content-type"))
    
    let authUser
    let neonUser
    
    try {
      console.log("[v0] Creating Supabase client...")
      const supabase = await createServerClient()
      console.log("[v0] Supabase client created")
      
      console.log("[v0] Getting auth user...")
      const { data, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error("[v0] Supabase auth error:", authError)
        return NextResponse.json({ error: `Authentication error: ${authError.message}` }, { status: 401 })
      }
      
      authUser = data.user
      
      if (!authUser) {
        console.error("[v0] No authenticated user")
        return NextResponse.json({ error: "Unauthorized - no auth user" }, { status: 401 })
      }

      console.log("[v0] Auth user found:", authUser.email)

      console.log("[v0] Looking up Neon user...")
      neonUser = await getUserByAuthId(authUser.id)
      
      if (!neonUser) {
        console.error("[v0] User not found in Neon database")
        return NextResponse.json({ error: "User not found in database" }, { status: 404 })
      }

      console.log("[v0] Neon user found:", neonUser.id)
    } catch (authErr) {
      console.error("[v0] Authentication setup failed:", authErr)
      console.error("[v0] Auth error details:", {
        message: authErr instanceof Error ? authErr.message : String(authErr),
        stack: authErr instanceof Error ? authErr.stack : undefined,
      })
      return NextResponse.json(
        { 
          error: "Authentication failed", 
          details: authErr instanceof Error ? authErr.message : String(authErr) 
        }, 
        { status: 500 }
      )
    }

    const contentType = request.headers.get("content-type")
    console.log("[v0] Processing upload with content-type:", contentType)

    if (contentType?.includes("multipart/form-data") || contentType === null) {
      console.log("[v0] Attempting to process as FormData (content-type: %s)...", contentType || "null")
      
      try {
        const formData = await request.formData()
        console.log("[v0] FormData parsed successfully. Keys:", Array.from(formData.keys()))
        
        const file = formData.get("file") || formData.get("image")
        
        if (!file || !(file instanceof File || file instanceof Blob)) {
          console.error("[v0] No valid file in FormData")
          
          // If content-type was null and no file, try JSON parsing as fallback
          if (contentType === null) {
            console.log("[v0] Falling back to JSON parsing...")
            const clonedRequest = request.clone()
            try {
              const body = await clonedRequest.json()
              const { image } = body

              if (image && image.startsWith("data:image/")) {
                const base64Data = image.split(",")[1]
                const buffer = Buffer.from(base64Data, "base64")
                const mimeType = image.split(";")[0].split(":")[1]
                const extension = mimeType.split("/")[1]

                const blob = await put(`testimonials/${Date.now()}.${extension}`, buffer, {
                  access: "public",
                  contentType: mimeType,
                })

                console.log("[v0] ✓ Base64 upload successful:", blob.url)
                return NextResponse.json({ url: blob.url })
              }
            } catch (jsonErr) {
              console.error("[v0] JSON parsing also failed:", jsonErr)
            }
          }
          
          return NextResponse.json({ error: "No file provided in request" }, { status: 400 })
        }
        
        const fileName = file instanceof File ? file.name : `upload-${Date.now()}.png`
        console.log("[v0] Uploading file:", fileName, "Size:", file.size, "bytes")
        
        // Upload to Blob storage
        const blob = await put(`testimonials/${Date.now()}-${fileName}`, file, {
          access: "public",
        })
        
        console.log("[v0] ✓ Upload successful:", blob.url)
        return NextResponse.json({ url: blob.url })
      } catch (formDataErr) {
        console.error("[v0] FormData parsing failed:", formDataErr)
        
        // If content-type was explicitly multipart, this is an error
        if (contentType?.includes("multipart/form-data")) {
          return NextResponse.json({ 
            error: "Failed to parse FormData", 
            details: formDataErr instanceof Error ? formDataErr.message : String(formDataErr) 
          }, { status: 400 })
        }
        // Otherwise fall through to JSON handling
      }
    }

    // Handle base64 JSON uploads
    if (contentType?.includes("application/json")) {
      console.log("[v0] Processing JSON upload...")
      const body = await request.json()
      const { image } = body

      if (!image || !image.startsWith("data:image/")) {
        return NextResponse.json({ error: "Invalid image data" }, { status: 400 })
      }

      const base64Data = image.split(",")[1]
      const buffer = Buffer.from(base64Data, "base64")
      const mimeType = image.split(";")[0].split(":")[1]
      const extension = mimeType.split("/")[1]

      const blob = await put(`testimonials/${Date.now()}.${extension}`, buffer, {
        access: "public",
        contentType: mimeType,
      })

      console.log("[v0] ✓ Base64 upload successful:", blob.url)
      return NextResponse.json({ url: blob.url })
    }

    console.error("[v0] Unsupported content type or no valid data:", contentType)
    return NextResponse.json({ error: "Unsupported content type or no valid upload data" }, { status: 400 })
    
  } catch (error) {
    console.error("[v0] ========= UNEXPECTED ERROR IN UPLOAD =========")
    console.error("[v0] Error type:", typeof error)
    console.error("[v0] Error:", error)
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : undefined)
    console.error("[v0] =====================================")
    
    return NextResponse.json(
      { 
        error: "Upload failed", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 },
    )
  }
}

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    // Get authenticated user
    const user = await getUserByAuthId()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validate file type and generate secure token
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
          tokenPayload: JSON.stringify({
            userId: user.id,
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This runs after upload completes
        console.log("Blob upload completed:", blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error("Error generating upload token:", error)
    return NextResponse.json({ error: "Failed to generate upload token" }, { status: 500 })
  }
}

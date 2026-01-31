import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

/**
 * Simple exit impersonation - clears cookie and redirects
 */
export async function GET() {
  const cookieStore = await cookies()
  cookieStore.delete("impersonate_user_id")
  redirect("/admin")
}

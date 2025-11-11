import { redirect } from "next/navigation"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { LaunchEmailSender } from "@/components/admin/launch-email-sender"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export default async function LaunchEmailPage() {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/")
  }

  const user = await getUserByAuthId(authUser.id)
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/")
  }

  const sql = neon(process.env.DATABASE_URL!)

  const subscriberCount = await sql`
    SELECT COUNT(*) as count 
    FROM freebie_subscribers
  `
  const totalSubscribers = Number.parseInt(subscriberCount[0].count)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🚀 Launch Email Campaign</h1>
          <p className="text-muted-foreground">
            Send the SSELFIE Studio launch announcement to {totalSubscribers.toLocaleString()} subscribers
          </p>
        </div>

        <LaunchEmailSender totalSubscribers={totalSubscribers} />
      </div>
    </div>
  )
}

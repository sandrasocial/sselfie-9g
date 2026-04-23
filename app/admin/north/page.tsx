import { redirect } from "next/navigation"

// North dashboard retired — redirect to main admin
export default function NorthPage() {
  redirect("/admin")
}

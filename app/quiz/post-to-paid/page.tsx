import type { Metadata } from "next"
import { PostToPaidQuiz } from "@/components/sselfie/post-to-paid-quiz"

export const metadata: Metadata = {
  title: "Post To Paid Diagnostic | SSELFIE",
  description: "Find the first paid next step for your message, content, buyer path, or Studio execution.",
}

export default function PostToPaidQuizPage() {
  return <PostToPaidQuiz />
}

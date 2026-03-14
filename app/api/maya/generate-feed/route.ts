import { type NextRequest } from "next/server"
import { handleFeedStrategyRoute } from "@/lib/maya/feed-strategy-handler"

export const POST = (req: NextRequest) => handleFeedStrategyRoute(req, false)

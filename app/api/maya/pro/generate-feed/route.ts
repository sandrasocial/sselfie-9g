import { type NextRequest } from "next/server"
import { handleFeedStrategyRoute } from "@/lib/maya/feed-strategy"

export const POST = (req: NextRequest) => handleFeedStrategyRoute(req, true)

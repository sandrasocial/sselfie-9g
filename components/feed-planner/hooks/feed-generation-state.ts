type FeedGenerationPost = {
  prediction_id?: unknown
  image_url?: unknown
  generation_status?: string | null
}

export function isFeedPostGenerating(post: FeedGenerationPost): boolean {
  return Boolean((post?.prediction_id && !post?.image_url) || post?.generation_status === "generating")
}

export function countCompletedFeedPosts(posts: readonly FeedGenerationPost[] | null | undefined): number {
  return Array.isArray(posts) ? posts.filter((post) => Boolean(post?.image_url)).length : 0
}

import { useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import type { FeedStrategy } from "@/lib/maya/feed-generation-handler"
import type { FeedPost } from "@/components/feed-planner/feed-preview-types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const isStrategyDocument = (text: string | null | undefined): boolean => {
  if (!text) return false
  return /^#{1,3}\s/m.test(text) && text.length > 500
}

const getSafeDescription = (desc: string | null | undefined): string => {
  if (!desc) return ""
  return isStrategyDocument(desc) ? "" : desc
}

const getExistingStrategyImageUrl = (post: any): string | null => {
  const imageUrl = typeof post?.image_url === "string"
    ? post.image_url.trim()
    : typeof post?.imageUrl === "string"
      ? post.imageUrl.trim()
      : ""
  if (!imageUrl) return null

  const source = String(post?.source || post?.assetSource || "").toLowerCase()
  const postType = String(post?.postType || post?.type || "").toLowerCase()
  return source === "existing_gallery_image" || postType === "existing" ? imageUrl : null
}

interface UseFeedPollingParams {
  feedIdProp?: number
  feedTitle?: string
  feedDescription?: string
  posts: FeedPost[]
  needsRestore: boolean
  strategy?: FeedStrategy
  isSavedProp: boolean
}

export function useFeedPolling({
  feedIdProp,
  feedTitle,
  feedDescription,
  posts,
  needsRestore,
  strategy,
  isSavedProp,
}: UseFeedPollingParams) {
  const [savedFeedId, setSavedFeedId] = useState<number | null>(feedIdProp || null)
  const [postsData, setPostsData] = useState<FeedPost[]>(posts)
  const [displayTitle, setDisplayTitle] = useState<string>(feedTitle || "Instagram Feed")
  const [displayDescription, setDisplayDescription] = useState<string>(getSafeDescription(feedDescription))
  const [feedStatus, setFeedStatus] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(
    posts.some((p) => p.generation_status === "generating" || (p.prediction_id && !p.image_url)),
  )

  const hasFetchedRef = useRef<string | false>(false)
  const preserveStrategyPostsRef = useRef(false)

  const feedId = savedFeedId || feedIdProp || null
  const isSaved = (isSavedProp || !!savedFeedId) && !!feedId

  const { mutate } = useSWR(feedId ? `/api/feed/${feedId}` : null, fetcher, {
    refreshInterval: (data) => {
      const hasGeneratingPosts = data?.posts?.some(
        (p: any) => (p.prediction_id && !p.image_url) || p.generation_status === "generating",
      )
      if (!hasGeneratingPosts || !feedId) return 0
      fetch(`/api/feed/${feedId}/progress`).finally(() => mutate())
      return 3000
    },
    revalidateOnFocus: true,
    refreshWhenHidden: false,
    onSuccess: (data) => {
      if (!feedId || !Array.isArray(data?.posts)) return
      setPostsData(data.posts)
      preserveStrategyPostsRef.current = false
      setIsGenerating(
        data.posts.some((p: any) => (p.prediction_id && !p.image_url) || p.generation_status === "generating"),
      )
      if (data.feed?.brand_name) {
        setDisplayTitle((prev) => (prev === data.feed.brand_name ? prev : data.feed.brand_name))
      }
      if (data.feed?.description !== undefined) {
        const safeDesc = getSafeDescription(data.feed.description)
        setDisplayDescription((prev) => (prev === safeDesc ? prev : safeDesc))
      }
      setFeedStatus(data.feed?.status || data.status || null)
    },
  })

  useEffect(() => {
    if (feedId) hasFetchedRef.current = false
  }, [feedId])

  useEffect(() => {
    if (feedIdProp) setSavedFeedId(feedIdProp)
  }, [feedIdProp])

  useEffect(() => {
    setDisplayTitle(feedTitle || "Instagram Feed")
    setDisplayDescription(getSafeDescription(feedDescription))
    if (!feedId || !needsRestore || hasFetchedRef.current === false) {
      setPostsData(posts)
    }
  }, [feedTitle, feedDescription, posts, feedId, needsRestore])

  useEffect(() => {
    if (!feedId) return
    const fetchKey = `${feedId}-${needsRestore}`
    const shouldFetch =
      (needsRestore && hasFetchedRef.current !== fetchKey) ||
      (hasFetchedRef.current === false && (!posts || posts.length === 0))
    if (!shouldFetch) return

    hasFetchedRef.current = fetchKey
    fetch(`/api/feed/${feedId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch feed: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        const restoredPosts = Array.isArray(data.posts)
          ? data.posts
          : Array.isArray(data.feed?.posts)
            ? data.feed.posts
            : null
        if (restoredPosts) {
          setPostsData(restoredPosts)
          preserveStrategyPostsRef.current = false
        }

        const restoredTitle =
          data.title || data.brand_name || data.feed?.title || data.feed?.brand_name || data.feed?.gridPattern
        if (restoredTitle) setDisplayTitle(restoredTitle)

        const restoredDescription =
          data.description || data.feed?.description || data.feed?.gridPattern || data.feed?.overall_vibe
        setDisplayDescription(getSafeDescription(restoredDescription))

        setFeedStatus(data.feed?.status || data.status || null)
      })
      .catch(() => {
        hasFetchedRef.current = false
      })
  }, [feedId, needsRestore, posts])

  const effectivePosts = useMemo(() => {
    const useStrategyPosts = strategy?.posts && (!feedId || postsData.length === 0 || preserveStrategyPostsRef.current)
    if (!useStrategyPosts || !strategy?.posts?.length) return postsData

    return strategy.posts.map((p: any, index: number) => {
      const existingImageUrl = getExistingStrategyImageUrl(p)

      return {
        id: index + 1,
        position: p.position || index + 1,
        image_url: existingImageUrl,
        generation_status: existingImageUrl ? "completed" : "pending",
        prompt: p.prompt || p.imagePrompt || p.visualDirection || "",
        caption: p.caption || "",
        post_type: existingImageUrl ? "existing" : p.postType || p.type || "user",
        content_pillar: p.purpose || "",
        prediction_id: undefined,
      }
    }) as FeedPost[]
  }, [feedId, postsData, strategy])

  const sortedPosts = useMemo(() => [...effectivePosts].sort((a, b) => a.position - b.position), [effectivePosts])

  const readyCount = effectivePosts.filter((p) => p.image_url).length
  const pendingCount = effectivePosts.filter(
    (p) => !p.image_url && p.generation_status !== "generating" && p.generation_status !== "failed",
  ).length
  const failedCount = effectivePosts.filter((p) => p.generation_status === "failed").length
  const generatingCount = effectivePosts.filter(
    (p) => p.generation_status === "generating" || (p.prediction_id && !p.image_url),
  ).length

  const hasPendingPosts = pendingCount > 0
  const hasFailedPosts = failedCount > 0
  const isAnyGenerating = generatingCount > 0 || isGenerating

  return {
    feedId,
    isSaved,
    savedFeedId,
    setSavedFeedId,
    postsData,
    setPostsData,
    displayTitle,
    setDisplayTitle,
    displayDescription,
    setDisplayDescription,
    feedStatus,
    setFeedStatus,
    isGenerating,
    setIsGenerating,
    mutateFeed: mutate,
    markJustSaved: () => {
      preserveStrategyPostsRef.current = true
    },
    sortedPosts,
    readyCount,
    pendingCount,
    failedCount,
    generatingCount,
    hasPendingPosts,
    hasFailedPosts,
    isAnyGenerating,
  }
}

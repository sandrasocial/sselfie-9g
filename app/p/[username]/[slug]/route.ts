import { NextRequest, NextResponse } from "next/server"
import { getPublishedPersonalPageByPath } from "@/lib/maya/personal-pages"
import { logAnalyticsEvent } from "@/lib/analytics/events"

interface RouteParams {
  params: Promise<{ username: string; slug: string }>
}

function renderNotFoundHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Page not found</title>
    <style>
      body { margin: 0; font-family: Inter, sans-serif; background: #0b0b0b; color: #f2f2f2; display: grid; place-items: center; min-height: 100vh; }
      .wrap { text-align: center; max-width: 460px; padding: 24px; }
      h1 { margin: 0 0 10px; font-size: 28px; letter-spacing: -0.02em; }
      p { margin: 0; color: #b7b7b7; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <h1>This page is not available</h1>
      <p>The link may be wrong or the page is no longer published.</p>
    </main>
  </body>
</html>`
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { username, slug } = await params
    const page = await getPublishedPersonalPageByPath({ username, slug })

    if (!page || !page.published_html) {
      return new NextResponse(renderNotFoundHtml(), {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      })
    }

    void logAnalyticsEvent({
      eventName: "maya_public_page_view",
      path: `/p/${username}/${slug}`,
      properties: {
        pageId: page.id,
        ownerSlug: page.owner_slug,
        pageSlug: page.slug,
        pageType: page.page_type,
      },
    })

    return new NextResponse(page.published_html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    })
  } catch (error) {
    console.error("[Public Personal Page] Error:", error)
    return new NextResponse(renderNotFoundHtml(), {
      status: 500,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  }
}

import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { UIMessage } from "@ai-sdk/react"

vi.mock("@/components/sselfie/video-card", () => ({
  default: () => null,
}))

vi.mock("@/components/sselfie/maya/maya-concept-cards", () => ({
  default: () => null,
}))

vi.mock("@/components/sselfie/prompt-suggestion-card", () => ({
  PromptSuggestionCard: () => null,
}))

vi.mock("@/components/feed-planner/feed-preview-card", () => ({
  default: () => null,
}))

vi.mock("@/components/feed-planner/feed-caption-card", () => ({
  default: () => null,
}))

vi.mock("@/components/feed-planner/feed-strategy-card", () => ({
  default: () => null,
}))

vi.mock("@/components/sselfie/unified-loading", () => ({
  default: ({ message }: { message?: string }) => <div>{message}</div>,
}))

vi.mock("@/components/sselfie/maya/maya-offer-brief-form", () => ({
  default: () => null,
}))

import MayaChatInterface from "@/components/sselfie/maya/maya-chat-interface"

function renderInterface(messages: UIMessage[], overrides: Partial<React.ComponentProps<typeof MayaChatInterface>> = {}) {
  return render(
    <MayaChatInterface
      messages={messages}
      filteredMessages={messages}
      setMessages={vi.fn()}
      proMode={false}
      isTyping={false}
      isGeneratingConcepts={false}
      isGeneratingPro={false}
      isCreatingFeed={false}
      contentFilter="all"
      messagesContainerRef={{ current: document.createElement("div") }}
      messagesEndRef={{ current: document.createElement("div") }}
      showScrollButton={false}
      isAtBottomRef={{ current: true }}
      scrollToBottom={vi.fn()}
      chatId={123}
      uploadedImages={[]}
      setCreditBalance={vi.fn()}
      onImageGenerated={vi.fn()}
      isAdmin={false}
      selectedGuideId={null}
      selectedGuideCategory={null}
      onSaveToGuide={vi.fn()}
      userId="user-1"
      user={null}
      promptSuggestions={[]}
      {...overrides}
    />,
  )
}

describe("MayaChatInterface videos rendering", () => {
  it("keeps video image picking compact inside the videos tab", () => {
    const scrollIntoView = vi.fn()
    const galleryNode = document.createElement("div")
    galleryNode.scrollIntoView = scrollIntoView
    vi.spyOn(document, "getElementById").mockReturnValue(galleryNode)

    const messages = [
      {
        id: "assistant-video-1",
        role: "assistant",
        parts: [
          {
            type: "tool-generateVideo",
            output: {
              state: "choose_image",
              images: [
                { id: "img-1", imageUrl: "https://example.com/1.jpg", source: "ai_images" },
                { id: "img-2", imageUrl: "https://example.com/2.jpg", source: "ai_images" },
              ],
            },
          },
        ],
      },
    ] as unknown as UIMessage[]

    renderInterface(messages, { activeTab: "videos" })

    expect(screen.getByText(/Your photo picker is right below\./i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Show My Photos" })).toBeInTheDocument()
    expect(screen.queryByAltText("Video source")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Show My Photos" }))
    expect(scrollIntoView).toHaveBeenCalled()
  })
})

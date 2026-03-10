import React from "react"
import { render, screen } from "@testing-library/react"
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

function renderInterface(messages: UIMessage[], isCreatingFeed: boolean) {
  return render(
    <MayaChatInterface
      messages={messages}
      filteredMessages={messages}
      setMessages={vi.fn()}
      proMode={false}
      isTyping={false}
      isGeneratingConcepts={false}
      isGeneratingPro={false}
      isCreatingFeed={isCreatingFeed}
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
    />,
  )
}

describe("MayaChatInterface inline feed rendering", () => {
  it("does not leak split feed strategy JSON while the inline feed card is being created", () => {
    const messages = [
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "I mapped this into a clean 9-post layout for you.\n\n[CREATE_FEED_STRATEGY]\n```json\n{",
          },
          {
            type: "text",
            text: '"feedTitle":"Launch Feed",',
          },
          {
            type: "text",
            text: '"posts":[{"position":1,"visualDirection":"Editorial portrait"}]}\n```',
          },
        ],
      },
    ] as unknown as UIMessage[]

    renderInterface(messages, true)

    expect(screen.getByText("Creating Your Feed Layout")).toBeInTheDocument()
    expect(screen.queryByText(/feedTitle/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Editorial portrait/i)).not.toBeInTheDocument()
  })
})

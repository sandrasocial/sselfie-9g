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

function renderInterface(
  messages: UIMessage[],
  overrides: Partial<React.ComponentProps<typeof MayaChatInterface>> = {},
) {
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

describe("MayaChatInterface generate image confirmation", () => {
  it("requires an explicit confirm click after source selection", () => {
    const onSelectGenerationSource = vi.fn()
    const onConfirmGenerationSource = vi.fn()

    const messages = [
      {
        id: "assistant-generate-image",
        role: "assistant",
        parts: [
          {
            type: "tool-generateImage",
            output: {
              state: "ready",
              source: "choose_source",
            },
          },
        ],
      },
    ] as unknown as UIMessage[]

    renderInterface(messages, {
      userHasTrainedModel: true,
      linkedSelfieCount: 4,
      onToolSelectGenerationSource: onSelectGenerationSource,
      onToolConfirmGenerationSource: onConfirmGenerationSource,
    })

    fireEvent.click(screen.getByRole("button", { name: /my model/i }))

    expect(onSelectGenerationSource).toHaveBeenCalledWith("assistant-generate-image", "custom_model")
    expect(onConfirmGenerationSource).not.toHaveBeenCalled()
  })

  it("shows a confirm CTA once a source is selected", () => {
    const onSelectGenerationSource = vi.fn()
    const onConfirmGenerationSource = vi.fn()

    const messages = [
      {
        id: "assistant-selected-image",
        role: "assistant",
        parts: [
          {
            type: "tool-generateImage",
            output: {
              state: "ready",
              source: "base_model",
            },
          },
        ],
      },
    ] as unknown as UIMessage[]

    renderInterface(messages, {
      userHasTrainedModel: true,
      linkedSelfieCount: 2,
      onToolSelectGenerationSource: onSelectGenerationSource,
      onToolConfirmGenerationSource: onConfirmGenerationSource,
    })

    fireEvent.click(screen.getByRole("button", { name: /generate photo/i }))

    expect(onConfirmGenerationSource).toHaveBeenCalledWith("assistant-selected-image", "base_model")
  })
})

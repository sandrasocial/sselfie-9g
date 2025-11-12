"use client"
import { useChat } from "ai/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

export function BusinessAdvisorChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/admin/agent/business-advisor",
  })

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">Your Business Advisor is Ready</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ask me anything about scaling SSELFIE Studio, growth strategies, or revenue optimization.
              </p>
              <div className="grid gap-2 text-left text-sm">
                <p className="font-medium">Try asking:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>What are our biggest growth opportunities right now?</li>
                  <li>How can we increase our conversion rate from free to paid?</li>
                  <li>What pricing changes should we test?</li>
                  <li>How do we get to $1M ARR?</li>
                  <li>Should we focus on acquisition or retention?</li>
                </ul>
              </div>
            </Card>
          )}

          {messages.map((message) => (
            <Card
              key={message.id}
              className={`p-4 ${
                message.role === "user"
                  ? "ml-auto max-w-[80%] bg-primary text-primary-foreground"
                  : "mr-auto max-w-[80%]"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            </Card>
          ))}

          {isLoading && (
            <Card className="p-4 mr-auto max-w-[80%]">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-pulse">Thinking...</div>
              </div>
            </Card>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask your business advisor anything..."
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  )
}

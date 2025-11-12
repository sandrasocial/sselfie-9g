"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Knowledge {
  id: number
  category: string
  title: string
  content: string
  confidence_level: number
  related_tags: string[]
  created_at: string
}

export function KnowledgeList() {
  const [knowledge, setKnowledge] = useState<Knowledge[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchKnowledge()
  }, [])

  const fetchKnowledge = async () => {
    try {
      const response = await fetch("/api/admin/knowledge")
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      setKnowledge(data.knowledge || [])
    } catch (error) {
      console.error("Error fetching knowledge:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this knowledge?")) return

    try {
      const response = await fetch(`/api/admin/knowledge?id=${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete")
      fetchKnowledge()
    } catch (error) {
      console.error("Error deleting knowledge:", error)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Saved Knowledge</h2>
      {knowledge.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No knowledge saved yet. Add your first piece of information above.
        </Card>
      ) : (
        knowledge.map((item) => (
          <Card key={item.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{item.category}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(item.confidence_level * 100)}% confidence
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{item.content}</p>
                {item.related_tags && item.related_tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {item.related_tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive">
                Delete
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}

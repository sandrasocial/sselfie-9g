"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Copy, Trash2, Download, Check, Calendar, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const CONTENT_PILLARS = [
  { id: 'prompts', name: 'Prompts with Examples' },
  { id: 'story', name: 'My Story & Journey' },
  { id: 'future_self', name: 'Visualize Your Future Self' },
  { id: 'photoshoot', name: 'Brand Photoshoot Series' }
]

const OUTPUT_TYPES = [
  'Caption',
  'Text Overlay',
  'Reel Voiceover',
  'Hashtags',
  'Hook'
]

interface WritingOutput {
  id: string
  content_pillar: string
  output_type: string
  content: string
  context?: {
    userInput?: string
    promptsReferenced?: string[]
  }
  created_at: string
}

export function WritingAssistantHistory() {
  const [selectedPillar, setSelectedPillar] = useState<string>("all")
  const [selectedOutputType, setSelectedOutputType] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Build query params
  const queryParams = new URLSearchParams()
  if (selectedPillar !== "all") queryParams.append("pillar", selectedPillar)
  if (selectedOutputType !== "all") queryParams.append("outputType", selectedOutputType)
  if (startDate) queryParams.append("startDate", startDate)
  if (endDate) queryParams.append("endDate", endDate)

  const { data, error, mutate } = useSWR<{ outputs: WritingOutput[] }>(
    `/api/admin/writing-assistant/list?${queryParams.toString()}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const outputs = data?.outputs || []
  const isLoading = !error && !data

  // Filter outputs client-side (in case server-side filtering isn't complete)
  const filteredOutputs = useMemo(() => {
    return outputs.filter((output) => {
      if (selectedPillar !== "all" && output.content_pillar !== selectedPillar) return false
      if (selectedOutputType !== "all" && output.output_type !== selectedOutputType) return false
      
      if (startDate || endDate) {
        const outputDate = new Date(output.created_at)
        if (startDate && outputDate < new Date(startDate)) return false
        if (endDate && outputDate > new Date(endDate + "T23:59:59")) return false
      }
      
      return true
    })
  }, [outputs, selectedPillar, selectedOutputType, startDate, endDate])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      })
    }
  }

  const deleteOutput = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/writing-assistant/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete output")
      }

      toast({
        title: "Deleted",
        description: "Output deleted successfully",
      })
      
      mutate()
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete output",
        variant: "destructive"
      })
    }
  }

  const copyAllHashtags = async () => {
    const allHashtags = new Set<string>()
    
    filteredOutputs.forEach((output) => {
      // Extract hashtags from content
      const hashtagMatches = output.content.match(/#[\w]+/g)
      if (hashtagMatches) {
        hashtagMatches.forEach(tag => allHashtags.add(tag))
      }
    })

    if (allHashtags.size === 0) {
      toast({
        title: "No Hashtags",
        description: "No hashtags found in outputs",
        variant: "destructive"
      })
      return
    }

    const hashtagsText = Array.from(allHashtags).join(" ")
    await copyToClipboard(hashtagsText)
  }

  const exportToCSV = () => {
    const headers = ["ID", "Content Pillar", "Output Type", "Content", "Created At"]
    const rows = filteredOutputs.map((output) => [
      output.id,
      output.content_pillar,
      output.output_type,
      output.content.replace(/"/g, '""'), // Escape quotes
      new Date(output.created_at).toLocaleString(),
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => `"${row.join('","')}"`),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `writing-assistant-outputs-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast({
      title: "Exported!",
      description: "Outputs exported to CSV",
    })
  }

  const deleteSelected = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select outputs to delete",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/writing-assistant/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete outputs")
      }

      toast({
        title: "Deleted",
        description: `${selectedIds.size} output(s) deleted successfully`,
      })
      
      mutate()
      setSelectedIds(new Set())
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete outputs",
        variant: "destructive"
      })
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOutputs.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredOutputs.map((o) => o.id)))
    }
  }

  const clearFilters = () => {
    setSelectedPillar("all")
    setSelectedOutputType("all")
    setStartDate("")
    setEndDate("")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-stone-600">Loading outputs...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-red-600">Error loading outputs: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Saved Outputs</h2>
          <p className="text-sm text-stone-600 mt-1">
            {filteredOutputs.length} output{filteredOutputs.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteSelected}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={copyAllHashtags}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy All Hashtags
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-stone-600" />
          <h3 className="font-medium text-stone-900">Filters</h3>
          {(selectedPillar !== "all" || selectedOutputType !== "all" || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">
              Content Pillar
            </label>
            <Select value={selectedPillar} onValueChange={setSelectedPillar}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pillars</SelectItem>
                {CONTENT_PILLARS.map((pillar) => (
                  <SelectItem key={pillar.id} value={pillar.id}>
                    {pillar.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">
              Output Type
            </label>
            <Select value={selectedOutputType} onValueChange={setSelectedOutputType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {OUTPUT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Outputs List */}
      {filteredOutputs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600">No outputs found. Try adjusting your filters.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredOutputs.length && filteredOutputs.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-stone-300"
            />
            <span className="text-sm text-stone-600">
              Select all ({selectedIds.size} selected)
            </span>
          </div>

          {filteredOutputs.map((output) => (
            <Card key={output.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(output.id)}
                      onChange={() => toggleSelect(output.id)}
                      className="rounded border-stone-300 mt-1"
                    />
                    <Badge>{output.content_pillar}</Badge>
                    <Badge variant="outline">{output.output_type}</Badge>
                    <span className="text-xs text-stone-500 ml-auto">
                      {new Date(output.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-stone-900 mt-2 whitespace-pre-wrap">
                    {output.content.length > 200
                      ? `${output.content.slice(0, 200)}...`
                      : output.content}
                  </p>
                  {output.content.length > 200 && (
                    <button
                      onClick={() => {
                        const fullContent = document.createElement("div")
                        fullContent.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        fullContent.innerHTML = `
                          <div class="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-auto">
                            <div class="flex justify-between items-center mb-4">
                              <h3 class="font-semibold">Full Content</h3>
                              <button onclick="this.closest('.fixed').remove()" class="text-stone-500 hover:text-stone-900">✕</button>
                            </div>
                            <pre class="whitespace-pre-wrap text-sm">${output.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
                          </div>
                        `
                        document.body.appendChild(fullContent)
                        fullContent.querySelector("button")?.addEventListener("click", () => {
                          fullContent.remove()
                        })
                      }}
                      className="text-xs text-stone-600 hover:text-stone-900 mt-1 underline"
                    >
                      View full content
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(output.content)}
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteOutput(output.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

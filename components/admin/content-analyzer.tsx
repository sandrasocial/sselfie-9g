"use client"

import { useState } from "react"
import { Upload, LinkIcon, Video, CheckCircle, XCircle } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import LoadingSpinner from "@/components/sselfie/loading-spinner"

interface ContentAnalyzerProps {
  onAnalyzed: (analysis: string) => void
}

export function ContentAnalyzer({ onAnalyzed }: ContentAnalyzerProps) {
  const [inputType, setInputType] = useState<"upload" | "url">("url")
  const [url, setUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[v0] File input change triggered", e.target.files)
    
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      
      console.log("[v0] Selected file:", {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size
      })
      
      // Validate file type
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi', 'audio/mpeg', 'audio/wav', 'audio/mp3']
      const isValidType = validTypes.some(type => selectedFile.type.includes(type.split('/')[1]))
      
      if (!isValidType && !selectedFile.type.includes('video') && !selectedFile.type.includes('audio')) {
        console.log("[v0] Invalid file type:", selectedFile.type)
        toast({
          title: "Invalid file type",
          description: "Please upload a video (MP4, MOV, AVI) or audio file (MP3, WAV)",
          variant: "destructive"
        })
        return
      }
      
      const fileSizeMB = selectedFile.size / (1024 * 1024)
      const isVideo = selectedFile.type.startsWith('video/')
      
      if (fileSizeMB > 25) {
        console.log("[v0] File too large for transcription:", fileSizeMB, "MB")
        toast({
          title: "File too large for transcription",
          description: isVideo 
            ? "Videos must be under 25MB. Try:\n• Upload just the audio track\n• Use a video URL instead\n• Upload a shorter clip"
            : "Audio files must be under 25MB for transcription",
          variant: "destructive"
        })
        return
      }
      
      console.log("[v0] File validated successfully")
      setFile(selectedFile)
      
      toast({
        title: "File selected",
        description: `${selectedFile.name} (${fileSizeMB.toFixed(1)}MB) ready to analyze`,
      })
    }
  }

  const handleAnalyze = async () => {
    console.log("[v0] Analyze clicked", { inputType, url, file })
    
    if (inputType === "url" && !url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a post or video URL",
        variant: "destructive"
      })
      return
    }
    
    if (inputType === "upload" && !file) {
      toast({
        title: "File required",
        description: "Please select a video or audio file",
        variant: "destructive"
      })
      return
    }

    setIsAnalyzing(true)
    setAnalysis(null)

    try {
      let transcription = ""
      let contentType = ""
      let sourceUrl = ""
      
      if (inputType === "url") {
        console.log("[v0] Analyzing URL:", url)
        
        // Analyze URL-based content
        const response = await fetch("/api/admin/agent/analyze-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, type: "url" }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("[v0] URL analysis failed:", errorData)
          throw new Error(errorData.error || "Failed to analyze content")
        }

        const data = await response.json()
        console.log("[v0] URL analysis result:", data)
        
        transcription = data.transcription
        contentType = data.contentType
        sourceUrl = url
      } else {
        console.log("[v0] Uploading and analyzing file:", file?.name)
        
        // Upload and analyze file
        const formData = new FormData()
        formData.append("file", file!)

        console.log("[v0] FormData created, sending request...")

        const uploadResponse = await fetch("/api/admin/agent/analyze-content", {
          method: "POST",
          body: formData,
        })

        console.log("[v0] Upload response status:", uploadResponse.status)

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          console.error("[v0] File upload failed:", errorData)
          throw new Error(errorData.error || "Failed to upload and analyze file")
        }

        const data = await uploadResponse.json()
        console.log("[v0] File analysis result:", data)
        
        transcription = data.transcription
        contentType = data.contentType
        sourceUrl = data.fileUrl
      }

      // Format the analysis for the chat
      const analysisText = `
📊 CONTENT ANALYSIS

Source: ${sourceUrl}
Type: ${contentType}

Transcription:
${transcription}

---

Please recreate this content matching my brand voice, audience, and storytelling style. Consider:
- My authentic, conversational tone
- My target audience (entrepreneurs and content creators)
- My brand pillars and messaging
- How to adapt this for Instagram posts and captions
`

      console.log("[v0] Analysis formatted, calling onAnalyzed callback")
      
      setAnalysis(analysisText)
      onAnalyzed(analysisText)
      
      toast({
        title: "Content analyzed!",
        description: "Analysis added to your chat. The AI will now recreate it in your voice.",
      })
      
      // Reset form
      setFile(null)
      setUrl("")
      
    } catch (error: any) {
      console.error("[v0] Analysis error:", error)
      toast({
        title: "Analysis failed",
        description: error.message || "Something went wrong",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 uppercase text-stone-950" style={{ letterSpacing: "0.1em" }}>
          Content Analyzer
        </h3>
        <p className="text-sm text-stone-600 mb-4">
          Upload videos, paste post URLs or video links. AI will analyze and recreate content in your voice.
        </p>
      </div>

      {/* Input Type Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setInputType("url")
            setFile(null)
          }}
          className={`flex-1 px-4 py-2 rounded-lg text-sm uppercase font-medium transition-colors ${
            inputType === "url"
              ? "bg-stone-950 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
          style={{ letterSpacing: "0.1em" }}
        >
          <LinkIcon className="w-4 h-4 inline-block mr-2" />
          URL
        </button>
        <button
          onClick={() => {
            setInputType("upload")
            setUrl("")
          }}
          className={`flex-1 px-4 py-2 rounded-lg text-sm uppercase font-medium transition-colors ${
            inputType === "upload"
              ? "bg-stone-950 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
          style={{ letterSpacing: "0.1em" }}
        >
          <Upload className="w-4 h-4 inline-block mr-2" />
          Upload
        </button>
      </div>

      {/* URL Input */}
      {inputType === "url" && (
        <div className="space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://instagram.com/p/... or https://youtube.com/watch?v=..."
            className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-950 focus:border-transparent"
          />
          <p className="text-xs text-stone-500">
            Supports: Instagram posts, YouTube videos, TikTok, Twitter/X posts
          </p>
        </div>
      )}

      {/* File Upload */}
      {inputType === "upload" && (
        <div className="space-y-3">
          <input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            accept="video/*,audio/*,.mp4,.mov,.avi,.mp3,.wav"
            className="hidden"
          />
          <label htmlFor="file-upload" className="block cursor-pointer">
            <div className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center hover:border-stone-400 hover:bg-stone-50 transition-all">
              <Upload className="w-12 h-12 mx-auto mb-3 text-stone-400" />
              <p className="text-sm font-medium text-stone-700 mb-1">
                {file ? `✓ ${file.name}` : "Click to select video or audio file"}
              </p>
              <p className="text-xs text-stone-500">
                MP4, MOV, AVI, MP3, WAV (max 25MB for transcription)
              </p>
              <p className="text-xs text-stone-400 mt-1">
                For larger videos, use URL option instead
              </p>
            </div>
          </label>
          {file && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900 truncate">{file.name}</p>
                <p className="text-xs text-green-700">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB - Ready to analyze
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  setFile(null)
                }}
                className="text-green-600 hover:text-green-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Analyze Button */}
      <Button
        onClick={handleAnalyze}
        disabled={isAnalyzing || (inputType === "url" && !url) || (inputType === "upload" && !file)}
        className="w-full px-6 py-3 bg-stone-950 text-white rounded-lg text-sm uppercase font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{ letterSpacing: "0.1em" }}
      >
        {isAnalyzing ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            Analyzing...
          </>
        ) : (
          <>
            <Video className="w-4 h-4 inline-block mr-2" />
            Analyze Content
          </>
        )}
      </Button>

      {/* Analysis Result Preview */}
      {analysis && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-900 mb-1">Analysis Complete</p>
              <p className="text-xs text-green-700">
                Content analysis has been added to your chat. Ask the AI to recreate it in your voice!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

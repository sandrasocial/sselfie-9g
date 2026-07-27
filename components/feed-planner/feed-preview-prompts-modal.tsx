"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import type { FeedPost } from "./feed-preview-types"

interface FeedPreviewPromptsModalProps {
  open: boolean
  posts: FeedPost[]
  messageId?: string
  onPromptUpdate?: (messageId: string, postId: number, newPrompt: string) => void
  onClose: () => void
}

export default function FeedPreviewPromptsModal({
  open,
  posts,
  messageId,
  onPromptUpdate,
  onClose,
}: FeedPreviewPromptsModalProps) {
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [editedPrompts, setEditedPrompts] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!open) {
      setEditingPostId(null)
      setEditedPrompts({})
    }
  }, [open])

  if (!open || typeof window === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Feed Prompts</h3>
            <p className="text-sm text-stone-500 mt-1">Review prompts before generating</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors" aria-label="Close">
            <span className="text-[10px] uppercase tracking-[0.16em] text-stone-600">Close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id || post.position} className="border border-stone-200 rounded-lg overflow-hidden">
                <div className="bg-stone-50 px-4 py-3 border-b border-stone-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white border border-stone-300 flex items-center justify-center">
                        <span className="text-xs font-medium text-stone-700">{post.position}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-900">Post {post.position}</p>
                        <p className="text-xs text-stone-500">{post.post_type || "Portrait"} • {post.content_pillar || "Feed post"}</p>
                      </div>
                    </div>
                    {post.image_url && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-stone-200">
                        <Image
                          src={post.image_url}
                          alt={`Post ${post.position}`}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-white">
                  {post.prompt || editedPrompts[post.id] ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-stone-700 uppercase tracking-wider">Prompt</p>
                        {!editingPostId && onPromptUpdate && messageId && (
                          <button
                            onClick={() => {
                              setEditingPostId(post.id)
                              setEditedPrompts((prev) => ({ ...prev, [post.id]: editedPrompts[post.id] || post.prompt || "" }))
                            }}
                            className="text-xs text-stone-600 hover:text-stone-900 px-2 py-1 border border-stone-300 rounded hover:bg-stone-50 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        {editingPostId === post.id && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const newPrompt = editedPrompts[post.id] || post.prompt || ""
                                if (onPromptUpdate && messageId && newPrompt.trim() !== (post.prompt || "")) {
                                  onPromptUpdate(messageId, post.id, newPrompt.trim())
                                }
                                setEditingPostId(null)
                              }}
                              className="text-xs text-white bg-stone-900 hover:bg-stone-800 px-3 py-1 rounded transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingPostId(null)
                                setEditedPrompts((prev) => {
                                  const next = { ...prev }
                                  delete next[post.id]
                                  return next
                                })
                              }}
                              className="text-xs text-stone-600 hover:text-stone-900 px-3 py-1 border border-stone-300 rounded hover:bg-stone-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                        {editingPostId === post.id ? (
                          <textarea
                            value={editedPrompts[post.id] || post.prompt || ""}
                            onChange={(e) => {
                              setEditedPrompts((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }}
                            className="w-full resize-none text-xs text-stone-700 font-mono leading-relaxed bg-transparent border-none outline-none min-h-[150px]"
                            rows={8}
                            autoFocus
                          />
                        ) : (
                          <p className="text-xs text-stone-700 font-mono leading-relaxed whitespace-pre-wrap">
                            {editedPrompts[post.id] || post.prompt}
                          </p>
                        )}
                      </div>

                      {!editingPostId && (
                        <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                          <span>{(editedPrompts[post.id] || post.prompt || "").length} characters</span>
                          <span>
                            {(editedPrompts[post.id] || post.prompt || "").split(/\s+/).filter((w) => w.length > 0).length} words
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-xs text-amber-800">No prompt available for this post</p>
                    </div>
                  )}
                </div>

                {post.caption && (
                  <div className="px-4 pb-4">
                    <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Caption Preview</p>
                    <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">{post.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50">
          <p className="text-xs text-stone-500">{posts.filter((p) => p.prompt).length} of {posts.length} prompts ready</p>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.16em] opacity-80">View</span>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

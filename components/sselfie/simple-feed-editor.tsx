"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Plus, Trash2, ImageIcon, Upload, GripVertical, User } from "lucide-react"
import useSWR, { mutate } from "swr"
import ImageGalleryModal from "./image-gallery-modal"

interface SimpleFeedEditorProps {
  isOpen: boolean
  onClose: () => void
  feedId?: number
}

interface FeedPost {
  id: number
  position: number
  image_url: string | null
  caption: string | null
  prompt: string | null
}

interface FeedProfile {
  profile_image_url: string | null
  bio_text: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SimpleFeedEditor({ isOpen, onClose, feedId }: SimpleFeedEditorProps) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [bio, setBio] = useState<string>("")
  const [editingBio, setEditingBio] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [editingCaption, setEditingCaption] = useState<number | null>(null)
  const [showGallery, setShowGallery] = useState(false)
  const [selectedPostForImage, setSelectedPostForImage] = useState<number | null>(null)
  const [isSelectingProfileImage, setIsSelectingProfileImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { data: feedData } = useSWR(isOpen && feedId ? `/api/feed/${feedId}` : null, fetcher)

  const { data: galleryData } = useSWR("/api/gallery/images", fetcher)

  useEffect(() => {
    if (feedData) {
      if (feedData.posts) {
        setPosts(feedData.posts.sort((a: FeedPost, b: FeedPost) => a.position - b.position))
      }
      if (feedData.profile_image_url) {
        setProfileImage(feedData.profile_image_url)
      }
      if (feedData.bio?.bio_text) {
        setBio(feedData.bio.bio_text)
      }
    }
  }, [feedData])

  useEffect(() => {
    if (!feedId || !isOpen) return

    const timeoutId = setTimeout(async () => {
      if (bio !== feedData?.bio?.bio_text) {
        try {
          await fetch(`/api/feed/${feedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bio }),
          })
          mutate(`/api/feed/${feedId}`)
          mutate("/api/feed/latest")
        } catch (error) {
          console.error("[v0] Error auto-saving bio:", error)
        }
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [bio, feedId, isOpen, feedData])

  const handleCaptionChange = (postId: number, newCaption: string) => {
    setPosts(posts.map((post) => (post.id === postId ? { ...post, caption: newCaption } : post)))

    setTimeout(async () => {
      try {
        await fetch(`/api/feed/${feedId}/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posts: posts.map((p) => (p.id === postId ? { ...p, caption: newCaption } : p)) }),
        })
        mutate(`/api/feed/${feedId}`)
        mutate("/api/feed/latest")
      } catch (error) {
        console.error("[v0] Error auto-saving caption:", error)
      }
    }, 1000)
  }

  const handleDeletePost = (postId: number) => {
    setPosts(posts.filter((post) => post.id !== postId))
  }

  const handleAddPost = () => {
    const newPost: FeedPost = {
      id: Date.now(), // Temporary ID
      position: posts.length,
      image_url: null,
      caption: "",
      prompt: "",
    }
    setPosts([...posts, newPost])
  }

  const handleSelectImageFromGallery = async (imageUrl: string) => {
    if (isSelectingProfileImage) {
      setProfileImage(imageUrl)
      setShowGallery(false)
      setIsSelectingProfileImage(false)

      try {
        await fetch(`/api/feed/${feedId}/profile-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileImageUrl: imageUrl }),
        })
        mutate(`/api/feed/${feedId}`)
        mutate("/api/feed/latest")
      } catch (error) {
        console.error("[v0] Error saving profile image:", error)
      }
    } else if (selectedPostForImage !== null) {
      setPosts(posts.map((post) => (post.id === selectedPostForImage ? { ...post, image_url: imageUrl } : post)))
      setShowGallery(false)
      setSelectedPostForImage(null)

      setTimeout(async () => {
        try {
          await fetch(`/api/feed/${feedId}/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ posts }),
          })
          mutate(`/api/feed/${feedId}`)
          mutate("/api/feed/latest")
        } catch (error) {
          console.error("[v0] Error auto-saving post image:", error)
        }
      }, 500)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts }),
      })

      if (response.ok) {
        mutate(`/api/feed/${feedId}`)
        mutate("/api/feed-designer/preview")
        onClose()
      }
    } catch (error) {
      console.error("[v0] Error saving feed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      const newPosts = [...posts]
      const [draggedPost] = newPosts.splice(draggedIndex, 1)
      newPosts.splice(index, 0, draggedPost)
      setPosts(newPosts)
      setDraggedIndex(index)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-xl overflow-y-auto">
      <div className="min-h-screen p-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-['Times_New_Roman'] text-3xl sm:text-4xl md:text-5xl font-extralight tracking-[0.2em] uppercase text-white mb-2">
                EDIT YOUR FEED
              </h1>
              <p className="text-sm text-white/60 font-light tracking-wider">
                Changes save automatically • Drag to rearrange • Click to edit
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300"
            >
              <X size={20} className="text-white" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <h2 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.15em] uppercase text-white mb-6">
              PROFILE
            </h2>

            <div className="flex flex-col sm:flex-row gap-6">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-stone-900/50 border-2 border-white/20 relative group">
                  {profileImage ? (
                    <>
                      <img
                        src={profileImage || "/placeholder.svg"}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button
                          onClick={() => {
                            setIsSelectingProfileImage(true)
                            setShowGallery(true)
                          }}
                          className="text-white text-xs font-light tracking-wider"
                        >
                          Change
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setIsSelectingProfileImage(true)
                        setShowGallery(true)
                      }}
                      className="w-full h-full flex flex-col items-center justify-center text-white/60 hover:text-white transition-colors"
                    >
                      <User size={24} strokeWidth={1.5} />
                      <span className="text-xs mt-1">Add</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="flex-1">
                <label className="block text-xs text-white/60 font-light tracking-wider mb-2">BIO</label>
                {editingBio ? (
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    onBlur={() => setEditingBio(false)}
                    placeholder="Write your bio..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/40 font-light focus:outline-none focus:border-white/40 resize-none"
                    rows={3}
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setEditingBio(true)}
                    className="w-full text-left text-sm text-white/80 font-light hover:text-white transition-colors bg-white/5 border border-white/20 rounded-lg px-4 py-3 min-h-[80px]"
                  >
                    {bio || "Click to add bio..."}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Modal */}
        {showGallery && (
          <ImageGalleryModal
            images={galleryData?.images || []}
            onSelect={handleSelectImageFromGallery}
            onClose={() => {
              setShowGallery(false)
              setSelectedPostForImage(null)
              setIsSelectingProfileImage(false)
            }}
          />
        )}

        {/* Feed Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, index) => (
              <div
                key={post.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20 transition-all duration-300 ${
                  draggedIndex === index ? "opacity-50 scale-95" : "hover:border-white/40"
                }`}
              >
                {/* Drag Handle */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between cursor-move">
                  <div className="flex items-center gap-2">
                    <GripVertical size={16} className="text-white/40" strokeWidth={1.5} />
                    <span className="text-xs text-white/60 font-light tracking-wider">POST {index + 1}</span>
                  </div>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={14} className="text-red-400" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Image */}
                <div className="aspect-square bg-stone-900/50 relative group">
                  {post.image_url ? (
                    <>
                      <img
                        src={post.image_url || "/placeholder.svg"}
                        alt={`Post ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedPostForImage(post.id)
                            setShowGallery(true)
                          }}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-light tracking-wider transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                      <button
                        onClick={() => {
                          setSelectedPostForImage(post.id)
                          setShowGallery(true)
                        }}
                        className="flex flex-col items-center gap-2 text-white/60 hover:text-white transition-colors"
                      >
                        <ImageIcon size={32} strokeWidth={1.5} />
                        <span className="text-sm font-light tracking-wider">Add from Gallery</span>
                      </button>
                      <button className="flex flex-col items-center gap-2 text-white/60 hover:text-white transition-colors">
                        <Upload size={32} strokeWidth={1.5} />
                        <span className="text-sm font-light tracking-wider">Upload Image</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Caption */}
                <div className="p-4">
                  {editingCaption === post.id ? (
                    <textarea
                      value={post.caption || ""}
                      onChange={(e) => handleCaptionChange(post.id, e.target.value)}
                      onBlur={() => setEditingCaption(null)}
                      placeholder="Write a caption..."
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 font-light focus:outline-none focus:border-white/40 resize-none"
                      rows={3}
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setEditingCaption(post.id)}
                      className="w-full text-left text-sm text-white/80 font-light hover:text-white transition-colors"
                    >
                      {post.caption || "Click to add caption..."}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add Post Button */}
            <button
              onClick={handleAddPost}
              className="aspect-square bg-white/5 backdrop-blur-xl rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 hover:bg-white/10 transition-all duration-300 flex flex-col items-center justify-center gap-3 group"
            >
              <Plus size={32} className="text-white/40 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
              <span className="text-sm text-white/40 group-hover:text-white/60 font-light tracking-wider transition-colors">
                Add Post
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

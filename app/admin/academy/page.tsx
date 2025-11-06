"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  order_index: number
  status: string
  lesson_count: number
  enrollment_count: number
}

interface Lesson {
  id: string
  course_id: string
  title: string
  description: string | null
  lesson_type: string
  video_url: string | null
  duration_seconds: number
  order_index: number
}

export default function AdminAcademyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<"courses" | "templates" | "monthly-drops" | "flatlay-images">("courses")

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])

  const [templates, setTemplates] = useState<any[]>([])
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null)
  const [templateForm, setTemplateForm] = useState({
    title: "",
    description: "",
    thumbnail_url: "",
    resource_type: "canva",
    resource_url: "",
    category: "",
    order_index: 0,
    status: "draft",
  })

  const [monthlyDrops, setMonthlyDrops] = useState<any[]>([])
  const [dropDialogOpen, setDropDialogOpen] = useState(false)
  const [editingDrop, setEditingDrop] = useState<any | null>(null)
  const [dropForm, setDropForm] = useState({
    title: "",
    description: "",
    thumbnail_url: "",
    resource_type: "canva",
    resource_url: "",
    month: "",
    category: "",
    order_index: 0,
    status: "draft",
  })

  const [flatlayImages, setFlatlayImages] = useState<any[]>([])
  const [flatlayDialogOpen, setFlatlayDialogOpen] = useState(false)
  const [editingFlatlay, setEditingFlatlay] = useState<any | null>(null)
  const [flatlayForm, setFlatlayForm] = useState({
    title: "",
    description: "",
    thumbnail_url: "",
    resource_type: "image",
    resource_url: "",
    order_index: 0,
    status: "draft",
  })

  const [saving, setSaving] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingTemplateThumbnail, setUploadingTemplateThumbnail] = useState(false)
  const [uploadingDropThumbnail, setUploadingDropThumbnail] = useState(false)
  const [uploadingFlatlayThumbnail, setUploadingFlatlayThumbnail] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false) // Added: uploadingThumbnail state
  const [uploadProgress, setUploadProgress] = useState<string>("")

  // Course state and form
  const [courseDialogOpen, setCourseDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    thumbnail_url: "",
    order_index: 0,
    status: "draft",
  })

  // Lesson state and form
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    video_url: "",
    duration_seconds: 0,
    order_index: 0,
  })

  const [templateThumbnailPosition, setTemplateThumbnailPosition] = useState({ x: 50, y: 50 })
  const [dropThumbnailPosition, setDropThumbnailPosition] = useState({ x: 50, y: 50 })
  const [flatlayThumbnailPosition, setFlatlayThumbnailPosition] = useState({ x: 50, y: 50 })
  const [courseThumbnailPosition, setCourseThumbnailPosition] = useState({ x: 50, y: 50 })

  useEffect(() => {
    fetchCourses()
    fetchTemplates()
    fetchMonthlyDrops()
    fetchFlatlayImages()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/admin/academy/courses", {
        credentials: "include",
      })

      if (response.status === 403) {
        router.push("/")
        return
      }

      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses)
      }
    } catch (error) {
      console.error("[v0] Error fetching courses:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLessons = async (courseId: string) => {
    try {
      const response = await fetch(`/api/admin/academy/lessons?courseId=${courseId}`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setLessons(data.lessons)
      }
    } catch (error) {
      console.error("[v0] Error fetching lessons:", error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/admin/academy/templates", {
        credentials: "include",
      })

      if (response.status === 403) {
        router.push("/")
        return
      }

      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error("[v0] Error fetching templates:", error)
    }
  }

  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setTemplateForm({
      title: "",
      description: "",
      thumbnail_url: "",
      resource_type: "canva",
      resource_url: "",
      category: "",
      order_index: templates.length,
      status: "draft",
    })
    setTemplateDialogOpen(true)
  }

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template)
    setTemplateForm({
      title: template.title,
      description: template.description || "",
      thumbnail_url: template.thumbnail_url || "",
      resource_type: template.resource_type,
      resource_url: template.resource_url,
      category: template.category || "",
      order_index: template.order_index,
      status: template.status,
    })
    setTemplateThumbnailPosition({
      x: template.thumbnail_position_x || 50,
      y: template.thumbnail_position_y || 50,
    })
    setTemplateDialogOpen(true)
  }

  const handleSaveTemplate = async () => {
    setSaving(true)
    try {
      const url = editingTemplate
        ? `/api/admin/academy/templates/${editingTemplate.id}`
        : "/api/admin/academy/templates"

      const method = editingTemplate ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...templateForm,
          thumbnail_position_x: templateThumbnailPosition.x,
          thumbnail_position_y: templateThumbnailPosition.y,
        }),
      })

      if (response.ok) {
        setTemplateDialogOpen(false)
        fetchTemplates()
      }
    } catch (error) {
      console.error("[v0] Error saving template:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return

    try {
      const response = await fetch(`/api/admin/academy/templates/${templateId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error("[v0] Error deleting template:", error)
    }
  }

  const fetchMonthlyDrops = async () => {
    try {
      const response = await fetch("/api/admin/academy/monthly-drops", {
        credentials: "include",
      })

      if (response.status === 403) {
        router.push("/")
        return
      }

      if (response.ok) {
        const data = await response.json()
        setMonthlyDrops(data.monthlyDrops)
      }
    } catch (error) {
      console.error("[v0] Error fetching monthly drops:", error)
    }
  }

  const fetchFlatlayImages = async () => {
    try {
      const response = await fetch("/api/admin/academy/flatlay-images", {
        credentials: "include",
      })

      if (response.status === 403) {
        router.push("/")
        return
      }

      if (response.ok) {
        const data = await response.json()
        setFlatlayImages(data.flatlayImages)
      }
    } catch (error) {
      console.error("[v0] Error fetching flatlay images:", error)
    }
  }

  const handleCreateDrop = () => {
    setEditingDrop(null)
    setDropForm({
      title: "",
      description: "",
      thumbnail_url: "",
      resource_type: "canva",
      resource_url: "",
      month: "",
      category: "",
      order_index: monthlyDrops.length,
      status: "draft",
    })
    setDropDialogOpen(true)
  }

  const handleEditDrop = (drop: any) => {
    setEditingDrop(drop)
    setDropForm({
      title: drop.title,
      description: drop.description || "",
      thumbnail_url: drop.thumbnail_url || "",
      resource_type: drop.resource_type,
      resource_url: drop.resource_url,
      month: drop.month,
      category: drop.category || "",
      order_index: drop.order_index,
      status: drop.status,
    })
    setDropThumbnailPosition({
      x: drop.thumbnail_position_x || 50,
      y: drop.thumbnail_position_y || 50,
    })
    setDropDialogOpen(true)
  }

  const handleSaveDrop = async () => {
    setSaving(true)
    try {
      const url = editingDrop
        ? `/api/admin/academy/monthly-drops/${editingDrop.id}`
        : "/api/admin/academy/monthly-drops"

      const method = editingDrop ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...dropForm,
          thumbnail_position_x: dropThumbnailPosition.x,
          thumbnail_position_y: dropThumbnailPosition.y,
        }),
      })

      if (response.ok) {
        setDropDialogOpen(false)
        fetchMonthlyDrops()
      }
    } catch (error) {
      console.error("[v0] Error saving monthly drop:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDrop = async (dropId: string) => {
    if (!confirm("Are you sure you want to delete this monthly drop?")) return

    try {
      const response = await fetch(`/api/admin/academy/monthly-drops/${dropId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        fetchMonthlyDrops()
      }
    } catch (error) {
      console.error("[v0] Error deleting monthly drop:", error)
    }
  }

  const handleCreateFlatlay = () => {
    setEditingFlatlay(null)
    setFlatlayForm({
      title: "",
      description: "",
      thumbnail_url: "",
      resource_type: "image",
      resource_url: "",
      order_index: flatlayImages.length,
      status: "draft",
    })
    setFlatlayDialogOpen(true)
  }

  const handleEditFlatlay = (flatlay: any) => {
    setEditingFlatlay(flatlay)
    setFlatlayForm({
      title: flatlay.title,
      description: flatlay.description || "",
      thumbnail_url: flatlay.thumbnail_url || "",
      resource_type: flatlay.resource_type,
      resource_url: flatlay.resource_url,
      order_index: flatlay.order_index,
      status: flatlay.status,
    })
    setFlatlayThumbnailPosition({
      x: flatlay.thumbnail_position_x || 50,
      y: flatlay.thumbnail_position_y || 50,
    })
    setFlatlayDialogOpen(true)
  }

  const handleSaveFlatlay = async () => {
    setSaving(true)
    console.log("[v0] Saving flatlay image:", flatlayForm)
    try {
      const url = editingFlatlay
        ? `/api/admin/academy/flatlay-images/${editingFlatlay.id}`
        : "/api/admin/academy/flatlay-images"

      const method = editingFlatlay ? "PATCH" : "POST"

      console.log("[v0] Request URL:", url)
      console.log("[v0] Request method:", method)

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...flatlayForm,
          thumbnail_position_x: flatlayThumbnailPosition.x,
          thumbnail_position_y: flatlayThumbnailPosition.y,
        }),
      })

      console.log("[v0] Response status:", response.status)

      if (response.ok) {
        console.log("[v0] Flatlay image saved successfully")
        setFlatlayDialogOpen(false)
        fetchFlatlayImages()
      } else {
        const errorData = await response.json()
        console.error("[v0] Error response:", errorData)
      }
    } catch (error) {
      console.error("[v0] Error saving flatlay image:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFlatlay = async (flatlayId: string) => {
    if (!confirm("Are you sure you want to delete this flatlay image?")) return

    try {
      const response = await fetch(`/api/admin/academy/flatlay-images/${flatlayId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        fetchFlatlayImages()
      }
    } catch (error) {
      console.error("[v0] Error deleting flatlay image:", error)
    }
  }

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course)
    fetchLessons(course.id)
  }

  const handleCreateCourse = () => {
    setEditingCourse(null)
    setCourseForm({
      title: "",
      description: "",
      thumbnail_url: "",
      order_index: courses.length,
      status: "draft",
    })
    setCourseDialogOpen(true)
  }

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course)
    setCourseForm({
      title: course.title,
      description: course.description || "",
      thumbnail_url: course.thumbnail_url || "",
      order_index: course.order_index,
      status: course.status,
    })
    setCourseThumbnailPosition({
      x: (course as any).thumbnail_position_x || 50,
      y: (course as any).thumbnail_position_y || 50,
    })
    setCourseDialogOpen(true)
  }

  const handleSaveCourse = async () => {
    setSaving(true)
    try {
      const url = editingCourse ? `/api/admin/academy/courses/${editingCourse.id}` : "/api/admin/academy/courses"

      const method = editingCourse ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...courseForm,
          thumbnail_position_x: courseThumbnailPosition.x,
          thumbnail_position_y: courseThumbnailPosition.y,
        }),
      })

      if (response.ok) {
        setCourseDialogOpen(false)
        fetchCourses()
      }
    } catch (error) {
      console.error("[v0] Error saving course:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return

    try {
      const response = await fetch(`/api/admin/academy/courses/${courseId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        fetchCourses()
        if (selectedCourse?.id === courseId) {
          setSelectedCourse(null)
          setLessons([])
        }
      }
    } catch (error) {
      console.error("[v0] Error deleting course:", error)
    }
  }

  const handleCreateLesson = () => {
    if (!selectedCourse) return

    setEditingLesson(null)
    setLessonForm({
      title: "",
      description: "",
      video_url: "",
      duration_seconds: 0,
      order_index: lessons.length,
    })
    setLessonDialogOpen(true)
  }

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson)
    setLessonForm({
      title: lesson.title,
      description: lesson.description || "",
      video_url: lesson.video_url || "",
      duration_seconds: lesson.duration_seconds,
      order_index: lesson.order_index,
    })
    setLessonDialogOpen(true)
  }

  const handleSaveLesson = async () => {
    if (!selectedCourse) return

    setSaving(true)
    try {
      const url = editingLesson ? `/api/admin/academy/lessons/${editingLesson.id}` : "/api/admin/academy/lessons"

      const method = editingLesson ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...lessonForm,
          course_id: selectedCourse.id,
          lesson_type: "video",
        }),
      })

      if (response.ok) {
        setLessonDialogOpen(false)
        fetchLessons(selectedCourse.id)
      }
    } catch (error) {
      console.error("[v0] Error saving lesson:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return

    try {
      const response = await fetch(`/api/admin/academy/lessons/${lessonId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok && selectedCourse) {
        fetchLessons(selectedCourse.id)
      }
    } catch (error) {
      console.error("[v0] Error deleting lesson:", error)
    }
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 500 * 1024 * 1024 // 500MB
    if (file.size > maxSize) {
      const sizeMB = Math.round(file.size / 1024 / 1024)
      setUploadProgress(`File too large (${sizeMB}MB). Max 500MB. Use YouTube (unlisted) or Vimeo for larger videos.`)
      setTimeout(() => setUploadProgress(""), 5000)
      return
    }

    setUploadingVideo(true)
    setUploadProgress(`Uploading video: ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setLessonForm({ ...lessonForm, video_url: data.url })
        setUploadProgress("Video uploaded successfully!")
        setTimeout(() => setUploadProgress(""), 2000)
      } else {
        const errorData = await response.json()
        const errorMsg = errorData.error || "Upload failed"
        const suggestion = errorData.suggestion || "Please try again or use a video URL instead."
        setUploadProgress(`${errorMsg}. ${suggestion}`)
        setTimeout(() => setUploadProgress(""), 8000)
      }
    } catch (error) {
      console.error("[v0] Error uploading video:", error)
      setUploadProgress("Upload failed. For large videos, use YouTube (unlisted) or Vimeo instead.")
      setTimeout(() => setUploadProgress(""), 5000)
    } finally {
      setUploadingVideo(false)
    }
  }

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingThumbnail(true) // This line uses the newly declared uploadingThumbnail state
    setUploadProgress(`Uploading thumbnail: ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setCourseForm({ ...courseForm, thumbnail_url: data.url })
        setUploadProgress("Thumbnail uploaded successfully!")
        setTimeout(() => setUploadProgress(""), 2000)
      } else {
        setUploadProgress("Upload failed. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error uploading thumbnail:", error)
      setUploadProgress("Upload failed. Please try again.")
    } finally {
      setUploadingThumbnail(false) // This line uses the newly declared uploadingThumbnail state
    }
  }

  const handleTemplateThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingTemplateThumbnail(true)
    setUploadProgress(`Uploading thumbnail: ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setTemplateForm({ ...templateForm, thumbnail_url: data.url })
        setUploadProgress("Thumbnail uploaded successfully!")
        setTimeout(() => setUploadProgress(""), 2000)
      } else {
        setUploadProgress("Upload failed. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error uploading thumbnail:", error)
      setUploadProgress("Upload failed. Please try again.")
    } finally {
      setUploadingTemplateThumbnail(false)
    }
  }

  const handleDropThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDropThumbnail(true)
    setUploadProgress(`Uploading thumbnail: ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setDropForm({ ...dropForm, thumbnail_url: data.url })
        setUploadProgress("Thumbnail uploaded successfully!")
        setTimeout(() => setUploadProgress(""), 2000)
      } else {
        setUploadProgress("Upload failed. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error uploading thumbnail:", error)
      setUploadProgress("Upload failed. Please try again.")
    } finally {
      setUploadingDropThumbnail(false)
    }
  }

  const handleFlatlayThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFlatlayThumbnail(true)
    setUploadProgress(`Uploading thumbnail: ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setFlatlayForm({ ...flatlayForm, thumbnail_url: data.url })
        setUploadProgress("Thumbnail uploaded successfully!")
        setTimeout(() => setUploadProgress(""), 2000)
      } else {
        setUploadProgress("Upload failed. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error uploading thumbnail:", error)
      setUploadProgress("Upload failed. Please try again.")
    } finally {
      setUploadingFlatlayThumbnail(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-950" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-5xl font-extralight tracking-[0.3em] uppercase text-stone-950 mb-2">
            Academy Admin
          </h1>
          <p className="text-xs tracking-[0.15em] uppercase font-light text-stone-500">
            Manage Courses, Templates & Monthly Drops
          </p>
        </div>

        <div className="flex gap-2 mb-8 border-b border-stone-200">
          <button
            onClick={() => setActiveTab("courses")}
            className={`px-6 py-3 text-sm tracking-wider uppercase transition-all ${
              activeTab === "courses"
                ? "border-b-2 border-stone-950 text-stone-950"
                : "text-stone-500 hover:text-stone-950"
            }`}
          >
            Courses
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-6 py-3 text-sm tracking-wider uppercase transition-all ${
              activeTab === "templates"
                ? "border-b-2 border-stone-950 text-stone-950"
                : "text-stone-500 hover:text-stone-950"
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab("monthly-drops")}
            className={`px-6 py-3 text-sm tracking-wider uppercase transition-all ${
              activeTab === "monthly-drops"
                ? "border-b-2 border-stone-950 text-stone-950"
                : "text-stone-500 hover:text-stone-950"
            }`}
          >
            Monthly Drops
          </button>
          <button
            onClick={() => setActiveTab("flatlay-images")}
            className={`px-6 py-3 text-sm tracking-wider uppercase transition-all ${
              activeTab === "flatlay-images"
                ? "border-b-2 border-stone-950 text-stone-950"
                : "text-stone-500 hover:text-stone-950"
            }`}
          >
            Flatlay Images
          </button>
        </div>

        {activeTab === "courses" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Courses Panel */}
            <div className="bg-white/50 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
                  Courses
                </h2>
                <Button
                  onClick={handleCreateCourse}
                  className="bg-stone-950 text-white hover:bg-stone-800 text-xs tracking-wider uppercase"
                >
                  Add Course
                </Button>
              </div>

              <div className="space-y-3">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedCourse?.id === course.id
                        ? "border-stone-950 bg-stone-50"
                        : "border-stone-200 hover:border-stone-400"
                    }`}
                    onClick={() => handleSelectCourse(course)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-stone-950 mb-1">{course.title}</h3>
                        <p className="text-xs text-stone-500 uppercase tracking-wider">
                          {course.lesson_count} lessons • {course.enrollment_count} enrolled
                        </p>
                        {course.status !== "published" && (
                          <span className="inline-block mt-2 px-2 py-1 text-[10px] tracking-wider uppercase bg-stone-200 text-stone-600 rounded">
                            {course.status}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditCourse(course)
                          }}
                          className="text-xs text-stone-600 hover:text-stone-950 uppercase tracking-wider"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCourse(course.id)
                          }}
                          className="text-xs text-red-600 hover:text-red-800 uppercase tracking-wider"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {courses.length === 0 && (
                  <p className="text-sm text-stone-500 text-center py-8">No courses yet. Create your first course!</p>
                )}
              </div>
            </div>

            {/* Lessons Panel */}
            <div className="bg-white/50 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
                  Lessons
                </h2>
                {selectedCourse && (
                  <Button
                    onClick={handleCreateLesson}
                    className="bg-stone-950 text-white hover:bg-stone-800 text-xs tracking-wider uppercase"
                  >
                    Add Lesson
                  </Button>
                )}
              </div>

              {selectedCourse ? (
                <div className="space-y-3">
                  {lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="p-4 rounded-xl border border-stone-200 hover:border-stone-400 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-stone-950 mb-1">{lesson.title}</h3>
                          <p className="text-xs text-stone-500">
                            {Math.floor(lesson.duration_seconds / 60)}:
                            {(lesson.duration_seconds % 60).toString().padStart(2, "0")} min
                          </p>
                          {lesson.video_url && (
                            <p className="text-[10px] text-stone-400 mt-1 truncate">{lesson.video_url}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditLesson(lesson)}
                            className="text-xs text-stone-600 hover:text-stone-950 uppercase tracking-wider"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="text-xs text-red-600 hover:text-red-800 uppercase tracking-wider"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {lessons.length === 0 && (
                    <p className="text-sm text-stone-500 text-center py-8">No lessons yet. Add your first lesson!</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-stone-500 text-center py-8">Select a course to view lessons</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "templates" && (
          <div className="bg-white/50 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
                Templates
              </h2>
              <Button
                onClick={handleCreateTemplate}
                className="bg-stone-950 text-white hover:bg-stone-800 text-xs tracking-wider uppercase"
              >
                Add Template
              </Button>
            </div>

            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 rounded-xl border border-stone-200 hover:border-stone-400 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-stone-950 mb-1">{template.title}</h3>
                      <p className="text-xs text-stone-500 uppercase tracking-wider">
                        {template.resource_type} • {template.download_count} downloads
                      </p>
                      {template.status !== "published" && (
                        <span className="inline-block mt-2 px-2 py-1 text-[10px] tracking-wider uppercase bg-stone-200 text-stone-600 rounded">
                          {template.status}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="text-xs text-stone-600 hover:text-stone-950 uppercase tracking-wider"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-xs text-red-600 hover:text-red-800 uppercase tracking-wider"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {templates.length === 0 && (
                <p className="text-sm text-stone-500 text-center py-8">No templates yet. Create your first template!</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "monthly-drops" && (
          <div className="bg-white/50 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
                Monthly Drops
              </h2>
              <Button
                onClick={handleCreateDrop}
                className="bg-stone-950 text-white hover:bg-stone-800 text-xs tracking-wider uppercase"
              >
                Add Monthly Drop
              </Button>
            </div>

            <div className="space-y-3">
              {monthlyDrops.map((drop) => (
                <div
                  key={drop.id}
                  className="p-4 rounded-xl border border-stone-200 hover:border-stone-400 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-stone-950 mb-1">{drop.title}</h3>
                      <p className="text-xs text-stone-500 uppercase tracking-wider">
                        {drop.month} • {drop.resource_type} • {drop.download_count} downloads
                      </p>
                      {drop.status !== "published" && (
                        <span className="inline-block mt-2 px-2 py-1 text-[10px] tracking-wider uppercase bg-stone-200 text-stone-600 rounded">
                          {drop.status}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditDrop(drop)}
                        className="text-xs text-stone-600 hover:text-stone-950 uppercase tracking-wider"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDrop(drop.id)}
                        className="text-xs text-red-600 hover:text-red-800 uppercase tracking-wider"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {monthlyDrops.length === 0 && (
                <p className="text-sm text-stone-500 text-center py-8">
                  No monthly drops yet. Create your first monthly drop!
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "flatlay-images" && (
          <div className="bg-white/50 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
                Flatlay Images
              </h2>
              <Button
                onClick={handleCreateFlatlay}
                className="bg-stone-950 text-white hover:bg-stone-800 text-xs tracking-wider uppercase"
              >
                Add Flatlay Image
              </Button>
            </div>

            <div className="space-y-3">
              {flatlayImages.map((flatlay) => (
                <div
                  key={flatlay.id}
                  className="p-4 rounded-xl border border-stone-200 hover:border-stone-400 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-stone-950 mb-1">{flatlay.title}</h3>
                      <p className="text-xs text-stone-500 uppercase tracking-wider">
                        {flatlay.resource_type} • {flatlay.download_count || 0} downloads
                      </p>
                      {flatlay.status !== "published" && (
                        <span className="inline-block mt-2 px-2 py-1 text-[10px] tracking-wider uppercase bg-stone-200 text-stone-600 rounded">
                          {flatlay.status}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditFlatlay(flatlay)}
                        className="text-xs text-stone-600 hover:text-stone-950 uppercase tracking-wider"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteFlatlay(flatlay.id)}
                        className="text-xs text-red-600 hover:text-red-800 uppercase tracking-wider"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {flatlayImages.length === 0 && (
                <p className="text-sm text-stone-500 text-center py-8">
                  No flatlay images yet. Create your first flatlay image!
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Course Dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-extralight tracking-[0.15em] uppercase text-stone-950">
              {editingCourse ? "Edit Course" : "Create Course"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Title</Label>
              <Input
                value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                placeholder="Course title"
                className="border-stone-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Description</Label>
              <Textarea
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                placeholder="Course description"
                className="border-stone-300 min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Thumbnail</Label>
              {courseForm.thumbnail_url && (
                <div className="space-y-2">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                    <img
                      src={courseForm.thumbnail_url || "/placeholder.svg"}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${courseThumbnailPosition.x}% ${courseThumbnailPosition.y}%`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] tracking-wider uppercase text-stone-500">
                        Horizontal Position: {courseThumbnailPosition.x}%
                      </Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={courseThumbnailPosition.x}
                        onChange={(e) =>
                          setCourseThumbnailPosition({
                            ...courseThumbnailPosition,
                            x: Number.parseInt(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] tracking-wider uppercase text-stone-500">
                        Vertical Position: {courseThumbnailPosition.y}%
                      </Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={courseThumbnailPosition.y}
                        onChange={(e) =>
                          setCourseThumbnailPosition({
                            ...courseThumbnailPosition,
                            y: Number.parseInt(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  disabled={uploadingThumbnail} // This line uses the newly declared uploadingThumbnail state
                  className="border-stone-300"
                />
                {uploadingThumbnail && <Loader2 className="w-5 h-5 animate-spin text-stone-950" />}{" "}
                {/* This line uses the newly declared uploadingThumbnail state */}
              </div>
              <Input
                value={courseForm.thumbnail_url}
                onChange={(e) => setCourseForm({ ...courseForm, thumbnail_url: e.target.value })}
                placeholder="Or paste thumbnail URL"
                className="border-stone-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase text-stone-600">Order</Label>
                <Input
                  type="number"
                  value={courseForm.order_index}
                  onChange={(e) => setCourseForm({ ...courseForm, order_index: Number.parseInt(e.target.value) })}
                  className="border-stone-300"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase text-stone-600">Status</Label>
                <select
                  value={courseForm.status}
                  onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
          {uploadProgress && <p className="text-xs text-stone-600 text-center py-2">{uploadProgress}</p>}
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setCourseDialogOpen(false)}
              disabled={saving}
              className="border-stone-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCourse}
              disabled={saving || !courseForm.title}
              className="bg-stone-950 text-white hover:bg-stone-800"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-extralight tracking-[0.15em] uppercase text-stone-950">
              {editingLesson ? "Edit Lesson" : "Create Lesson"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Title</Label>
              <Input
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                placeholder="Lesson title"
                className="border-stone-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Description</Label>
              <Textarea
                value={lessonForm.description}
                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                placeholder="Lesson description"
                className="border-stone-300 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Video</Label>
              <p className="text-[10px] text-stone-500 mb-2">
                Max 500MB. For larger videos, upload to YouTube (unlisted) or Vimeo and paste URL below.
              </p>
              {lessonForm.video_url && (
                <div className="relative w-full rounded-lg overflow-hidden border border-stone-200 mb-2">
                  <video src={lessonForm.video_url} controls className="w-full" style={{ maxHeight: "200px" }} />
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  disabled={uploadingVideo}
                  className="border-stone-300"
                />
                {uploadingVideo && <Loader2 className="w-5 h-5 animate-spin text-stone-950" />}
              </div>
              <Input
                value={lessonForm.video_url}
                onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                placeholder="Or paste video URL (YouTube, Vimeo, etc.)"
                className="border-stone-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase text-stone-600">Duration (seconds)</Label>
                <Input
                  type="number"
                  value={lessonForm.duration_seconds}
                  onChange={(e) => setLessonForm({ ...lessonForm, duration_seconds: Number.parseInt(e.target.value) })}
                  className="border-stone-300"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase text-stone-600">Order</Label>
                <Input
                  type="number"
                  value={lessonForm.order_index}
                  onChange={(e) => setLessonForm({ ...lessonForm, order_index: Number.parseInt(e.target.value) })}
                  className="border-stone-300"
                />
              </div>
            </div>
          </div>
          {uploadProgress && <p className="text-xs text-stone-600 text-center py-2">{uploadProgress}</p>}
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setLessonDialogOpen(false)}
              disabled={saving}
              className="border-stone-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLesson}
              disabled={saving || !lessonForm.title}
              className="bg-stone-950 text-white hover:bg-stone-800"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-extralight tracking-[0.15em] uppercase text-stone-950">
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Title</Label>
              <Input
                value={templateForm.title}
                onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                placeholder="Template title"
                className="border-stone-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Description</Label>
              <Textarea
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder="Template description"
                className="border-stone-300 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Thumbnail</Label>
              {templateForm.thumbnail_url && (
                <div className="space-y-2">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                    <img
                      src={templateForm.thumbnail_url || "/placeholder.svg"}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${templateThumbnailPosition.x}% ${templateThumbnailPosition.y}%`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] tracking-wider uppercase text-stone-500">
                        Horizontal Position: {templateThumbnailPosition.x}%
                      </Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={templateThumbnailPosition.x}
                        onChange={(e) =>
                          setTemplateThumbnailPosition({
                            ...templateThumbnailPosition,
                            x: Number.parseInt(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] tracking-wider uppercase text-stone-500">
                        Vertical Position: {templateThumbnailPosition.y}%
                      </Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={templateThumbnailPosition.y}
                        onChange={(e) =>
                          setTemplateThumbnailPosition({
                            ...templateThumbnailPosition,
                            y: Number.parseInt(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleTemplateThumbnailUpload}
                  disabled={uploadingTemplateThumbnail}
                  className="border-stone-300"
                />
                {uploadingTemplateThumbnail && <Loader2 className="w-5 h-5 animate-spin text-stone-950" />}
              </div>
              <Input
                value={templateForm.thumbnail_url}
                onChange={(e) => setTemplateForm({ ...templateForm, thumbnail_url: e.target.value })}
                placeholder="Or paste thumbnail URL"
                className="border-stone-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Resource Type</Label>
              <select
                value={templateForm.resource_type}
                onChange={(e) => setTemplateForm({ ...templateForm, resource_type: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
              >
                <option value="canva">Canva Template</option>
                <option value="pdf">PDF Download</option>
                <option value="drive">Google Drive</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Resource URL</Label>
              <Input
                value={templateForm.resource_url}
                onChange={(e) => setTemplateForm({ ...templateForm, resource_url: e.target.value })}
                placeholder="https://..."
                className="border-stone-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase text-stone-600">Category</Label>
                <Input
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                  placeholder="e.g. Social Media"
                  className="border-stone-300"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase text-stone-600">Status</Label>
                <select
                  value={templateForm.status}
                  onChange={(e) => setTemplateForm({ ...templateForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
          {uploadProgress && <p className="text-xs text-stone-600 text-center py-2">{uploadProgress}</p>}
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setTemplateDialogOpen(false)}
              disabled={saving}
              className="border-stone-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={saving || !templateForm.title || !templateForm.resource_url}
              className="bg-stone-950 text-white hover:bg-stone-800"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dropDialogOpen} onOpenChange={setDropDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-extralight tracking-[0.15em] uppercase text-stone-950">
              {editingDrop ? "Edit Monthly Drop" : "Create Monthly Drop"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Title</Label>
              <Input
                value={dropForm.title}
                onChange={(e) => setDropForm({ ...dropForm, title: e.target.value })}
                placeholder="Monthly drop title"
                className="border-stone-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Description</Label>
              <Textarea
                value={dropForm.description}
                onChange={(e) => setDropForm({ ...dropForm, description: e.target.value })}
                placeholder="Monthly drop description"
                className="border-stone-300 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Month</Label>
              <Input
                value={dropForm.month}
                onChange={(e) => setDropForm({ ...dropForm, month: e.target.value })}
                placeholder="e.g. January 2025"
                className="border-stone-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Thumbnail</Label>
              {dropForm.thumbnail_url && (
                <div className="space-y-2">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                    <img
                      src={dropForm.thumbnail_url || "/placeholder.svg"}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${dropThumbnailPosition.x}% ${dropThumbnailPosition.y}%`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] tracking-wider uppercase text-stone-500">
                        Horizontal Position: {dropThumbnailPosition.x}%
                      </Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={dropThumbnailPosition.x}
                        onChange={(e) =>
                          setDropThumbnailPosition({
                            ...dropThumbnailPosition,
                            x: Number.parseInt(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] tracking-wider uppercase text-stone-500">
                        Vertical Position: {dropThumbnailPosition.y}%
                      </Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={dropThumbnailPosition.y}
                        onChange={(e) =>
                          setDropThumbnailPosition({
                            ...dropThumbnailPosition,
                            y: Number.parseInt(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleDropThumbnailUpload}
                  disabled={uploadingDropThumbnail}
                  className="border-stone-300"
                />
                {uploadingDropThumbnail && <Loader2 className="w-5 h-5 animate-spin text-stone-950" />}
              </div>
              <Input
                value={dropForm.thumbnail_url}
                onChange={(e) => setDropForm({ ...dropForm, thumbnail_url: e.target.value })}
                placeholder="Or paste thumbnail URL"
                className="border-stone-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Resource Type</Label>
              <select
                value={dropForm.resource_type}
                onChange={(e) => setDropForm({ ...dropForm, resource_type: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
              >
                <option value="canva">Canva Template</option>
                <option value="pdf">PDF Download</option>
                <option value="drive">Google Drive</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Resource URL</Label>
              <Input
                value={dropForm.resource_url}
                onChange={(e) => setDropForm({ ...dropForm, resource_url: e.target.value })}
                placeholder="https://..."
                className="border-stone-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase text-stone-600">Category</Label>
                <Input
                  value={dropForm.category}
                  onChange={(e) => setDropForm({ ...dropForm, category: e.target.value })}
                  placeholder="e.g. Social Media"
                  className="border-stone-300"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase text-stone-600">Status</Label>
                <select
                  value={dropForm.status}
                  onChange={(e) => setDropForm({ ...dropForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
          {uploadProgress && <p className="text-xs text-stone-600 text-center py-2">{uploadProgress}</p>}
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setDropDialogOpen(false)}
              disabled={saving}
              className="border-stone-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDrop}
              disabled={saving || !dropForm.title || !dropForm.resource_url || !dropForm.month}
              className="bg-stone-950 text-white hover:bg-stone-800"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={flatlayDialogOpen} onOpenChange={setFlatlayDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-extralight tracking-[0.15em] uppercase text-stone-950">
              {editingFlatlay ? "Edit Flatlay Image" : "Create Flatlay Image"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Title</Label>
              <Input
                value={flatlayForm.title}
                onChange={(e) => setFlatlayForm({ ...flatlayForm, title: e.target.value })}
                placeholder="Flatlay image title"
                className="border-stone-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Description</Label>
              <Textarea
                value={flatlayForm.description}
                onChange={(e) => setFlatlayForm({ ...flatlayForm, description: e.target.value })}
                placeholder="Flatlay image description"
                className="border-stone-300 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Thumbnail</Label>
              {flatlayForm.thumbnail_url && (
                <div className="space-y-2">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                    <img
                      src={flatlayForm.thumbnail_url || "/placeholder.svg"}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${flatlayThumbnailPosition.x}% ${flatlayThumbnailPosition.y}%`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] tracking-wider uppercase text-stone-500">
                        Horizontal Position: {flatlayThumbnailPosition.x}%
                      </Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={flatlayThumbnailPosition.x}
                        onChange={(e) =>
                          setFlatlayThumbnailPosition({
                            ...flatlayThumbnailPosition,
                            x: Number.parseInt(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] tracking-wider uppercase text-stone-500">
                        Vertical Position: {flatlayThumbnailPosition.y}%
                      </Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={flatlayThumbnailPosition.y}
                        onChange={(e) =>
                          setFlatlayThumbnailPosition({
                            ...flatlayThumbnailPosition,
                            y: Number.parseInt(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFlatlayThumbnailUpload}
                  disabled={uploadingFlatlayThumbnail}
                  className="border-stone-300"
                />
                {uploadingFlatlayThumbnail && <Loader2 className="w-5 h-5 animate-spin text-stone-950" />}
              </div>
              <Input
                value={flatlayForm.thumbnail_url}
                onChange={(e) => setFlatlayForm({ ...flatlayForm, thumbnail_url: e.target.value })}
                placeholder="Or paste thumbnail URL"
                className="border-stone-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Resource Type</Label>
              <select
                value={flatlayForm.resource_type}
                onChange={(e) => setFlatlayForm({ ...flatlayForm, resource_type: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
              >
                <option value="image">Image</option>
                <option value="zip">ZIP File</option>
                <option value="pdf">PDF</option>
                <option value="link">External Link</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase text-stone-600">Resource URL</Label>
              <Input
                value={flatlayForm.resource_url}
                onChange={(e) => setFlatlayForm({ ...flatlayForm, resource_url: e.target.value })}
                placeholder="https://..."
                className="border-stone-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase text-stone-600">Order Index</Label>
                <Input
                  type="number"
                  value={flatlayForm.order_index}
                  onChange={(e) => setFlatlayForm({ ...flatlayForm, order_index: Number.parseInt(e.target.value) })}
                  className="border-stone-300"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase text-stone-600">Status</Label>
                <select
                  value={flatlayForm.status}
                  onChange={(e) => setFlatlayForm({ ...flatlayForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
          {uploadProgress && <p className="text-xs text-stone-600 text-center py-2">{uploadProgress}</p>}
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setFlatlayDialogOpen(false)}
              disabled={saving}
              className="border-stone-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveFlatlay}
              disabled={saving || !flatlayForm.title || !flatlayForm.resource_url}
              className="bg-stone-950 text-white hover:bg-stone-800"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

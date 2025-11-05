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
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])

  // Course dialog state
  const [courseDialogOpen, setCourseDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    thumbnail_url: "",
    order_index: 0,
    status: "draft",
  })

  // Lesson dialog state
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    video_url: "",
    duration_seconds: 0,
    order_index: 0,
  })

  const [saving, setSaving] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")

  useEffect(() => {
    fetchCourses()
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
        body: JSON.stringify(courseForm),
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

    setUploadingThumbnail(true)
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
      setUploadingThumbnail(false)
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
          <p className="text-xs tracking-[0.15em] uppercase font-light text-stone-500">Manage Courses & Lessons</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Courses Panel */}
          <div className="bg-white/50 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">Courses</h2>
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
              <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">Lessons</h2>
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
      </div>

      {/* Course Dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-extralight tracking-[0.15em] uppercase text-stone-950">
              {editingCourse ? "Edit Course" : "Create Course"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-stone-200 mb-2">
                  <img
                    src={courseForm.thumbnail_url || "/placeholder.svg"}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  disabled={uploadingThumbnail}
                  className="border-stone-300"
                />
                {uploadingThumbnail && <Loader2 className="w-5 h-5 animate-spin text-stone-950" />}
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
          <DialogFooter>
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-extralight tracking-[0.15em] uppercase text-stone-950">
              {editingLesson ? "Edit Lesson" : "Create Lesson"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          <DialogFooter>
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
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  FlaskConical, 
  TestTube, 
  Play, 
  Save, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2,
  Settings,
  Image as ImageIcon,
  Database,
  GitCompare,
  ArrowUpCircle
} from "lucide-react"
import Link from "next/link"

interface MayaTestingLabProps {
  userId: string
  userName: string
}

type TestType = "training" | "generation" | "comparison"

interface TrainingParams {
  lora_rank: number
  learning_rate: number
  caption_dropout_rate: number
  steps: number
  num_repeats: number
  network_alpha: number
}

interface PromptSettings {
  prompt_length_min: number
  prompt_length_max: number
  lighting_style: "warm" | "realistic" | "hybrid"
  feature_inclusion: "include" | "omit" | "safety_net"
  authenticity_keywords: "mandatory" | "optional" | "context_aware"
}

interface GenerationSettings {
  num_inference_steps: number
  lora_scale: number
  guidance_scale: number
  extra_lora_enabled: boolean
  extra_lora_scale: number
  aspect_ratio: string
  megapixels: string
  output_format: string
  output_quality: number
}

export function MayaTestingLab({ userId, userName }: MayaTestingLabProps) {
  const [activeTab, setActiveTab] = useState<TestType>("training")
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [testUsers, setTestUsers] = useState<any[]>([])
  const [selectedTestUser, setSelectedTestUser] = useState<string | null>(null)
  const [testImages, setTestImages] = useState<string[]>([])
  const [monitoringTestId, setMonitoringTestId] = useState<number | null>(null)
  const [uploadedImages, setUploadedImages] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<any>(null)
  const [expandedTestResult, setExpandedTestResult] = useState<number | null>(null)
  const [testResultImages, setTestResultImages] = useState<Record<number, any>>({})
  const [userRequest, setUserRequest] = useState<string>("A professional headshot with natural lighting")
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [currentGenerationId, setCurrentGenerationId] = useState<number | null>(null)
  const [isFixingTriggerWord, setIsFixingTriggerWord] = useState(false)
  const [promotingModel, setPromotingModel] = useState<string | null>(null)
  const [productionMode, setProductionMode] = useState(false) // Toggle for production vs test mode

  // Training parameters
  const [trainingParams, setTrainingParams] = useState<TrainingParams>({
    lora_rank: 24,
    learning_rate: 0.0001,
    caption_dropout_rate: 0.05,
    steps: 1400,
    num_repeats: 20,
    network_alpha: 24,
  })

  // Prompt settings
  const [promptSettings, setPromptSettings] = useState<PromptSettings>({
    prompt_length_min: 40,
    prompt_length_max: 50,
    lighting_style: "warm",
    feature_inclusion: "safety_net",
    authenticity_keywords: "context_aware",
  })

  // Generation settings
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings>({
    num_inference_steps: 50,
    lora_scale: 1.0,
    guidance_scale: 3.5,
    extra_lora_enabled: true,
    extra_lora_scale: 0.2,
    aspect_ratio: "4:5",
    megapixels: "1",
    output_format: "png",
    output_quality: 95,
  })

  // Auto-update network_alpha when lora_rank changes
  useEffect(() => {
    setTrainingParams(prev => ({
      ...prev,
      network_alpha: prev.lora_rank,
    }))
  }, [trainingParams.lora_rank])

  const handleRunTest = async () => {
    if (activeTab === "training" && !selectedTestUser) {
      setError("Please select or create a test user for training")
      return
    }
    if (activeTab === "training" && testImages.length < 5) {
      setError("Please upload at least 5 training images")
      return
    }
    if (activeTab === "generation" && !selectedTestUser) {
      setError("Please select a test user with a trained model")
      return
    }
    
    // CRITICAL: Confirm if production mode is enabled
    if (productionMode && activeTab === "training") {
      const selectedUser = testUsers.find((u: any) => u.id === selectedTestUser)
      const userEmail = selectedUser?.email || selectedTestUser
      const confirmMessage = `⚠️ PRODUCTION MODE ENABLED ⚠️\n\nYou are about to retrain the PRODUCTION model for:\n${userEmail}\n\nThis will:\n- Update their ACTUAL production model (not a test model)\n- Affect all their future image generations\n- Use their production trigger word\n\nAre you absolutely sure you want to proceed?`
      
      if (!confirm(confirmMessage)) {
        return
      }
    }
    if (activeTab === "generation" && !userRequest.trim()) {
      setError("Please enter a test request")
      return
    }

    setIsRunning(true)
    setError(null)
    setSuccess(null)

    try {
      const testName = `Test - ${activeTab} - ${new Date().toLocaleString()}`
      
      const response = await fetch("/api/admin/maya-testing/run-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_type: activeTab,
          test_name: testName,
          test_user_id: selectedTestUser,
          production_mode: productionMode, // CRITICAL: Flag to update production model instead of test model
          training_params: activeTab === "training" ? trainingParams : undefined,
          prompt_settings: activeTab === "generation" ? promptSettings : undefined,
          generation_settings: activeTab === "generation" ? generationSettings : undefined,
          image_urls: activeTab === "training" ? testImages : undefined,
          user_request: activeTab === "generation" ? userRequest : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        const errorMessage = data.error || "Test failed"
        const details = data.details || data.full_error || ""
        throw new Error(details ? `${errorMessage}: ${typeof details === 'string' ? details : JSON.stringify(details)}` : errorMessage)
      }

      const result = await response.json()
      setSuccess(`Test started successfully! Test ID: ${result.test_id}`)
      
      // Start monitoring for training or generation tests
      if (result.test_id && (activeTab === "training" || activeTab === "generation")) {
        setMonitoringTestId(result.test_id)
        // Clear previous generated image when starting new generation
        if (activeTab === "generation") {
          setGeneratedImageUrl(null)
          setCurrentGenerationId(null)
          setIsRunning(false) // Reset running state so we can show loading spinner
        }
      }
      
      fetchTestResults()
    } catch (err: any) {
      setError(err.message || "Failed to run test")
    } finally {
      setIsRunning(false)
    }
  }

  const fetchTestResults = async () => {
    try {
      const response = await fetch("/api/admin/maya-testing/list-results")
      if (response.ok) {
        const data = await response.json()
        setTestResults(data.results || [])
      }
    } catch (err) {
      console.error("Failed to fetch test results:", err)
    }
  }

  const handleFixTriggerWord = async () => {
    if (!selectedTestUser) {
      setError("Please select a test user first")
      return
    }

    setIsFixingTriggerWord(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/admin/training/fix-trigger-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedTestUser }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message || "Trigger word fixed successfully")
        if (data.nextSteps) {
          console.log("[v0] Next steps:", data.nextSteps)
        }
      } else {
        setError(data.error || "Failed to fix trigger word")
      }
    } catch (err: any) {
      setError(err.message || "Failed to fix trigger word")
    } finally {
      setIsFixingTriggerWord(false)
    }
  }

  const handlePromoteTestModel = async (userId: string, testResult?: any) => {
    if (!userId) {
      setError("User ID is required")
      return
    }
    
    // Show confirmation with user email if available
    const userEmail = testResult?.test_user_email || userId
    const confirmMessage = `Are you sure you want to promote the test model to production for user: ${userEmail}?\n\nThis will update their production model with the test model's trained LoRA.`
    
    if (!confirm(confirmMessage)) {
      return
    }
    
    setPromotingModel(userId)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch("/api/admin/training/promote-test-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, keepTestModel: true }),
      })
      let data: any = {}
      try {
        const text = await response.text()
        if (text) {
          data = JSON.parse(text)
        }
      } catch (parseError) {
        console.error("[v0] Failed to parse response:", parseError)
        setError(`Failed to parse server response. Status: ${response.status}`)
        return
      }
      
      if (response.ok) {
        setSuccess(data.message || `Test model promoted to production successfully for ${data.actions?.userEmail || userEmail}`)
        if (data.nextSteps) {
          console.log("[v0] Next steps:", data.nextSteps)
        }
        // Refresh test results and users
        fetchTestResults()
        fetchTestUsers()
      } else {
        const errorMsg = data.error || "Failed to promote test model"
        const details = data.details ? `\n\nDetails: ${data.details}` : ""
        const hint = data.hint ? `\n\nHint: ${data.hint}` : ""
        const suggestion = data.suggestion ? `\n\nSuggestion: ${data.suggestion}` : ""
        const constraint = data.constraint ? `\n\nConstraint: ${data.constraint}` : ""
        const errorCode = data.errorCode ? `\n\nError Code: ${data.errorCode}` : ""
        const fullError = `${errorMsg}${constraint}${errorCode}${details}${hint}${suggestion}`
        setError(fullError)
        console.error("[v0] Promote error - Status:", response.status)
        console.error("[v0] Promote error - Full Response:", JSON.stringify(data, null, 2))
        console.error("[v0] Promote error - Constraint:", data.constraint)
        console.error("[v0] Promote error - Error Code:", data.errorCode)
        console.error("[v0] Promote error - Full error message:", fullError)
      }
    } catch (err: any) {
      setError(err.message || "Failed to promote test model")
    } finally {
      setPromotingModel(null)
    }
  }

  const fetchTestImages = async (testResultId: number) => {
    try {
      const response = await fetch(`/api/admin/maya-testing/get-test-images?test_result_id=${testResultId}`)
      if (response.ok) {
        const data = await response.json()
        return data
      }
      return null
    } catch (err) {
      console.error("Failed to fetch test images:", err)
      return null
    }
  }

  useEffect(() => {
    fetchTestResults()
    fetchTestUsers()
    checkMigration()
  }, [])

  const checkMigration = async () => {
    try {
      const response = await fetch("/api/admin/maya-testing/check-migration")
      if (response.ok) {
        const data = await response.json()
        setMigrationStatus(data)
        if (data.needs_migration) {
          // Auto-run migration
          const migrateResponse = await fetch("/api/admin/maya-testing/run-migration", {
            method: "POST",
          })
          if (migrateResponse.ok) {
            const migrateData = await migrateResponse.json()
            setSuccess("Database migration completed successfully!")
            // Re-check status
            setTimeout(checkMigration, 1000)
          }
        }
      }
    } catch (err) {
      console.error("Failed to check migration:", err)
    }
  }

  const createTestUser = async () => {
    try {
      setIsRunning(true)
      setError(null)
      const response = await fetch("/api/admin/maya-testing/create-test-user", {
        method: "POST",
      })
      if (response.ok) {
        const data = await response.json()
        setSuccess(`Test user created: ${data.test_user_email}. This is separate from your admin account.`)
        // Refresh test users list
        await fetchTestUsers()
        // Select the newly created test user
        setSelectedTestUser(data.test_user_id)
      } else {
        const error = await response.json()
        setError(error.error || "Failed to create test user")
      }
    } catch (err: any) {
      setError(err.message || "Failed to create test user")
    } finally {
      setIsRunning(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (!selectedTestUser) {
      setError("Please select or create a test user first")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("test_user_id", selectedTestUser)
      files.forEach((file) => {
        formData.append("images", file)
      })

      const response = await fetch("/api/admin/maya-testing/upload-test-images", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const data = await response.json()
      setUploadedImages([...uploadedImages, ...data.images])
      setTestImages([...testImages, ...data.images.map((img: any) => img.url)])
      setSuccess(`Uploaded ${data.images.length} images successfully!`)
    } catch (err: any) {
      setError(err.message || "Failed to upload images")
    } finally {
      setIsUploading(false)
      // Reset file input
      e.target.value = ""
    }
  }

  const fetchTestUsers = async () => {
    try {
      const response = await fetch("/api/admin/maya-testing/get-test-users")
      if (response.ok) {
        const data = await response.json()
        const allUsers = [
          ...(data.users_with_models || []),
          ...(data.users_without_models || []),
        ]
        console.log("[TESTING] Fetched test users:", {
          with_models: data.users_with_models?.length || 0,
          without_models: data.users_without_models?.length || 0,
          total: allUsers.length,
          users_with_models: allUsers.filter(u => u.has_trained_model).length,
        })
        setTestUsers(allUsers)
      }
    } catch (err) {
      console.error("Failed to fetch test users:", err)
    }
  }

  // Monitor training/generation progress if a test is running
  useEffect(() => {
    if (!monitoringTestId) return

    // Determine which endpoint to use based on active tab
    const isGenerationTest = activeTab === "generation"
    
    const interval = setInterval(async () => {
      try {
        const endpoint = isGenerationTest
          ? `/api/admin/maya-testing/get-generation-progress?test_result_id=${monitoringTestId}`
          : `/api/admin/maya-testing/get-training-progress?test_result_id=${monitoringTestId}`
          
        const response = await fetch(endpoint)
        if (response.ok) {
          const data = await response.json()
          
          // For generation tests, display the image when completed
          if (isGenerationTest && data.status === "completed" && data.image_url) {
            setGeneratedImageUrl(data.image_url)
            setCurrentGenerationId(monitoringTestId)
            setMonitoringTestId(null)
            setIsRunning(false)
            fetchTestResults()
            setSuccess("Image generation completed successfully!")
          } else if (data.status === "completed" || data.status === "failed") {
            setMonitoringTestId(null)
            fetchTestResults()
            
            // Refresh test users list after training completes
            if (!isGenerationTest) {
              try {
                await fetch("/api/admin/maya-testing/fix-completed-trainings", { method: "POST" })
              } catch (err) {
                console.error("Failed to fix completed trainings:", err)
              }
              fetchTestUsers()
            }
          }
        }
      } catch (err) {
        console.error(`Failed to check ${isGenerationTest ? 'generation' : 'training'} progress:`, err)
      }
    }, 3000) // Check every 3 seconds for faster updates

    return () => clearInterval(interval)
  }, [monitoringTestId, activeTab])

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-stone-100/50 to-stone-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-serif font-extralight tracking-[0.3em] uppercase text-stone-950 mb-2">
                Maya Testing Lab
              </h1>
              <p className="text-sm text-stone-600">
                Test training parameters, prompts, and generation settings before implementing changes
              </p>
            </div>
            <Link
              href="/admin"
              className="text-sm tracking-[0.15em] uppercase font-light border rounded-2xl py-3 px-6 transition-colors hover:text-stone-950 hover:bg-stone-100/30 text-stone-600 border-stone-300/40"
            >
              Back to Admin
            </Link>
          </div>

          {/* Migration Status */}
          {migrationStatus && migrationStatus.needs_migration && (
            <Alert className="bg-blue-50 border-blue-200 mb-4">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900 font-semibold">Database Migration Required</AlertTitle>
              <AlertDescription className="text-blue-800 text-sm">
                Running migration now... This will create the necessary test tables.
              </AlertDescription>
            </Alert>
          )}

          {migrationStatus && !migrationStatus.needs_migration && (
            <Alert className="bg-green-50 border-green-200 mb-4">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900 font-semibold">Database Ready</AlertTitle>
              <AlertDescription className="text-green-800 text-sm">
                All test tables are set up and ready to use.
              </AlertDescription>
            </Alert>
          )}

          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 font-semibold">Test Environment - Your Admin Model is Safe</AlertTitle>
            <AlertDescription className="text-amber-800 text-sm">
              All tests use a separate test user. Your admin account&apos;s production model will NOT be affected. Test trainings create separate models with &quot;test-&quot; prefix.
            </AlertDescription>
          </Alert>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900 font-semibold">Success</AlertTitle>
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TestType)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-xl rounded-2xl p-2 border border-stone-200">
            <TabsTrigger value="training" className="data-[state=active]:bg-stone-950 data-[state=active]:text-white">
              <Database className="w-4 h-4 mr-2" />
              Training
            </TabsTrigger>
            <TabsTrigger value="generation" className="data-[state=active]:bg-stone-950 data-[state=active]:text-white">
              <ImageIcon className="w-4 h-4 mr-2" />
              Generation
            </TabsTrigger>
            <TabsTrigger value="comparison" className="data-[state=active]:bg-stone-950 data-[state=active]:text-white">
              <GitCompare className="w-4 h-4 mr-2" />
              Compare
            </TabsTrigger>
          </TabsList>

          {/* Training Parameters Tab */}
          <TabsContent value="training" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Training Parameters</CardTitle>
                <CardDescription>
                  Adjust LoRA training parameters to test different configurations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Test User Selection */}
                <div className="space-y-2 border-b pb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Test User</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={createTestUser}
                      disabled={isRunning}
                    >
                      {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Test User"}
                    </Button>
                  </div>
                  
                  {/* Production Mode Toggle */}
                  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-amber-900">Production Mode</label>
                      <p className="text-xs text-amber-700 mt-1">
                        {productionMode 
                          ? "⚠️ Will update the user&apos;s ACTUAL production model (not a test model)"
                          : "Creating a test model (is_test = true) - won&apos;t affect production"}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productionMode}
                        onChange={(e) => setProductionMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>
                  <select
                    value={selectedTestUser || ""}
                    onChange={(e) => {
                      setSelectedTestUser(e.target.value || null)
                      setUploadedImages([])
                      setTestImages([])
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select a test user...</option>
                    {testUsers.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.email || user.id} {user.has_trained_model ? "(has model)" : `(${user.training_images_count || 0} images)`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-stone-600">
                    Create a dedicated test user (recommended) or select an existing user. Your admin account is excluded from this list and will NOT be affected.
                  </p>
                  {selectedTestUser && (
                    <div className="mt-2 p-2 bg-stone-100 rounded text-xs">
                      <strong>Selected User:</strong> {testUsers.find((u: any) => u.id === selectedTestUser)?.email || selectedTestUser}
                    </div>
                  )}
                </div>

                {/* Image Upload for Training */}
                {selectedTestUser && (
                  <div className="space-y-2 p-4 bg-stone-50 border border-stone-200 rounded-lg">
                    <p className="text-sm font-medium">Upload Training Images</p>
                    <p className="text-xs text-stone-600 mb-3">
                      Upload 5-20 images for training. These will be saved to the test user only.
                    </p>
                    
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="w-full text-sm"
                    />
                    
                    {isUploading && (
                      <div className="flex items-center gap-2 text-sm text-stone-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading images...
                      </div>
                    )}

                    {uploadedImages.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-stone-700 mb-2">
                          Uploaded Images ({uploadedImages.length}):
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {uploadedImages.map((img: any, idx: number) => (
                            <div key={idx} className="relative">
                              <img
                                src={img.url}
                                alt={img.filename}
                                className="w-full h-20 object-cover rounded border"
                              />
                              <button
                                onClick={() => {
                                  setUploadedImages(uploadedImages.filter((_, i) => i !== idx))
                                  setTestImages(testImages.filter((_, i) => i !== idx))
                                }}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {uploadedImages.length >= 5 && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                        ✓ Ready for training! You have {uploadedImages.length} images.
                      </div>
                    )}
                  </div>
                )}

                {/* lora_rank */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">LoRA Rank</label>
                    <span className="text-sm text-stone-600">{trainingParams.lora_rank}</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="64"
                    step="8"
                    value={trainingParams.lora_rank}
                    onChange={(e) => setTrainingParams({ ...trainingParams, lora_rank: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>8 (low)</span>
                    <span>24 (recommended)</span>
                    <span>48 (current prod)</span>
                    <span>64 (high)</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    Higher rank captures more detail but can cause instability. Recommended: 16-24
                  </p>
                </div>

                {/* learning_rate */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Learning Rate</label>
                    <span className="text-sm text-stone-600">{trainingParams.learning_rate}</span>
                  </div>
                  <input
                    type="range"
                    min="0.00001"
                    max="0.001"
                    step="0.00001"
                    value={trainingParams.learning_rate}
                    onChange={(e) => setTrainingParams({ ...trainingParams, learning_rate: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>0.00001</span>
                    <span>0.0001 (recommended)</span>
                    <span>0.00008 (current prod)</span>
                    <span>0.001</span>
                  </div>
                </div>

                {/* caption_dropout_rate */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Caption Dropout Rate</label>
                    <span className="text-sm text-stone-600">{trainingParams.caption_dropout_rate}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.3"
                    step="0.01"
                    value={trainingParams.caption_dropout_rate}
                    onChange={(e) => setTrainingParams({ ...trainingParams, caption_dropout_rate: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>0.0 (no dropout)</span>
                    <span>0.05 (recommended)</span>
                    <span>0.15 (current prod)</span>
                    <span>0.3 (high)</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    Lower dropout = model learns more from captions (better for hair/body/age)
                  </p>
                </div>

                {/* steps */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Training Steps</label>
                  <input
                    type="number"
                    min="500"
                    max="3000"
                    step="100"
                    value={trainingParams.steps}
                    onChange={(e) => setTrainingParams({ ...trainingParams, steps: parseInt(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-stone-600">Default: 1400 steps</p>
                </div>

                {/* num_repeats */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Dataset Repeats</label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    step="5"
                    value={trainingParams.num_repeats}
                    onChange={(e) => setTrainingParams({ ...trainingParams, num_repeats: parseInt(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-stone-600">Default: 20 repeats</p>
                </div>

                {/* network_alpha (auto-set) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Network Alpha</label>
                    <span className="text-sm text-stone-600">{trainingParams.network_alpha} (auto-set to match LoRA rank)</span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  {/* Fix Trigger Word Button (only show if user is selected) */}
                  {selectedTestUser && (
                    <Button
                      onClick={handleFixTriggerWord}
                      disabled={isFixingTriggerWord}
                      variant="outline"
                      className="w-full border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    >
                      {isFixingTriggerWord ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Fixing Trigger Word...
                        </>
                      ) : (
                        <>
                          <GitCompare className="w-4 h-4 mr-2" />
                          Fix Trigger Word (if wrong)
                        </>
                      )}
                    </Button>
                  )}
                  
                  <Button 
                    onClick={handleRunTest} 
                    disabled={isRunning}
                    className="w-full"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running Test...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Training Test
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-stone-500 mt-2 text-center">
                    ⚠️ Training takes ~10-15 minutes and costs ~$0.10-0.50
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generation Tab (Combined Prompt + Generation Settings) */}
          <TabsContent value="generation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Image Generation Test</CardTitle>
                <CardDescription>
                  Test image generation with custom prompt and generation settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Test User Selection */}
                <div className="space-y-2 border-b pb-4">
                  <label className="text-sm font-medium">Test User (with trained model)</label>
                  <select
                    value={selectedTestUser || ""}
                    onChange={(e) => setSelectedTestUser(e.target.value || null)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select a test user...</option>
                    {(() => {
                      const usersWithModels = testUsers.filter((u: any) => u.has_trained_model === true)
                      return usersWithModels.map((user: any) => (
                        <option key={user.id} value={user.id}>
                          {user.email || user.display_name || user.id} {user.has_trained_model ? '(has model)' : ''}
                        </option>
                      ))
                    })()}
                  </select>
                  {(() => {
                    const usersWithModels = testUsers.filter((u: any) => u.has_trained_model === true)
                    if (usersWithModels.length === 0) {
                      return (
                        <p className="text-xs text-amber-600">
                          No users with trained models found. Train a test user first in the Training tab.
                        </p>
                      )
                    }
                    return null
                  })()}
                  <p className="text-xs text-stone-600">
                    Select a user with a trained model to generate test images.
                  </p>
                </div>

                {/* User Request Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Generation Request</label>
                  <textarea
                    value={userRequest}
                    onChange={(e) => setUserRequest(e.target.value)}
                    placeholder="Describe what you want to generate, e.g., 'A professional headshot with natural lighting'"
                    className="w-full border rounded-lg px-3 py-2 min-h-[100px]"
                  />
                  <p className="text-xs text-stone-600">
                    This request will be used to generate test images with your custom settings.
                  </p>
                </div>

                {/* Generation Settings Section */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">Generation Settings</h3>
                  
                  {/* Inference Steps */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Inference Steps</label>
                      <span className="text-sm text-stone-600">{generationSettings.num_inference_steps}</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="5"
                      value={generationSettings.num_inference_steps}
                      onChange={(e) => setGenerationSettings({ ...generationSettings, num_inference_steps: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>20 (fast)</span>
                      <span>50 (recommended)</span>
                      <span>100 (high quality)</span>
                    </div>
                  </div>

                  {/* LoRA Scale */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">LoRA Scale</label>
                      <span className="text-sm text-stone-600">{generationSettings.lora_scale}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={generationSettings.lora_scale}
                      onChange={(e) => setGenerationSettings({ ...generationSettings, lora_scale: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>0.0 (none)</span>
                      <span>1.0 (recommended)</span>
                      <span>2.0 (strong)</span>
                    </div>
                  </div>

                  {/* Guidance Scale */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Guidance Scale</label>
                      <span className="text-sm text-stone-600">{generationSettings.guidance_scale}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="7"
                      step="0.5"
                      value={generationSettings.guidance_scale}
                      onChange={(e) => setGenerationSettings({ ...generationSettings, guidance_scale: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>1.0 (creative)</span>
                      <span>3.5 (recommended)</span>
                      <span>7.0 (strict)</span>
                    </div>
                  </div>

                  {/* Extra LoRA Toggle */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Extra LoRA (Super-Realism)</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={generationSettings.extra_lora_enabled}
                          onChange={(e) => setGenerationSettings({ ...generationSettings, extra_lora_enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-950"></div>
                      </label>
                    </div>
                    {generationSettings.extra_lora_enabled && (
                      <div className="ml-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs text-stone-600">Extra LoRA Scale</label>
                          <span className="text-xs text-stone-600">{generationSettings.extra_lora_scale}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={generationSettings.extra_lora_scale}
                          onChange={(e) => setGenerationSettings({ ...generationSettings, extra_lora_scale: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-stone-500">
                          <span>0.0 (subtle)</span>
                          <span>0.2 (recommended)</span>
                          <span>1.0 (strong)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Aspect Ratio */}
                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">Aspect Ratio</label>
                    <select
                      value={generationSettings.aspect_ratio}
                      onChange={(e) => setGenerationSettings({ ...generationSettings, aspect_ratio: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="1:1">1:1 (Square)</option>
                      <option value="4:5">4:5 (Portrait)</option>
                      <option value="3:4">3:4 (Portrait)</option>
                      <option value="16:9">16:9 (Landscape)</option>
                    </select>
                  </div>

                  {/* Output Format */}
                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">Output Format</label>
                    <select
                      value={generationSettings.output_format}
                      onChange={(e) => setGenerationSettings({ ...generationSettings, output_format: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="png">PNG</option>
                      <option value="webp">WebP</option>
                      <option value="jpg">JPG</option>
                    </select>
                  </div>

                  {/* Output Quality */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Output Quality</label>
                      <span className="text-sm text-stone-600">{generationSettings.output_quality}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={generationSettings.output_quality}
                      onChange={(e) => setGenerationSettings({ ...generationSettings, output_quality: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>50%</span>
                      <span>95% (recommended)</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* Prompt Settings Section (Optional - for future use) */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">Prompt Settings (Optional)</h3>
                  
                  {/* Prompt Length */}
                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">Prompt Length Range</label>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <label className="text-xs text-stone-600">Min</label>
                        <input
                          type="number"
                          min="30"
                          max="60"
                          value={promptSettings.prompt_length_min}
                          onChange={(e) => setPromptSettings({ ...promptSettings, prompt_length_min: parseInt(e.target.value) })}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <span className="pt-6">-</span>
                      <div className="flex-1">
                        <label className="text-xs text-stone-600">Max</label>
                        <input
                          type="number"
                          min="40"
                          max="80"
                          value={promptSettings.prompt_length_max}
                          onChange={(e) => setPromptSettings({ ...promptSettings, prompt_length_max: parseInt(e.target.value) })}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lighting Style */}
                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">Lighting Style</label>
                    <select
                      value={promptSettings.lighting_style}
                      onChange={(e) => setPromptSettings({ ...promptSettings, lighting_style: e.target.value as any })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="warm">Warm (Golden hour, soft sunlight)</option>
                      <option value="realistic">Realistic (Uneven, mixed temps)</option>
                      <option value="hybrid">Hybrid (Realistic but appealing)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={handleRunTest} 
                    disabled={isRunning || !userRequest.trim()}
                    className="w-full"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Generate Test Image
                      </>
                    )}
                  </Button>
                </div>

                {/* Generated Image Preview - Display immediately when ready (like Maya Gallery) */}
                {(generatedImageUrl || (monitoringTestId && activeTab === "generation")) && (
                  <div className="pt-4 border-t space-y-4">
                    <h3 className="text-lg font-medium">Generated Image Preview</h3>
                    {generatedImageUrl ? (
                      <div className="space-y-3">
                        <div className="relative aspect-square bg-stone-100 rounded-lg overflow-hidden border-2 border-stone-300 shadow-lg">
                          <img
                            src={generatedImageUrl}
                            alt="Generated test image"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Generation completed successfully!</p>
                            <p className="text-xs text-green-600 mt-1">This image is saved in the Comparison tab for analysis.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="aspect-square bg-stone-100 rounded-lg flex items-center justify-center border-2 border-stone-300 shadow-md">
                          <div className="text-center space-y-4">
                            <Loader2 className="w-10 h-10 animate-spin mx-auto text-stone-400" />
                            <div>
                              <p className="text-sm font-medium text-stone-700">Generating image...</p>
                              <p className="text-xs text-stone-500 mt-1">This may take 10-30 seconds</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Compare Test Results</CardTitle>
                <CardDescription>
                  Side-by-side comparison of test results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testResults.length === 0 ? (
                  <p className="text-sm text-stone-600">
                    No test results yet. Run some tests first to compare them.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {testResults.map((result: any) => {
                      const isExpanded = expandedTestResult === result.id
                      const images = testResultImages[result.id]
                      
                      return (
                        <Card key={result.id} className="p-4">
                          <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-medium">{result.test_name || `Test #${result.id}`}</h3>
                            <p className="text-sm text-stone-600">
                              {result.test_type} • {new Date(result.created_at).toLocaleString()}
                            </p>
                            {result.configuration && (
                              <div className="mt-2 text-xs text-stone-500">
                                {result.test_type === 'training' && result.configuration.training_params && (
                                  <div>
                                    Rank: {result.configuration.training_params.lora_rank || 'N/A'}, 
                                    LR: {result.configuration.training_params.learning_rate || 'N/A'}, 
                                    Dropout: {result.configuration.training_params.caption_dropout_rate || 'N/A'}
                                  </div>
                                )}
                                {result.configuration.prompt_settings && (
                                  <div>
                                    Lighting: {result.configuration.prompt_settings.lighting_style || 'N/A'}, 
                                    Length: {result.configuration.prompt_settings.prompt_length_min || 'N/A'}-{result.configuration.prompt_settings.prompt_length_max || 'N/A'} words
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              result.status === 'completed' ? 'bg-green-100 text-green-800' :
                              result.status === 'running' ? 'bg-blue-100 text-blue-800' :
                              result.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {result.status}
                            </div>
                            {/* Promote to Production button - only for completed training tests */}
                            {result.status === 'completed' && 
                             result.test_type === 'training' && 
                             result.test_user_id && (
                              <div className="flex flex-col items-end gap-1">
                                {result.test_user_email && (
                                  <span className="text-xs text-stone-500">
                                    {result.test_user_email}
                                  </span>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePromoteTestModel(result.test_user_id, result)}
                                  disabled={promotingModel === result.test_user_id}
                                  className="border-green-200 bg-green-50 text-green-900 hover:bg-green-100"
                                  title={`Promote this test model to production for ${result.test_user_email || result.test_user_id}`}
                                >
                                  {promotingModel === result.test_user_id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      Promoting...
                                    </>
                                  ) : (
                                    <>
                                      <ArrowUpCircle className="w-3 h-3 mr-1" />
                                      Promote to Production
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expandable Images Section */}
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!isExpanded && !images) {
                                // Fetch images
                                const imageData = await fetchTestImages(result.id)
                                if (imageData) {
                                  setTestResultImages(prev => ({ ...prev, [result.id]: imageData }))
                                }
                              }
                              setExpandedTestResult(isExpanded ? null : result.id)
                            }}
                            className="w-full"
                          >
                            {isExpanded ? 'Hide' : 'Show'} Images & Details
                          </Button>

                          {isExpanded && (
                            <div className="mt-4 space-y-4">
                              {/* Training Images (if training test) */}
                              {images?.training_images && images.training_images.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Training Images ({images.training_images.length})</h4>
                                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                    {images.training_images.map((img: any) => (
                                      <img
                                        key={img.id}
                                        src={img.url}
                                        alt={`Training image ${img.id}`}
                                        className="w-full h-24 object-cover rounded border"
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Generated Test Images */}
                              {images?.test_images && images.test_images.length > 0 ? (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Generated Images ({images.test_images.length})</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {images.test_images.map((img: any) => (
                                      <div key={img.id} className="border rounded-lg p-3">
                                        <img
                                          src={img.image_url}
                                          alt={img.prompt || "Generated image"}
                                          className="w-full h-64 object-cover rounded mb-2"
                                        />
                                        {img.prompt && (
                                          <p className="text-xs text-stone-600 mt-2">
                                            <strong>Prompt:</strong> {img.prompt}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                images && <p className="text-sm text-stone-600">No generated images yet.</p>
                              )}

                              {/* Configuration Details */}
                              {result.configuration && (
                                <div className="p-3 bg-stone-50 rounded-lg">
                                  <h4 className="text-sm font-medium mb-2">Configuration</h4>
                                  <pre className="text-xs overflow-auto">
                                    {JSON.stringify(result.configuration, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {result.configuration && (
                          <div className="mt-3 p-3 bg-stone-50 rounded-lg">
                            <p className="text-xs font-medium text-stone-700 mb-2">Configuration:</p>
                            {result.configuration.training_params && (
                              <div className="text-xs text-stone-600 space-y-1">
                                <p>LoRA Rank: {result.configuration.training_params.lora_rank}</p>
                                <p>Learning Rate: {result.configuration.training_params.learning_rate}</p>
                                <p>Caption Dropout: {result.configuration.training_params.caption_dropout_rate}</p>
                              </div>
                            )}
                            {result.configuration.prompt_settings && (
                              <div className="text-xs text-stone-600 space-y-1">
                                <p>Prompt Length: {result.configuration.prompt_settings.prompt_length_min}-{result.configuration.prompt_settings.prompt_length_max} words</p>
                                <p>Lighting: {result.configuration.prompt_settings.lighting_style}</p>
                                <p>Features: {result.configuration.prompt_settings.feature_inclusion}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {result.results && typeof result.results === 'object' && (
                          <div className="mt-3 p-3 bg-stone-50 rounded-lg">
                            <p className="text-xs font-medium text-stone-700 mb-2">Results:</p>
                            <div className="text-xs text-stone-600">
                              {result.results.replicate_model_id && (
                                <p>Model: {result.results.replicate_model_id}</p>
                              )}
                              {result.results.training_id && (
                                <p>Training ID: {result.results.training_id}</p>
                              )}
                            </div>
                          </div>
                        )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Test Results History */}
        {testResults.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Recent Test Results</CardTitle>
                  <CardDescription>Your recent test runs</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsRunning(true)
                      setError(null)
                      setSuccess(null)
                      
                      try {
                        const response = await fetch("/api/admin/maya-testing/fix-completed-trainings", { method: "POST" })
                        const data = await response.json()
                        
                        if (response.ok && data.success) {
                          if (data.fixed > 0) {
                            setSuccess(`Synced ${data.fixed} completed training(s) with user models. Refreshing user list...`)
                          } else {
                            setSuccess(`All trainings are already synced. ${data.already_fixed} already up-to-date.`)
                          }
                          
                          // Refresh data
                          await fetchTestUsers()
                          await fetchTestResults()
                        } else {
                          setError(data.error || "Failed to sync completed trainings")
                        }
                      } catch (err: any) {
                        console.error("Failed to sync:", err)
                        setError(err.message || "Failed to sync completed trainings")
                      } finally {
                        setIsRunning(false)
                      }
                    }}
                    disabled={isRunning}
                    title="Fix user_models status for completed test trainings"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      "Sync"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchTestResults}
                    disabled={isRunning}
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testResults.slice(0, 10).map((result: any) => (
                  <div key={result.id} className="border rounded-lg p-3 flex justify-between items-center hover:bg-stone-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{result.test_name || `Test #${result.id}`}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          result.status === 'completed' ? 'bg-green-100 text-green-800' :
                          result.status === 'running' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                          result.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {result.status}
                        </span>
                        {monitoringTestId === result.id && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        )}
                      </div>
                      <p className="text-sm text-stone-600">{result.test_type}</p>
                      <p className="text-xs text-stone-500">
                        {new Date(result.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Promote to Production button - only for completed training tests */}
                      {result.status === 'completed' && 
                       result.test_type === 'training' && 
                       result.test_user_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePromoteTestModel(result.test_user_id, result)}
                          disabled={promotingModel === result.test_user_id}
                          className="border-green-200 bg-green-50 text-green-900 hover:bg-green-100 text-xs"
                          title="Promote this test model to production"
                        >
                          {promotingModel === result.test_user_id ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Promoting...
                            </>
                          ) : (
                            <>
                              <ArrowUpCircle className="w-3 h-3 mr-1" />
                              Promote
                            </>
                          )}
                        </Button>
                      )}
                      <Link
                        href={`/admin/maya-testing?test_id=${result.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

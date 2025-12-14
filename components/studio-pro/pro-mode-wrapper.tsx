"use client"

import { useState, useEffect } from "react"
import ProEntryFlow from "./pro-entry-flow"
import OnboardingFlow from "./onboarding-flow"
import ProDashboard from "./pro-dashboard"
import EditReuseWorkflow from "./workflows/edit-reuse-workflow"
import ProAssetGallery from "./pro-asset-gallery"

interface ProModeWrapperProps {
  onWorkflowStart?: (workflowType: string) => void
  onStartWorkflowInChat?: (workflowType: string) => void
}

type ProView = 'entry' | 'onboarding' | 'dashboard' | 'workflow' | 'gallery'

export default function ProModeWrapper({ onWorkflowStart, onStartWorkflowInChat }: ProModeWrapperProps) {
  const [currentView, setCurrentView] = useState<ProView>('entry')
  const [entrySelection, setEntrySelection] = useState<'just-me' | 'me-product' | 'editing' | 'full-brand' | null>(null)
  const [setupStatus, setSetupStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)
  const [workflowBaseImage, setWorkflowBaseImage] = useState<string | undefined>(undefined)

  useEffect(() => {
    checkSetupStatus()
  }, [])

  const checkSetupStatus = async () => {
    try {
      const response = await fetch('/api/studio-pro/setup', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setSetupStatus(data)

        // Determine which view to show
        if (!data.setup.entry_selection) {
          setCurrentView('entry')
        } else if (!data.canUsePro) {
          setCurrentView('onboarding')
          setEntrySelection(data.setup.entry_selection)
        } else {
          setCurrentView('dashboard')
        }
      }
    } catch (error) {
      console.error('Failed to check setup status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEntrySelection = async (selection: 'just-me' | 'me-product' | 'editing' | 'full-brand') => {
    setEntrySelection(selection)

    // Save entry selection
    try {
      const response = await fetch('/api/studio-pro/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrySelection: selection }),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save selection' }))
        console.error('Failed to save entry selection:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        alert(`Failed to save selection: ${errorData.error || errorData.details || 'Unknown error'}`)
        return
      }

      // Success - move to onboarding
      setCurrentView('onboarding')
    } catch (error) {
      console.error('Failed to save entry selection:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to save selection'}`)
    }
  }

  const handleOnboardingComplete = () => {
    setCurrentView('dashboard')
    checkSetupStatus() // Refresh status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-stone-600">Loading...</div>
      </div>
    )
  }

  if (currentView === 'entry') {
    return <ProEntryFlow onSelection={handleEntrySelection} />
  }

  if (currentView === 'onboarding' && entrySelection) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <OnboardingFlow
          entrySelection={entrySelection}
          onComplete={handleOnboardingComplete}
        />
      </div>
    )
  }

  const handleWorkflowStart = (workflowType: string) => {
    if (workflowType === 'gallery') {
      setCurrentView('gallery')
      return
    }
    
    // For chat-based workflows (carousel, reel-cover, etc.), switch to chat
    const chatBasedWorkflows = ['carousel', 'reel-cover', 'ugc-product', 'quote-graphic', 'product-mockup']
    if (chatBasedWorkflows.includes(workflowType)) {
      // Trigger workflow in chat interface
      if (onStartWorkflowInChat) {
        onStartWorkflowInChat(workflowType)
      }
      return
    }
    
    // For form-based workflows (edit/reuse), show workflow component
    if (workflowType === 'edit-image' || workflowType === 'edit-reuse' || workflowType === 'change-outfit' || workflowType === 'remove-object') {
      setActiveWorkflow(workflowType)
      setCurrentView('workflow')
      if (onWorkflowStart) {
        onWorkflowStart(workflowType)
      }
      return
    }
    
    // Default: try chat-based
    if (onStartWorkflowInChat) {
      onStartWorkflowInChat(workflowType)
    }
  }

  const handleWorkflowClose = () => {
    setActiveWorkflow(null)
    setWorkflowBaseImage(undefined)
    setCurrentView('dashboard')
  }

  const handleReuseAdapt = (generation: any) => {
    setWorkflowBaseImage(generation.image_url)
    setActiveWorkflow('edit-image')
    setCurrentView('workflow')
  }

  if (currentView === 'dashboard') {
    return (
      <div className="flex flex-col h-full">
        <ProDashboard 
          onActionClick={handleWorkflowStart}
        />
      </div>
    )
  }

  const handleWorkflowComplete = () => {
    // Return to dashboard after workflow completes
    setCurrentView('dashboard')
    setActiveWorkflow(null)
    setWorkflowBaseImage(undefined)
  }

  if (currentView === 'workflow' && (activeWorkflow === 'edit-image' || activeWorkflow === 'edit-reuse' || activeWorkflow === 'change-outfit' || activeWorkflow === 'remove-object')) {
    return (
      <EditReuseWorkflow
        initialBaseImage={workflowBaseImage}
        onClose={handleWorkflowClose}
        onComplete={handleWorkflowComplete}
      />
    )
  }

  if (currentView === 'gallery') {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-stone-200/60 p-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
        <ProAssetGallery
          onReuseAdapt={handleReuseAdapt}
        />
      </div>
    )
  }

  return null
}



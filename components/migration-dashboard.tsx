"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2, Database, FileCheck } from "lucide-react"
import {
  migrateUsers,
  migrateTraining,
  migrateImages,
  migrateChats,
  migrateSubscriptions,
  checkProductionData,
  verifyMigration,
} from "@/app/actions/migrate"

type MigrationStep = {
  id: string
  name: string
  description: string
  status: "pending" | "running" | "success" | "error"
  message?: string
  action: () => Promise<{ success: boolean; message: string }>
  isUtility?: boolean
}

export function MigrationDashboard() {
  const [steps, setSteps] = useState<MigrationStep[]>([
    {
      id: "check",
      name: "Check Production Data",
      description: "Verify what data exists in production",
      status: "pending",
      action: checkProductionData,
      isUtility: true,
    },
    {
      id: "users",
      name: "Migrate Users",
      description: "17 users and profiles",
      status: "pending",
      action: migrateUsers,
    },
    {
      id: "training",
      name: "Migrate Training Data",
      description: "8 trained models",
      status: "pending",
      action: migrateTraining,
    },
    {
      id: "images",
      name: "Migrate Images",
      description: "296 generated images",
      status: "pending",
      action: migrateImages,
    },
    {
      id: "chats",
      name: "Migrate Chats",
      description: "432 Maya conversations",
      status: "pending",
      action: migrateChats,
    },
    {
      id: "subscriptions",
      name: "Migrate Subscriptions",
      description: "8 active subscriptions",
      status: "pending",
      action: migrateSubscriptions,
    },
    {
      id: "verify",
      name: "Verify Migration",
      description: "Check if all data was migrated successfully",
      status: "pending",
      action: verifyMigration,
      isUtility: true,
    },
  ])

  const runMigration = async (stepId: string) => {
    const stepIndex = steps.findIndex((s) => s.id === stepId)
    if (stepIndex === -1) return

    setSteps((prev) => prev.map((s, i) => (i === stepIndex ? { ...s, status: "running" as const } : s)))

    try {
      const result = await steps[stepIndex].action()

      setSteps((prev) =>
        prev.map((s, i) =>
          i === stepIndex
            ? {
                ...s,
                status: result.success ? "success" : "error",
                message: result.message,
              }
            : s,
        ),
      )
    } catch (error) {
      setSteps((prev) =>
        prev.map((s, i) =>
          i === stepIndex
            ? {
                ...s,
                status: "error",
                message: error instanceof Error ? error.message : "Unknown error",
              }
            : s,
        ),
      )
    }
  }

  const runAllMigrations = async () => {
    for (const step of steps.filter((s) => !s.isUtility)) {
      await runMigration(step.id)
    }
  }

  const utilitySteps = steps.filter((s) => s.isUtility)
  const migrationSteps = steps.filter((s) => !s.isUtility)

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Migration</h1>
        <p className="text-muted-foreground">Migrate your production data to the new simplified database</p>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          This will copy all your production data (users, models, images, chats, subscriptions) to your new Supabase
          database. You can run each step individually or all at once.
        </AlertDescription>
      </Alert>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" />
          Utility Tools
        </h2>
        <div className="space-y-4">
          {utilitySteps.map((step) => (
            <Card key={step.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{step.name}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {step.status === "pending" && (
                      <Button onClick={() => runMigration(step.id)} size="sm" variant="outline">
                        Run
                      </Button>
                    )}
                    {step.status === "running" && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                    {step.status === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {step.status === "error" && <XCircle className="h-5 w-5 text-red-500" />}
                  </div>
                </div>
              </CardHeader>
              {step.message && (
                <CardContent>
                  <p className={`text-sm ${step.status === "error" ? "text-red-500" : "text-green-600"}`}>
                    {step.message}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Migration Steps
        </h2>
        <Button onClick={runAllMigrations} size="lg" className="w-full mb-4">
          Run All Migrations
        </Button>
      </div>

      <div className="space-y-4">
        {migrationSteps.map((step) => (
          <Card key={step.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{step.name}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {step.status === "pending" && (
                    <Button onClick={() => runMigration(step.id)} size="sm">
                      Run
                    </Button>
                  )}
                  {step.status === "running" && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                  {step.status === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {step.status === "error" && <XCircle className="h-5 w-5 text-red-500" />}
                </div>
              </div>
            </CardHeader>
            {step.message && (
              <CardContent>
                <p className={`text-sm ${step.status === "error" ? "text-red-500" : "text-green-600"}`}>
                  {step.message}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

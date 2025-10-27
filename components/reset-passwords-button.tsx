"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { resetAllUserPasswords } from "@/app/actions/reset-passwords"

export function ResetPasswordsButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [details, setDetails] = useState<string[]>([])

  const handleReset = async () => {
    setStatus("loading")
    setMessage("Resetting passwords...")
    setDetails([])

    try {
      const result = await resetAllUserPasswords()

      if (result.success) {
        setStatus("success")
        setMessage(result.message)
        setDetails(result.details || [])
      } else {
        setStatus("error")
        setMessage(result.error || "Password reset failed")
        setDetails(result.details || [])
      }
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Unknown error occurred")
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleReset} disabled={status === "loading"} size="lg" className="w-full">
        {status === "loading" ? "Resetting Passwords..." : "Reset All Passwords"}
      </Button>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            status === "success"
              ? "bg-green-500/10 text-green-500"
              : status === "error"
                ? "bg-red-500/10 text-red-500"
                : "bg-blue-500/10 text-blue-500"
          }`}
        >
          <p className="font-medium">{message}</p>
          {details.length > 0 && (
            <ul className="mt-2 text-sm space-y-1">
              {details.map((detail, i) => (
                <li key={i}>• {detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

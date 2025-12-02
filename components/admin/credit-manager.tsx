"use client"

import { useState } from "react"
import { Search, Plus, Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface User {
  id: string
  email: string
  display_name: string | null
  credits: number
}

export function CreditManager() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [creditAmount, setCreditAmount] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const searchUsers = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users || [])
        if (data.users.length === 0) {
          setMessage({ type: "error", text: "No users found" })
        }
      } else {
        setMessage({ type: "error", text: "Failed to search users" })
      }
    } catch (error) {
      console.error("[v0] Error searching users:", error)
      setMessage({ type: "error", text: "Error searching users" })
    } finally {
      setLoading(false)
    }
  }

  const addCredits = async () => {
    if (!selectedUser || !creditAmount || !reason) {
      setMessage({ type: "error", text: "Please fill in all fields" })
      return
    }

    const amount = Number.parseInt(creditAmount)
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: "error", text: "Please enter a valid credit amount" })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/admin/credits/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount,
          reason,
        }),
      })

      const contentType = response.headers.get("content-type")
      let data

      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        // Handle non-JSON responses (rate limits, server errors, etc.)
        const text = await response.text()
        console.error("[v0] [CREDITS] Non-JSON response:", text)
        data = {
          error: text.includes("Too Many")
            ? "Rate limit exceeded. Please try again in a moment."
            : "Server error occurred",
        }
      }

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Successfully added ${amount} credits to ${selectedUser.email}. New balance: ${data.newBalance}`,
        })
        setCreditAmount("")
        setReason("")
        // Update the selected user's credits
        setSelectedUser({ ...selectedUser, credits: data.newBalance })
        // Update in search results
        setSearchResults(searchResults.map((u) => (u.id === selectedUser.id ? { ...u, credits: data.newBalance } : u)))
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add credits" })
      }
    } catch (error) {
      console.error("[v0] [CREDITS] Error adding credits:", error)
      setMessage({ type: "error", text: "Error adding credits. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="relative h-[20vh] overflow-hidden">
        <img src="/images/641-yz6rwohjtemwagcwy5xqjtsczx9lfh.png" alt="Admin" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-stone-50/50 to-stone-50" />
        <div className="absolute top-6 left-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-stone-950 hover:text-stone-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="font-['Times_New_Roman'] text-5xl font-extralight tracking-[0.4em] uppercase text-stone-950">
            CREDIT MANAGER
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Search Section */}
        <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg mb-8">
          <h2 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-6">
            SEARCH USER
          </h2>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
              <input
                type="text"
                placeholder="Enter email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-950"
              />
            </div>
            <button
              onClick={searchUsers}
              disabled={loading || !searchQuery.trim()}
              className="px-8 py-4 bg-stone-950 text-white rounded-xl hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm tracking-[0.2em] uppercase"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-6 space-y-3">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    selectedUser?.id === user.id
                      ? "bg-stone-950 text-white border-stone-950"
                      : "bg-stone-50 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-base mb-1">{user.email}</p>
                      {user.display_name && (
                        <p className={`text-sm ${selectedUser?.id === user.id ? "text-stone-300" : "text-stone-500"}`}>
                          {user.display_name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-sm ${selectedUser?.id === user.id ? "text-stone-300" : "text-stone-500"}`}>
                        Credits
                      </p>
                      <p className="text-2xl font-['Times_New_Roman'] font-extralight">{user.credits}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add Credits Form */}
        {selectedUser && (
          <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg">
            <h2 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-6">
              ADD CREDITS
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm tracking-[0.1em] uppercase text-stone-600 mb-3">Selected User</label>
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <p className="font-medium text-base mb-1">{selectedUser.email}</p>
                  <p className="text-sm text-stone-500">Current balance: {selectedUser.credits} credits</p>
                </div>
              </div>

              <div>
                <label className="block text-sm tracking-[0.1em] uppercase text-stone-600 mb-3">Credit Amount</label>
                <div className="relative">
                  <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                  <input
                    type="number"
                    placeholder="Enter amount..."
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm tracking-[0.1em] uppercase text-stone-600 mb-3">Reason</label>
                <textarea
                  placeholder="Why are you adding credits?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-4 bg-stone-50 border border-stone-200 rounded-xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-950 resize-none"
                />
              </div>

              {message && (
                <div
                  className={`flex items-center gap-3 p-4 rounded-xl ${
                    message.type === "success" ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p className="text-sm">{message.text}</p>
                </div>
              )}

              <button
                onClick={addCredits}
                disabled={loading || !creditAmount || !reason}
                className="w-full px-8 py-4 bg-stone-950 text-white rounded-xl hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    Add Credits
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

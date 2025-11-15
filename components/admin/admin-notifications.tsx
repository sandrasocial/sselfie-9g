"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, X, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Notification {
  id: string
  type: "info" | "warning" | "error"
  title: string
  message: string
  timestamp: string
  link: string
}

interface NotificationsData {
  notifications: Notification[]
  unreadCount: number
}

export function AdminNotifications() {
  const [data, setData] = useState<NotificationsData>({ notifications: [], unreadCount: 0 })
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchNotifications()
    // Refresh every 60 seconds
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/admin/notifications")
      if (response.ok) {
        const newData = await response.json()
        setData(newData)
      }
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error)
    }
  }

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]))
  }

  const activeNotifications = data.notifications.filter((n) => !dismissed.has(n.id))
  const unreadCount = activeNotifications.filter((n) => n.type === "error" || n.type === "warning").length

  const getIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getBgColor = (type: string) => {
    switch (type) {
      case "error":
        return "bg-red-50 border-red-200"
      case "warning":
        return "bg-orange-50 border-orange-200"
      default:
        return "bg-blue-50 border-blue-200"
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative z-50">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[500px] overflow-y-auto z-50">
        <div className="p-4 border-b border-stone-200">
          <h3 className="font-medium text-stone-900">Notifications</h3>
          <p className="text-xs text-stone-500 mt-1">
            {activeNotifications.length === 0 ? "No new notifications" : `${activeNotifications.length} notifications`}
          </p>
        </div>

        {activeNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">All caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {activeNotifications.map((notification) => (
              <div key={notification.id} className="p-4 hover:bg-stone-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-stone-900">{notification.title}</p>
                      <button
                        onClick={() => handleDismiss(notification.id)}
                        className="flex-shrink-0 text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-stone-600 mb-2">{notification.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-400">
                        {new Date(notification.timestamp).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Link href={notification.link} className="text-xs text-stone-600 hover:text-stone-900 font-medium">
                        View →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

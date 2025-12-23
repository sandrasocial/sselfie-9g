"use client"

import { useState } from 'react'
import { Mail, Eye, Send, Calendar, Edit } from 'lucide-react'

interface EmailPreviewCardProps {
  subject: string
  preview: string
  htmlContent: string
  targetSegment: string
  targetCount: number
  onEdit: () => void
  onApprove: () => void
  onSchedule: () => void
}

export default function EmailPreviewCard({
  subject,
  preview,
  htmlContent,
  targetSegment,
  targetCount,
  onEdit,
  onApprove,
  onSchedule
}: EmailPreviewCardProps) {
  const [showFullEmail, setShowFullEmail] = useState(false)

  return (
    <div className="bg-white border border-stone-300 rounded-xl overflow-hidden shadow-lg my-4">
      {/* Header */}
      <div className="bg-stone-50 border-b border-stone-200 px-6 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-stone-700" />
          <h3 className="font-semibold text-stone-900">Email Preview</h3>
        </div>
        <div className="text-sm text-stone-600">
          <span className="font-medium">To:</span> {targetSegment} ({targetCount.toLocaleString()} contacts)
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="mb-4">
          <label className="text-xs text-stone-600 uppercase tracking-wider mb-1 block">
            Subject Line
          </label>
          <p className="text-base font-semibold text-stone-900">
            {subject}
          </p>
        </div>

        <div className="mb-4">
          <label className="text-xs text-stone-600 uppercase tracking-wider mb-1 block">
            Preview
          </label>
          <p className="text-sm text-stone-700 leading-relaxed">
            {preview}
          </p>
        </div>

        {showFullEmail && (
          <div className="mb-4 p-4 bg-stone-50 border border-stone-200 rounded-lg max-h-96 overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        )}

        <button
          onClick={() => setShowFullEmail(!showFullEmail)}
          className="flex items-center gap-2 text-sm text-stone-700 hover:text-stone-900 mb-4"
        >
          <Eye className="w-4 h-4" />
          {showFullEmail ? 'Hide full email' : 'View full email'}
        </button>
      </div>

      {/* Actions */}
      <div className="bg-stone-50 border-t border-stone-200 px-6 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span className="text-sm">Edit</span>
          </button>
          
          <button
            onClick={() => setShowFullEmail(!showFullEmail)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm">View HTML</span>
          </button>
          
          <button
            onClick={onSchedule}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Schedule</span>
          </button>
          
          <button
            onClick={onApprove}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span className="text-sm">Approve & Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}


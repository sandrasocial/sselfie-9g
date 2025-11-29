"use client"

interface PredictionCardProps {
  data: {
    high: number
    medium: number
    low: number
    total: number
  }
}

export function PredictionCard({ data }: PredictionCardProps) {
  return (
    <div className="border border-neutral-800 p-6 rounded-lg bg-white">
      <h2 className="font-serif text-2xl mb-4">Conversion Predictions</h2>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-neutral-400 mb-1">High Intent</div>
          <div className="text-3xl font-light">{data.high || 0}</div>
          <div className="text-xs text-neutral-500 mt-1">Ready to buy now</div>
        </div>
        <div>
          <div className="text-neutral-400 mb-1">Medium Intent</div>
          <div className="text-3xl font-light">{data.medium || 0}</div>
          <div className="text-xs text-neutral-500 mt-1">Needs 1-2 days nurture</div>
        </div>
        <div>
          <div className="text-neutral-400 mb-1">Low Intent</div>
          <div className="text-3xl font-light">{data.low || 0}</div>
          <div className="text-xs text-neutral-500 mt-1">Cold / not ready</div>
        </div>
      </div>

      {data.total > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <div className="text-xs text-neutral-500">
            Total predictions: <span className="font-medium text-neutral-900">{data.total}</span> (last 24h)
          </div>
        </div>
      )}
    </div>
  )
}

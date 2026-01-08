"use client"

import useSWR from "swr"
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"

interface ForecastData {
  nextMonth: string
  revenueForecast: number
  mrrForecast: number
  creditCostForecast: number
  referralCostForecast: number
  claudeCostForecast: number
  totalCostsForecast: number
  grossMarginForecast: number
  confidence: number
  trend: "up" | "down" | "stable"
}

interface ForecastResponse {
  success: boolean
  current: {
    revenue: number
    mrr: number
    creditCost: number
    referralCost: number
    claudeCost: number
    totalCosts: number
    grossMargin: number
  }
  forecast: ForecastData
  trend: {
    mrrChange: string
    marginChange: string
    forecastConfidence: number
  }
  timestamp: string
}

const fetcher = async (url: string): Promise<ForecastResponse> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch forecast")
  return res.json()
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function getTrendIcon(trend: "up" | "down" | "stable") {
  switch (trend) {
    case "up":
      return <TrendingUp className="w-4 h-4 text-green-600" />
    case "down":
      return <TrendingDown className="w-4 h-4 text-red-600" />
    default:
      return <Minus className="w-4 h-4 text-stone-400" />
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.7) return "text-green-600"
  if (confidence >= 0.4) return "text-yellow-600"
  return "text-red-600"
}

export function ForecastSection() {
  const { data, error, isLoading } = useSWR<ForecastResponse>("/api/admin/growth-forecast", fetcher, {
    refreshInterval: 300000, // Refresh every 5 minutes
  })

  if (error) {
    return (
      <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <p className="text-xs sm:text-sm">Error loading forecast</p>
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
        <p className="text-xs sm:text-sm text-stone-400">Loading forecast...</p>
      </div>
    )
  }

  const { forecast, current, trend } = data

  // Show alert banner if margin forecast < 50%
  const showMarginAlert = forecast.grossMarginForecast < 50

  return (
    <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
      {/* Alert Banner */}
      {showMarginAlert && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-none">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-yellow-800">
                Margin Forecast Below 50%
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Projected gross margin: {formatPercent(forecast.grossMarginForecast)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base sm:text-lg font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
            Next Month Forecast ({forecast.nextMonth})
          </h3>
          <div className="flex items-center gap-2">
            {getTrendIcon(forecast.trend)}
            <span className={`text-xs sm:text-sm font-medium ${getConfidenceColor(forecast.confidence)}`}>
              {formatPercent(forecast.confidence * 100)} confidence
            </span>
          </div>
        </div>
        <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase mb-2">
          Based on 3-month trend analysis
        </p>
        <p className="text-xs sm:text-sm text-stone-950 font-['Times_New_Roman'] font-extralight">
          Projected revenue next month: {formatCurrency(forecast.revenueForecast)} ({trend.mrrChange})
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Revenue Forecast */}
        <div className="bg-stone-50 p-3 sm:p-4 rounded-none border border-stone-200">
          <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase mb-1">Revenue</p>
          <p className="text-base sm:text-lg font-['Times_New_Roman'] text-stone-950 font-extralight">
            {formatCurrency(forecast.revenueForecast)}
          </p>
        </div>

        {/* MRR Forecast */}
        <div className="bg-stone-50 p-3 sm:p-4 rounded-none border border-stone-200">
          <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase mb-1">MRR</p>
          <p className="text-base sm:text-lg font-['Times_New_Roman'] text-stone-950 font-extralight">
            {formatCurrency(forecast.mrrForecast)}
          </p>
        </div>

        {/* Credit Cost Forecast */}
        <div className="bg-stone-50 p-3 sm:p-4 rounded-none border border-stone-200">
          <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase mb-1">Credit Cost</p>
          <p className="text-base sm:text-lg font-['Times_New_Roman'] text-stone-950 font-extralight">
            {formatCurrency(forecast.creditCostForecast)}
          </p>
        </div>

        {/* Gross Margin Forecast */}
        <div className="bg-stone-50 p-3 sm:p-4 rounded-none border border-stone-200">
          <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase mb-1">Gross Margin</p>
          <div className="flex items-center gap-2">
            <p className="text-base sm:text-lg font-['Times_New_Roman'] text-stone-950 font-extralight">
              {formatPercent(forecast.grossMarginForecast)}
            </p>
            {trend.marginChange.startsWith("+") ? (
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
            ) : trend.marginChange.startsWith("-") ? (
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
            ) : (
              <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-stone-400" />
            )}
            <span className={`text-xs ${trend.marginChange.startsWith("+") ? "text-green-600" : trend.marginChange.startsWith("-") ? "text-red-600" : "text-stone-400"}`}>
              {trend.marginChange}
            </span>
          </div>
        </div>
      </div>

      {/* Forecast Confidence Progress Bar */}
      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-stone-200">
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs sm:text-sm font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
              Forecast Confidence
            </p>
            <span className={`text-xs sm:text-sm font-medium ${getConfidenceColor(forecast.confidence)}`}>
              {formatPercent(forecast.confidence * 100)}
            </span>
          </div>
          <div className="w-full bg-stone-200 rounded-none h-2">
            <div
              className={`h-2 rounded-none transition-all ${
                forecast.confidence >= 0.7
                  ? "bg-green-600"
                  : forecast.confidence >= 0.4
                    ? "bg-yellow-600"
                    : "bg-red-600"
              }`}
              style={{ width: `${forecast.confidence * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Detailed Forecast Breakdown */}
      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-stone-200">
        <h4 className="text-xs sm:text-sm font-['Times_New_Roman'] text-stone-950 mb-3 sm:mb-4 tracking-[0.1em] uppercase">
          Cost Breakdown
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase mb-1">Credit Costs</p>
            <p className="text-sm sm:text-base font-['Times_New_Roman'] text-stone-950 font-extralight">
              {formatCurrency(forecast.creditCostForecast)}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase mb-1">Referral Costs</p>
            <p className="text-sm sm:text-base font-['Times_New_Roman'] text-stone-950 font-extralight">
              {formatCurrency(forecast.referralCostForecast)}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase mb-1">Claude API</p>
            <p className="text-sm sm:text-base font-['Times_New_Roman'] text-stone-950 font-extralight">
              {formatCurrency(forecast.claudeCostForecast)}
            </p>
          </div>
        </div>
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-stone-200">
          <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase mb-1">Total Costs</p>
          <p className="text-base sm:text-lg font-['Times_New_Roman'] text-stone-950 font-extralight">
            {formatCurrency(forecast.totalCostsForecast)}
          </p>
        </div>
      </div>
    </div>
  )
}

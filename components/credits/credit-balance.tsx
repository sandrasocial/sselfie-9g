"use client"

import { useState } from "react"
import useSWR from "swr"
import { Coins, Plus, History } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function CreditBalance() {
  const [showHistory, setShowHistory] = useState(false)
  const { data, error, isLoading } = useSWR("/api/user/credits", fetcher)

  if (isLoading) {
    return (
      <div className="bg-stone-100/50 border border-stone-200/40 rounded-2xl p-6 animate-pulse">
        <div className="h-8 bg-stone-200/50 rounded w-24 mb-2"></div>
        <div className="h-12 bg-stone-200/50 rounded w-32"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-sm text-red-600">Failed to load credits</p>
      </div>
    )
  }

  const balance = data?.balance || 0
  const history = data?.history || []
  return (
    <div className="space-y-4">
      <div className="bg-stone-100/50 border border-stone-200/40 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-stone-950 rounded-xl flex items-center justify-center">
              <Coins size={24} className="text-stone-50" />
            </div>
            <div>
              <p className="text-xs tracking-[0.15em] uppercase font-light text-stone-500">Credit Balance</p>
              <p className="text-3xl font-serif font-extralight text-stone-950">{balance}</p>
            </div>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-3 bg-stone-50 border border-stone-200/40 rounded-xl hover:bg-stone-100 transition-all duration-200"
          >
            <History size={18} className="text-stone-600" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-stone-500 mb-1">Training</p>
            <p className="font-medium text-stone-950">20 credits</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-stone-500 mb-1">Image</p>
            <p className="font-medium text-stone-950">1 credit</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-stone-500 mb-1">Animation</p>
            <p className="font-medium text-stone-950">3 credits</p>
          </div>
        </div>

        <button onClick={() => (window.location.href = "/checkout/credits")} className="w-full mt-4 bg-stone-950 text-stone-50 py-3 rounded-xl text-sm font-medium tracking-[0.15em] uppercase hover:bg-stone-800 transition-all duration-200 flex items-center justify-center gap-2">
          <Plus size={16} />
          Buy More Credits
        </button>
      </div>

      {showHistory && (
        <div className="bg-stone-100/50 border border-stone-200/40 rounded-2xl p-6">
          <h3 className="text-sm tracking-[0.15em] uppercase font-light text-stone-950 mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-stone-500 text-center py-8">No transactions yet</p>
            ) : (
              history.map((transaction: any) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-3 border-b border-stone-200/40 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-950">{transaction.description}</p>
                    <p className="text-xs text-stone-500">{new Date(transaction.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${transaction.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                      {transaction.amount > 0 ? "+" : ""}
                      {transaction.amount}
                    </p>
                    <p className="text-xs text-stone-500">Balance: {transaction.balance_after}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

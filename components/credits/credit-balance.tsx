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
      <div className="bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-2xl p-6 animate-pulse">
        <div className="h-8 bg-[rgba(175,170,162,0.12)] rounded w-24 mb-2"></div>
        <div className="h-12 bg-[rgba(175,170,162,0.12)] rounded w-32"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-2xl p-6">
        <p className="text-sm text-[#8a8780]">Failed to load credits</p>
      </div>
    )
  }

  const balance = data?.balance || 0
  const history = data?.history || []
  return (
    <div className="space-y-4">
      <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[rgba(175,170,162,0.12)] border border-[rgba(195,190,182,0.25)] rounded-xl flex items-center justify-center">
              <Coins size={24} className="text-[#a8a49c]" />
            </div>
            <div>
              <p className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[#8a8780]">Credit Balance</p>
              <p className="font-['Cormorant_Garamond'] font-light text-3xl text-[#f0ede8]">{balance}</p>
              {balance > 0 && history.length === 0 && (
                <p className="text-xs text-[#8a8780] mt-1">Use credits in Maya or Feed to create your first image.</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-3 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl hover:bg-[rgba(175,170,162,0.18)] transition-all duration-200"
          >
            <History size={18} className="text-[#8a8780]" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.15)] rounded-xl p-3">
            <p className="text-[#8a8780] mb-1 font-['Inter']">Training</p>
            <p className="font-['Inter'] font-medium text-[#f0ede8]">20 credits</p>
          </div>
          <div className="bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.15)] rounded-xl p-3">
            <p className="text-[#8a8780] mb-1 font-['Inter']">Image</p>
            <p className="font-['Inter'] font-medium text-[#f0ede8]">1 credit</p>
          </div>
          <div className="bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.15)] rounded-xl p-3">
            <p className="text-[#8a8780] mb-1 font-['Inter']">Animation</p>
            <p className="font-['Inter'] font-medium text-[#f0ede8]">10 credits</p>
          </div>
        </div>

        <button onClick={() => (window.location.href = "/checkout/credits")} className="w-full mt-4 bg-[#c8c4bb] text-[#0d0c0b] py-3 rounded-full font-['Inter'] font-medium text-xs tracking-[0.15em] uppercase hover:bg-[#f0ede8] transition-all duration-200 flex items-center justify-center gap-2">
          <Plus size={16} />
          Buy More Credits
        </button>
      </div>

      {showHistory && (
        <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-6">
          <h3 className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[#8a8780] mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-[#8a8780] text-center py-8">No transactions yet</p>
            ) : (
              history.map((transaction: any) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-3 border-b border-[rgba(175,170,162,0.12)] last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-['Inter'] font-medium text-[#f0ede8]">{transaction.description}</p>
                    <p className="text-xs text-[#8a8780]">{new Date(transaction.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-['Inter'] font-medium ${transaction.amount > 0 ? "text-[#a8a49c]" : "text-[#8a8780]"}`}>
                      {transaction.amount > 0 ? "+" : ""}
                      {transaction.amount}
                    </p>
                    <p className="text-xs text-[#8a8780]">Balance: {transaction.balance_after}</p>
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

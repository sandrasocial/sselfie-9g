'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Instagram, RefreshCw, TrendingUp, Users, Eye, Heart } from 'lucide-react'
import { InstagramSetupGuide } from './instagram-setup-guide'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function InstagramConnectionManager() {
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showSetupGuide, setShowSetupGuide] = useState(false)

  // Fetch platform-wide Instagram analytics
  const { data: analytics, mutate } = useSWR('/api/instagram/analytics?scope=platform', fetcher, {
    refreshInterval: 60000, // Refresh every minute
  })

  const handleConnect = async () => {
    setConnecting(true)
    try {
      // Get admin user ID (you might want to fetch this from session)
      const userId = 'admin' // Replace with actual admin user ID

      const response = await fetch(`/api/instagram/connect?userId=${userId}`)
      const data = await response.json()

      if (data.authUrl) {
        // Open Instagram OAuth in new window
        window.open(data.authUrl, '_blank', 'width=600,height=800')
      }
    } catch (error) {
      console.error('[Instagram Connect Error]:', error)
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch('/api/instagram/sync', { method: 'POST' })
      mutate() // Refresh data
    } catch (error) {
      console.error('[Instagram Sync Error]:', error)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      {analytics?.totalConnections === 0 && (
        <InstagramSetupGuide />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5" />
                Instagram Analytics
              </CardTitle>
              <CardDescription>Connect Instagram accounts to track platform-wide metrics</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSync} disabled={syncing} size="sm" variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sync Data
              </Button>
              <Button onClick={handleConnect} disabled={connecting} size="sm">
                <Instagram className="h-4 w-4 mr-2" />
                Connect Account
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {analytics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <div className="text-right">
                        <p className="text-2xl font-bold">{analytics.totalConnections}</p>
                        <p className="text-xs text-muted-foreground">Connected Accounts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <Eye className="h-8 w-8 text-muted-foreground" />
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {analytics.platformMetrics?.total_impressions?.toLocaleString() || '0'}
                        </p>
                        <p className="text-xs text-muted-foreground">Total Impressions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <TrendingUp className="h-8 w-8 text-muted-foreground" />
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {analytics.platformMetrics?.total_reach?.toLocaleString() || '0'}
                        </p>
                        <p className="text-xs text-muted-foreground">Total Reach</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <Heart className="h-8 w-8 text-muted-foreground" />
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {analytics.platformMetrics?.avg_engagement_rate?.toFixed(2) || '0'}%
                        </p>
                        <p className="text-xs text-muted-foreground">Avg Engagement</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {analytics.totalConnections === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Instagram className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No Instagram accounts connected yet.</p>
                  <p className="text-sm">Connect your first account to start tracking analytics.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Loading Instagram analytics...</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'

export function InstagramGraphApiTester() {
  const [accessToken, setAccessToken] = useState('')
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runTest = async () => {
    if (!accessToken.trim()) {
      alert('Please enter an access token')
      return
    }

    setTesting(true)
    setResults(null)

    try {
      const response = await fetch('/api/instagram/test-graph-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: accessToken.trim() }),
      })

      const data = await response.json()
      setResults(data)
    } catch (error: any) {
      setResults({
        summary: { success: false },
        results: { errors: [error.message] },
        message: 'Test failed to run',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Instagram Graph API Tester</CardTitle>
          <CardDescription>
            Test your Facebook/Instagram Graph API access token to verify permissions and data access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Access Token</label>
            <Textarea
              placeholder="Paste your access token from Graph API Explorer..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Get your token from:{' '}
              <a
                href="https://developers.facebook.com/tools/explorer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Graph API Explorer
              </a>
            </p>
          </div>

          <Button onClick={runTest} disabled={testing || !accessToken.trim()} className="w-full">
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Run Test'
            )}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.summary?.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Test Results
            </CardTitle>
            <CardDescription>{results.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">User Found</p>
                <p className="text-2xl font-bold">
                  {results.summary?.user_found ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Pages Found</p>
                <p className="text-2xl font-bold">{results.summary?.pages_found || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">IG Accounts</p>
                <p className="text-2xl font-bold">{results.summary?.instagram_accounts_found || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Insights Fetched</p>
                <p className="text-2xl font-bold">{results.summary?.insights_fetched || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-500">{results.summary?.total_errors || 0}</p>
              </div>
            </div>

            {/* User Info */}
            {results.results?.step1_user && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Step 1: User Information
                </h3>
                <div className="bg-muted p-3 rounded-md text-sm font-mono">
                  <p>ID: {results.results.step1_user.id}</p>
                  <p>Name: {results.results.step1_user.name}</p>
                  {results.results.step1_user.email && <p>Email: {results.results.step1_user.email}</p>}
                </div>
              </div>
            )}

            {/* Pages */}
            {results.results?.step2_pages?.data && results.results.step2_pages.data.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Step 2: Facebook Pages ({results.results.step2_pages.data.length})
                </h3>
                <div className="space-y-2">
                  {results.results.step2_pages.data.map((page: any) => (
                    <div key={page.id} className="bg-muted p-3 rounded-md text-sm">
                      <p className="font-semibold">{page.name}</p>
                      <p className="text-xs text-muted-foreground">ID: {page.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instagram Accounts */}
            {results.results?.step3_instagram_accounts && results.results.step3_instagram_accounts.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Step 3: Instagram Business Accounts ({results.results.step3_instagram_accounts.length})
                </h3>
                <div className="space-y-2">
                  {results.results.step3_instagram_accounts.map((account: any, idx: number) => (
                    <div key={idx} className="bg-muted p-3 rounded-md text-sm space-y-1">
                      <p className="font-semibold">@{account.instagram.username}</p>
                      <p className="text-xs">{account.instagram.name}</p>
                      <p className="text-xs text-muted-foreground">Connected to: {account.page_name}</p>
                      <p className="text-xs text-muted-foreground">IG ID: {account.instagram.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights */}
            {results.results?.step4_insights && results.results.step4_insights.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Step 4: Instagram Insights
                </h3>
                <div className="space-y-3">
                  {results.results.step4_insights.map((insight: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <p className="font-semibold text-sm">@{insight.account}</p>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {insight.insights?.map((metric: any) => (
                          <div key={metric.name} className="bg-muted p-2 rounded-md">
                            <p className="text-xs text-muted-foreground">{metric.title}</p>
                            <p className="text-lg font-bold">
                              {metric.values?.[0]?.value || 'N/A'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {results.results?.errors && results.results.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Errors Encountered:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {results.results.errors.map((error: string, idx: number) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from 'lucide-react'

export function InstagramSetupGuide() {
  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          To use Instagram analytics in SSELFIE, you need to connect your Instagram Business account through a Facebook Page.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Instagram Graph API Setup Checklist</CardTitle>
          <CardDescription>Follow these steps to enable Instagram analytics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                1
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold">Convert Your Instagram to a Business Account</h3>
                <ol className="ml-4 space-y-1 text-sm text-muted-foreground list-decimal">
                  <li>Open Instagram app on your phone</li>
                  <li>Go to Settings → Account → Switch to Professional Account</li>
                  <li>Choose "Business" (or "Creator")</li>
                  <li>Complete the setup wizard</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                2
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold">Create a Facebook Page</h3>
                <ol className="ml-4 space-y-1 text-sm text-muted-foreground list-decimal">
                  <li>Go to <a href="https://www.facebook.com/pages/create" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">facebook.com/pages/create</a></li>
                  <li>Click "Create new Page"</li>
                  <li>Choose "Business or Brand"</li>
                  <li>Name it the same as your Instagram (e.g., "SSELFIE AI")</li>
                  <li>Add a profile picture and category</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                3
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold">Connect Instagram to Facebook Page</h3>
                <ol className="ml-4 space-y-1 text-sm text-muted-foreground list-decimal">
                  <li>Go to your Facebook Page</li>
                  <li>Click Settings → Instagram</li>
                  <li>Click "Connect Account"</li>
                  <li>Log in to your Instagram Business account</li>
                  <li>Confirm the connection</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                4
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold">Verify Connection in Graph API Explorer</h3>
                <ol className="ml-4 space-y-1 text-sm text-muted-foreground list-decimal">
                  <li>Go back to <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Graph API Explorer</a></li>
                  <li>Generate a new User Token with permissions</li>
                  <li>Test query: <code className="bg-muted px-1 py-0.5 rounded text-xs">me/accounts?fields=id,name,instagram_business_account</code></li>
                  <li>You should see your Facebook Page with an <code className="bg-muted px-1 py-0.5 rounded text-xs">instagram_business_account</code> field</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                5
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold">Connect in SSELFIE</h3>
                <p className="text-sm text-muted-foreground">
                  Once verified, click "Connect Account" above. You'll authorize SSELFIE to access your Instagram insights through your Facebook Page.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-900">Why This is Required</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-800 space-y-2">
          <p>
            Instagram Graph API requires a Facebook Page as an intermediary for security and permissions management. This is Meta's standard architecture for business integrations.
          </p>
          <p className="font-semibold">
            Without a Facebook Page connected to your Instagram Business account, the API cannot access your Instagram data.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

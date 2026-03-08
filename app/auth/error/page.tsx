import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[color:var(--app-bg-primary)] p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl uppercase tracking-[0.08em]">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent>
            {params?.error ? (
              <p className="text-sm text-[color:var(--color-smoke)]">Error: {params.error}</p>
            ) : (
              <p className="text-sm text-[color:var(--color-smoke)]">An unexpected error occurred.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

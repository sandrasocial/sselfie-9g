import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-black">
      <div className="w-full max-w-sm">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent>
            {params?.error ? (
              <p className="text-sm text-zinc-300">Error: {params.error}</p>
            ) : (
              <p className="text-sm text-zinc-300">An unexpected error occurred.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

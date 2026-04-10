"use client"

import dynamic from "next/dynamic"

const EditorialGeneratorClient = dynamic(
  () => import("@/components/editorial/EditorialGeneratorClient"),
  { ssr: false },
)

export default function EditorialGeneratorPage() {
  return <EditorialGeneratorClient />
}

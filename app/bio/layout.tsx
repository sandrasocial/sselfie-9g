import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Sandra's Links | SSELFIE - Professional AI Photos",
  description: "Get professional photos without a photographer. Choose from $49 photoshoots or $79/mo unlimited Studio membership.",
  openGraph: {
    title: "Sandra's Links | SSELFIE",
    description: "Professional AI photos for personal brands. Built from selfies. Built from nothing.",
    images: ['/professional-woman-entrepreneur-in-stylish-outfit-.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Sandra's Links | SSELFIE",
    description: "Professional AI photos for personal brands",
  },
}

export default function BioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

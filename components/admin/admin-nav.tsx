'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  { label: 'HOME', href: '/admin' },
  { label: 'INBOX', href: '/admin/ig-inbox' },
  { label: 'CONTENT', href: '/admin/content-brief' },
  { label: 'SUPPORT', href: '/admin/customer-support' },
]

const TOOL_ITEMS = [
  { label: 'Payment review', href: '/admin/webhook-review' },
  { label: 'Vault monitor', href: '/admin/prompt-vault' },
  { label: 'Brand Shoot monitor', href: '/admin/selfie-to-brand-shoot' },
  { label: 'Credits', href: '/admin/credits' },
  { label: 'Academy', href: '/admin/academy' },
  { label: 'Testimonials', href: '/admin/testimonials' },
]

export function AdminNav() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)

  const isToolPath = TOOL_ITEMS.some((item) => pathname === item.href)

  return (
    <nav className="border-b border-stone-200 bg-white sticky top-0 z-50" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 sm:px-6" suppressHydrationWarning>
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link href="/admin" className="flex-shrink-0">
            <h1 className="font-serif text-base sm:text-xl tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950">
              SSELFIE
            </h1>
            <p className="text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-400">
              Admin
            </p>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[10px] lg:text-xs tracking-[0.15em] lg:tracking-[0.2em] uppercase transition-colors py-1 ${
                  pathname === item.href
                    ? 'text-stone-950 border-b-2 border-stone-950'
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="relative">
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                className={`text-[10px] lg:text-xs tracking-[0.15em] lg:tracking-[0.2em] uppercase transition-colors py-1 ${
                  isToolPath || toolsOpen
                    ? 'text-stone-950 border-b-2 border-stone-950'
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                TOOLS
              </button>
              {toolsOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-stone-200 bg-white py-2 shadow-sm">
                  {TOOL_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setToolsOpen(false)}
                      className={`block px-4 py-2 text-xs transition-colors ${
                        pathname === item.href
                          ? 'text-stone-950 bg-stone-50'
                          : 'text-stone-500 hover:text-stone-950 hover:bg-stone-50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-stone-950 touch-manipulation"
            aria-label="Toggle menu"
          >
            <div className="space-y-1">
              <div className={`w-5 h-0.5 bg-stone-950 transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <div className={`w-5 h-0.5 bg-stone-950 transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <div className={`w-5 h-0.5 bg-stone-950 transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>

          {/* Desktop User Info */}
          <div className="hidden md:block text-right">
            <p className="text-[10px] lg:text-xs text-stone-950">Sandra</p>
            <p className="text-[8px] lg:text-[10px] text-stone-400">ssa@ssasocial.com</p>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 py-4">
            <div className="space-y-3">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 text-xs tracking-[0.2em] uppercase transition-colors min-h-[44px] flex items-center ${
                    pathname === item.href
                      ? 'text-stone-950 bg-stone-50 border-l-2 border-stone-950'
                      : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <p className="px-4 pt-2 text-[10px] uppercase tracking-[0.2em] text-stone-400">Tools</p>
              {TOOL_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 text-xs transition-colors flex items-center ${
                    pathname === item.href
                      ? 'text-stone-950 bg-stone-50 border-l-2 border-stone-950'
                      : 'text-stone-500 hover:text-stone-950 hover:bg-stone-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="px-4 pt-3 border-t border-stone-200">
                <p className="text-xs text-stone-950">Sandra</p>
                <p className="text-[10px] text-stone-400">ssa@ssasocial.com</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

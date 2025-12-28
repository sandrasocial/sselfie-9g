'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AdminNav() {
  const pathname = usePathname()
  
  const navItems = [
    { label: 'DASHBOARD', href: '/admin' },
    { label: 'MISSION CONTROL', href: '/admin/mission-control' },
    { label: 'JOURNAL', href: '/admin/journal' },
    { label: 'ALEX', href: '/admin/alex' },
    { label: 'ANALYTICS', href: '/admin/conversions' }
  ]
  
  return (
    <nav className="border-b border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div>
            <h1 className="font-['Times_New_Roman'] text-xl tracking-[0.3em] uppercase text-stone-950">
              SSELFIE STUDIO
            </h1>
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">Admin</p>
          </div>
          
          {/* Navigation */}
          <div className="flex gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-xs tracking-[0.2em] uppercase transition-colors ${
                  pathname === item.href
                    ? 'text-stone-950 border-b-2 border-stone-950'
                    : 'text-stone-400 hover:text-stone-600'
                } pb-1`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          
          {/* User Info */}
          <div className="text-right">
            <p className="text-xs text-stone-950">Sandra</p>
            <p className="text-[10px] text-stone-400">ssa@ssasocial.com</p>
          </div>
        </div>
      </div>
    </nav>
  )
}


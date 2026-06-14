'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, Zap, Users, Mail, Calendar, Building2, Rocket, Globe } from 'lucide-react'
import { AryaAvatar } from '@/components/arya/AryaAvatar'

const PRODUCT_ITEMS = [
  {
    icon: Zap,
    iconColor: 'text-violet-500 bg-violet-50',
    title: 'Ava, the AI BDR',
    desc: 'Put your outbound on autopilot',
    href: '/features',
  },
  {
    icon: Users,
    iconColor: 'text-blue-500 bg-blue-50',
    title: 'Find your ideal leads',
    desc: 'AI-powered prospect identification',
    href: '/features#leads',
  },
  {
    icon: Mail,
    iconColor: 'text-emerald-500 bg-emerald-50',
    title: 'Run autonomous campaigns',
    desc: 'Email and WhatsApp on autopilot',
    href: '/features#campaigns',
  },
  {
    icon: Calendar,
    iconColor: 'text-amber-500 bg-amber-50',
    title: 'Book meetings on autopilot',
    desc: 'Automated scheduling and follow ups',
    href: '/features#meetings',
  },
]

const SOLUTIONS_BY_TYPE = [
  {
    icon: Rocket,
    iconColor: 'text-violet-500 bg-violet-50',
    title: 'Startups',
    desc: 'Launch and scale outbound, fast',
    href: '/solutions/startups',
  },
  {
    icon: Building2,
    iconColor: 'text-blue-500 bg-blue-50',
    title: 'SMBs',
    desc: 'Grow your business, efficiently',
    href: '/solutions/smb',
  },
  {
    icon: Globe,
    iconColor: 'text-emerald-500 bg-emerald-50',
    title: 'Enterprise',
    desc: 'Scale outbound with full control',
    href: '/solutions/enterprise',
  },
]

const CUSTOMER_STORIES = [
  {
    title: 'SaaSCo replaced their outbound team with Arya',
    href: '/contact',
  },
  {
    title: 'TechStartup tripled outbound leads with Arya',
    href: '/contact',
  },
]

export function Navbar() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleEnter = useCallback((menu: string) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setOpenDropdown(menu)
  }, [])

  const handleLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setOpenDropdown(null)
    }, 150)
  }, [])

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <AryaAvatar size="sm" />
          <span className="font-bold text-gray-900 text-lg">AI SDR</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {/* Product dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleEnter('product')}
            onMouseLeave={handleLeave}
          >
            <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Product
              <svg className={`h-3.5 w-3.5 transition-transform duration-150 ${openDropdown === 'product' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {openDropdown === 'product' && (
              <div className="absolute top-full left-0 pt-2">
                <div className="w-[320px] rounded-xl bg-white shadow-xl border border-gray-100 p-2 animate-dropdown">
                  {PRODUCT_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-start gap-3 rounded-lg p-3 hover:bg-gray-50 transition-colors group"
                      onClick={() => setOpenDropdown(null)}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.iconColor} shrink-0`}>
                        <item.icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-[#6C47FF] transition-colors">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Solutions dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleEnter('solutions')}
            onMouseLeave={handleLeave}
          >
            <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Solutions
              <svg className={`h-3.5 w-3.5 transition-transform duration-150 ${openDropdown === 'solutions' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {openDropdown === 'solutions' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
                <div className="w-[520px] rounded-xl bg-white shadow-xl border border-gray-100 p-4 animate-dropdown">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left: By company type */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">By company type</p>
                      {SOLUTIONS_BY_TYPE.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-start gap-3 rounded-lg p-3 hover:bg-gray-50 transition-colors group"
                          onClick={() => setOpenDropdown(null)}
                        >
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.iconColor} shrink-0`}>
                            <item.icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-[#6C47FF] transition-colors">{item.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* Right: Customer stories */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Customer stories</p>
                      <div className="space-y-2">
                        {CUSTOMER_STORIES.map((story) => (
                          <Link
                            key={story.title}
                            href={story.href}
                            className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 hover:border-gray-200 transition-colors group"
                            onClick={() => setOpenDropdown(null)}
                          >
                            <p className="text-sm font-medium text-gray-900 group-hover:text-[#6C47FF] transition-colors leading-snug">{story.title}</p>
                            <span className="text-xs text-[#6C47FF] mt-1.5 inline-flex items-center gap-1">
                              Read story <ArrowRight className="h-3 w-3" />
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing link */}
          <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/contact" className="hidden sm:inline-flex text-sm text-gray-600 hover:text-gray-900 px-3 py-2">
            Get a demo
          </Link>
          <Link href="/sign-in" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors"
          >
            Start free trial <ArrowRight className="inline h-3 w-3 ml-1" />
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-dropdown {
          animation: dropdownIn 150ms ease-out;
        }
      `}</style>
    </nav>
  )
}

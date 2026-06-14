import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  const svg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6C47FF;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4F35CC;stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bg)" />

      <!-- White decorative circle -->
      <circle cx="900" cy="315" r="280" fill="white" fill-opacity="0.05" />
      <circle cx="950" cy="280" r="180" fill="white" fill-opacity="0.05" />

      <!-- Arya Avatar Circle -->
      <circle cx="880" cy="315" r="160" fill="white" fill-opacity="0.15" />
      <circle cx="880" cy="315" r="120" fill="white" fill-opacity="0.2" />
      <!-- Simple face -->
      <circle cx="880" cy="290" r="40" fill="white" fill-opacity="0.9" />
      <rect x="840" y="335" width="80" height="60" rx="20" fill="white" fill-opacity="0.9" />

      <!-- AI BDR Badge -->
      <rect x="820" y="445" width="120" height="32" rx="16" fill="#6C47FF" />
      <text x="880" y="466" font-family="Arial, sans-serif" font-size="14" fill="white" text-anchor="middle" font-weight="bold">AI BDR</text>

      <!-- Main text -->
      <text x="100" y="220" font-family="Arial, sans-serif" font-size="28" fill="white" fill-opacity="0.8" font-weight="400">Meet</text>
      <text x="100" y="290" font-family="Arial, sans-serif" font-size="80" fill="white" font-weight="800">Arya</text>
      <text x="100" y="360" font-family="Arial, sans-serif" font-size="36" fill="white" fill-opacity="0.9" font-weight="600">Your AI Sales Dev Rep</text>

      <!-- Subtext -->
      <text x="100" y="430" font-family="Arial, sans-serif" font-size="22" fill="white" fill-opacity="0.7">Finds leads. Writes outreach. Books meetings.</text>
      <text x="100" y="460" font-family="Arial, sans-serif" font-size="22" fill="white" fill-opacity="0.7">At a fraction of a human SDR cost.</text>

      <!-- Logo bottom left -->
      <rect x="100" y="540" width="36" height="36" rx="8" fill="white" fill-opacity="0.2" />
      <text x="118" y="564" font-family="Arial, sans-serif" font-size="18" fill="white" text-anchor="middle" font-weight="bold">A</text>
      <text x="148" y="564" font-family="Arial, sans-serif" font-size="20" fill="white" font-weight="600">AI SDR Agent</text>

      <!-- URL bottom right -->
      <text x="1100" y="564" font-family="Arial, sans-serif" font-size="18" fill="white" fill-opacity="0.6" text-anchor="end">aisdr-web.vercel.app</text>
    </svg>
  `

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

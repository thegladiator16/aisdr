import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['postgres', 'ioredis'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['postgres', 'ioredis'],
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
}
module.exports = nextConfig

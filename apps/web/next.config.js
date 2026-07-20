/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const cspDirectives = [
  "default-src 'self'",
  // unsafe-eval only needed in Next.js dev HMR; strip in production
  isProd
    ? "script-src 'self' 'unsafe-inline' https://clerk.accounts.dev https://*.clerk.accounts.dev https://clerk.aryasdr.in https://*.clerk.aryasdr.in https://challenges.cloudflare.com https://checkout.razorpay.com https://accounts.google.com https://apis.google.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.accounts.dev https://*.clerk.accounts.dev https://clerk.aryasdr.in https://*.clerk.aryasdr.in https://challenges.cloudflare.com https://checkout.razorpay.com https://accounts.google.com https://apis.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.clerk.accounts.dev wss://*.clerk.accounts.dev https://clerk.aryasdr.in https://*.clerk.aryasdr.in https://*.neon.tech https://api.anthropic.com https://*.upstash.io https://api.razorpay.com https://accounts.google.com",
  "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://clerk.aryasdr.in https://*.clerk.aryasdr.in https://api.razorpay.com https://accounts.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["postgres", "ioredis"],
  images: {
    // Restrict to known image CDNs to prevent SSRF via Next.js image optimization.
    // Add new patterns here rather than using the open '**' wildcard.
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
      { protocol: "https", hostname: "*.clerk.accounts.dev" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "*.cloudfront.net" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "uploadthing.com" },
      { protocol: "https", hostname: "*.uploadthing.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()",
          },
          {
            // 2-year max-age + preload as recommended
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: cspDirectives.join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

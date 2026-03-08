import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // Optimize production builds
  compress: true,

  // Performance optimizations
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/sample-bank-statement.pdf',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/pdf',
          },
          {
            key: 'Content-Disposition',
            value: 'attachment; filename="sample-bank-statement.pdf"',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache',
          },
        ],
      },
      // Add caching for static assets
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache fonts
      {
        source: '/:all*(woff|woff2|ttf|otf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig;

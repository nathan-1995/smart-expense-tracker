import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: false,
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
    ]
  },
}

export default nextConfig;

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Empty turbopack config to disable the warning
  turbopack: {},

  // Use "webpack" only if Turbopack is disabled
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": __dirname,
    }
    return config
  },
}

export default nextConfig;

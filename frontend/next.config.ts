import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",

  // Empty turbopack config to disable the warning
  turbopack: {},

  // Configure webpack to resolve @ alias
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    }
    return config
  },
}

export default nextConfig;

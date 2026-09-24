import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    cpus: 1,
    workerThreads: false
  }
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  eslint: { ignoreDuringBuilds: true },
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true
  },
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true
};

export default nextConfig;

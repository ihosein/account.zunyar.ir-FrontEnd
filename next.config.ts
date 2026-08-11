import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Public resume pretty-URLs (/:slug → /r/:slug) are handled in proxy.ts
  // so Persian / Unicode namaks work (config rewrites 404 on percent-encoded paths).
};

export default nextConfig;

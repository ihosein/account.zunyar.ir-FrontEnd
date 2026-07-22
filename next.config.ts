import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Pretty public resume URLs: account.zunyar.ir/{slug} → /r/{slug}
    // Excludes reserved app routes.
    return [
      {
        source:
          "/:slug((?!panel|login|api|r|_next|favicon\\.ico|images|fonts)[a-zA-Z0-9\\u0600-\\u06FF][a-zA-Z0-9\\u0600-\\u06FF-]{1,47})",
        destination: "/r/:slug",
      },
    ];
  },
};

export default nextConfig;

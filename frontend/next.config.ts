import type { NextConfig } from "next";

const additionalAllowedDevOrigins = [
  process.env.NGROK_DOMAIN,
  process.env.NEXT_PUBLIC_NGROK_DOMAIN,
].filter((origin): origin is string => Boolean(origin));

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok.app",
    ...additionalAllowedDevOrigins,
  ],
  staticPageGenerationTimeout: 60,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

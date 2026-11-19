import type { NextConfig } from "next";

// Where /api/v1/* is proxied to. Set BACKEND_URL in Vercel (e.g. https://api.13-234-10-20.sslip.io).
// Proxying keeps auth cookies first-party on the frontend domain.
const backendUrl = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

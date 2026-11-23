import type { NextConfig } from "next";

// Where /api/v1/* is proxied to. Set BACKEND_URL in Vercel (e.g. https://api.13-234-10-20.sslip.io).
// Proxying keeps auth cookies first-party on the frontend domain.
const backendUrl = (process.env.BACKEND_URL || "http://127.0.0.1:8000")
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\/+$/, "");

if (backendUrl.includes("SENSITIVE")) {
  throw new Error(
    `BACKEND_URL is marked "Sensitive" in Vercel, so builds run outside Vercel (vercel pull/build in CI) ` +
      `only receive a placeholder. Delete it and re-add it with "Sensitive" turned off.`,
  );
}

if (!/^https?:\/\//.test(backendUrl)) {
  throw new Error(
    `BACKEND_URL must be a full URL starting with https:// (or http://), e.g. https://api.example.com. ` +
      `Fix it in Vercel → Settings → Environment Variables.`,
  );
}

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

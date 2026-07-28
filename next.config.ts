import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker/Cloud Run runner image (server.js + minimal deps).
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          // camera=(self) — needed for photo capture on pledge/quiz forms
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), browsing-topics=()' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      // Google Cloud Storage (uploaded logos / posters)
      { protocol: 'https', hostname: 'storage.googleapis.com' },
    ],
  },
};

export default nextConfig;

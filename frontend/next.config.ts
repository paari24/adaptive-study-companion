import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['3078-2406-7400-bb-f816-bc4c-89c1-3f5f-4127.ngrok-free.app'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;

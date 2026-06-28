import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: 'http://localhost:5000/v1/:path*',
      },
    ]
  },
};

export default nextConfig;

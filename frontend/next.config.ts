import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendUrl =
      process.env.INTERNAL_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5000";
    return [
      {
        source: "/v1/:path*",
        destination: `${backendUrl.replace(/\/+$/, '')}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

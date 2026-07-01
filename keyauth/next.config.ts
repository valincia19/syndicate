import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone mode for Node.js VPS deployment
  output: "standalone",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Hostinger/Cloud Pages
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

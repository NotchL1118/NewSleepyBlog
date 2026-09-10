import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    serverActions: {
      // The CDN forwards to vercel.lsyfighting.cn while browsers use the canonical origin.
      allowedOrigins: ["lsyfighting.cn"],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/u/**",
      },
    ],
  },
};

export default nextConfig;

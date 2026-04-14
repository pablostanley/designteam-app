import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pixabots.com",
        pathname: "/api/pixabot/**",
      },
    ],
  },
};

export default nextConfig;

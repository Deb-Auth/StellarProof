import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Placeholder certificate thumbnails used by the search GridView.
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
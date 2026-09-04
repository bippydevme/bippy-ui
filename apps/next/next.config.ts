import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bippy-ui/pdf-flipper", "pdfjs-dist"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;

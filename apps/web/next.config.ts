import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Source-level shared packages — compiled through the Next pipeline.
  transpilePackages: ["@ibtatech/ui", "@ibtatech/utils", "@ibtatech/config", "@ibtatech/types"],
};

export default nextConfig;

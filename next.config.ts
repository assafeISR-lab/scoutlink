import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['@anthropic-ai/sdk'],
};

export default nextConfig;

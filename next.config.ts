import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['@anthropic-ai/sdk', '@prisma/adapter-pg', '@prisma/client'],
};

export default nextConfig;

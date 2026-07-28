import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  experimental: {
    outputFileTracingIncludes: {
      "*": [
        "./node_modules/.prisma/**/*",
        "./node_modules/@prisma/client/**/*",
        "./node_modules/@tauri-apps/**/*",
      ],
    },
    outputFileTracingRoot: ".",
  },
};

export default nextConfig;

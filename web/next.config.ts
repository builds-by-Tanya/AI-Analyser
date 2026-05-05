import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  },
  // Keep playwright outside the bundle — these are large native-code packages
  serverExternalPackages: [
    'playwright',
    'playwright-core',
    'playwright-extra',
    'puppeteer-extra-plugin-stealth',
  ],
  turbopack: {},
};

export default nextConfig;

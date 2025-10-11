/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is enabled by default in Next.js 15+
  // Routes should be in /app directory (not /src/app)
  reactStrictMode: true,
  // Ensure Next uses this project directory as the root for tracing/build artifacts
  outputFileTracingRoot: __dirname,
  eslint: {
    // Avoid build failures/noisy errors during full rebuilds; run `pnpm lint` separately
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

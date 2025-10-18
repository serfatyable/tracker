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
  // Webpack configuration for xlsx library
  webpack: (config, { isServer }) => {
    // Don't resolve xlsx on the client side with Node.js dependencies
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        zlib: false,
      };
    }
    return config;
  },
  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

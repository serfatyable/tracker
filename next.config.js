/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is enabled by default in Next.js 15+
  // Routes should be in /app directory (not /src/app)
  reactStrictMode: true,
  // Ensure Next uses this project directory as the root for tracing/build artifacts
  outputFileTracingRoot: __dirname,
  eslint: {
    // Run ESLint during builds for better CI/CD integration
    ignoreDuringBuilds: false,
  },
  // Performance optimizations and instrumentation
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'firebase'],
  },
  // Webpack configuration for xlsx library and pnpm symlinks
  webpack: (config, { isServer }) => {
    // Enable symlink resolution for pnpm
    config.resolve.symlinks = true;

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
          {
            key: 'Content-Security-Policy',
            value: [
              // Default: only allow resources from same origin
              "default-src 'self'",
              // Scripts: allow self, Firebase, and inline scripts (required for Next.js)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.firebaseapp.com https://*.gstatic.com",
              // Styles: allow self and inline styles (required for Next.js CSS-in-JS)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Images: allow self, data URIs, Firebase Storage, and Google CDNs
              "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://firebasestorage.googleapis.com",
              // Fonts: allow self and Google Fonts
              "font-src 'self' data: https://fonts.gstatic.com",
              // Connect: allow API calls to Firebase and self
              "connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.firebaseio.com https://firestore.googleapis.com wss://*.firebaseio.com",
              // Frames: only allow same origin (for security)
              "frame-src 'self'",
              // Objects: disallow plugins
              "object-src 'none'",
              // Base URI: restrict to self
              "base-uri 'self'",
              // Form actions: only allow same origin
              "form-action 'self'",
              // Upgrade insecure requests
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

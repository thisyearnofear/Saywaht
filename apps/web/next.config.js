/** @type {import('next').NextConfig} */

// Minimal Next.js configuration for build stability
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Security headers (COOP/COEP removed to support Coinbase Smart Wallet)
  async headers() {
    return [
      {
        // Keep CORP for static assets, but do not set COOP/COEP to avoid wallet SDK issues
        source:
          "/:all*(jpg|jpeg|gif|png|svg|ico|webp|mp4|webm|ogg|mp3|wav|flac|aac|woff|woff2|ttf|otf)",
        headers: [
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
        ],
      },
      {
        source: "/templates/:path*",
        headers: [
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
        ],
      },
    ];
  },

  // Basic webpack config for FFmpeg
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;

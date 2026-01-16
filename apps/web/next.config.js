/** @type {import('next').NextConfig} */

// Minimal Next.js configuration for build stability
const nextConfig = {
  reactStrictMode: true,
  
  // Add turbopack config to silence the warning
  turbopack: {},

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

  // Basic webpack config for FFmpeg and browser compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Ensure bs58 and other Node.js modules work in browser
    config.resolve.alias = {
      ...config.resolve.alias,
      bs58: require.resolve("bs58"),
      "@react-native-async-storage/async-storage": false,
    };

    // Handle ESM imports for Coinbase SDK
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    // Add special handling for Coinbase SDK modules
    config.module.rules.push({
      test: /\.js$/,
      include: [
        /node_modules\/@coinbase\/cdp-sdk/,
        /node_modules\/@base-org\/account/,
      ],
      type: 'javascript/auto',
    });

    return config;
  },
};

module.exports = nextConfig;

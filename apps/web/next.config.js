const path = require("path");

/** @type {import('next').NextConfig} */

// Minimal Next.js configuration for build stability
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,

  transpilePackages: [
    "@wagmi/connectors",
    "@base-org/account",
    "@coinbase/cdp-sdk",
    "bs58",
    "multiformats",
    "@web3-storage/w3up-client",
    "@ucanto/core",
    "@ucanto/client",
    "@ucanto/transport",
    "@ucanto/interface",
    "@ucanto/principal",
    "@ucanto/validator",
    "uint8arrays",
  ],

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
    } else {
      // Mock indexedDB on server to prevent SSR errors
      config.resolve.alias = {
        ...config.resolve.alias,
        'idb-keyval': false,
      };
    }

    // Ensure bs58 and other Node.js modules work in browser
    config.resolve.alias = {
      ...config.resolve.alias,
      bs58: path.resolve(__dirname, "node_modules/bs58/src/esm/index.js"),
      "@react-native-async-storage/async-storage": false,
      // Fix for @huggingface/transformers trying to load node-specific binaries
      "sharp$": false,
      "onnxruntime-node$": false,
    };

    // Support WASM files (used by @huggingface/transformers)
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Fix for ESM modules in dependencies
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /onnxruntime-web[\\/]dist[\\/]ort\.bundle\.min\.mjs$/,
        message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      },
    ];

    return config;
  },

  // Empty turbopack config to silence Next.js 16 warning
  turbopack: {},
};

module.exports = nextConfig;

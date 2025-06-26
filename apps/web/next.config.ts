import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  output: "standalone",
  webpack: (config) => {
    // Add support for Web Workers
    config.module.rules.push({
      test: /worker\.js$/,
      use: {
        loader: 'worker-loader',
        options: {
          inline: 'no-fallback',
        },
      },
    });
    return config;
  },
};

export default nextConfig;

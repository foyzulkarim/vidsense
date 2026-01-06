import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable the X-Powered-By header
  poweredByHeader: false,

  // Enable experimental features
  experimental: {
    // Server actions are enabled by default in Next.js 14+
  },

  // Configure allowed image domains if needed
  images: {
    remotePatterns: [],
  },

  // Webpack configuration for handling video files
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i,
      type: 'asset/resource',
    });
    return config;
  },
};

export default nextConfig;

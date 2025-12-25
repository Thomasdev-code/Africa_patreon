/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Correct way to exclude Prisma from bundling in Next 16
  serverExternalPackages: ['@prisma/client'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  // Webpack config (safe since we force --webpack)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
        },
      }
    }
    return config
  },
}

module.exports = nextConfig

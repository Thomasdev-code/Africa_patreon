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
}

module.exports = nextConfig

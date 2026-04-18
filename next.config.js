/** @type {import('next').NextConfig} */
const nextConfig = {
  // No Next.js 15, serverActions é estável — sem wrapper "experimental"
  serverExternalPackages: ["@prisma/client", "prisma"],
};

module.exports = nextConfig;

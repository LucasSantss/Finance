/** @type {import('next').NextConfig} */
const nextConfig = {
  // No Next.js 15, serverActions é estável — sem wrapper "experimental"
  serverExternalPackages: ["@prisma/client", "prisma"],
 
  // Necessário para o NextAuth v5 montar corretamente as URLs de callback na Vercel
  experimental: {
    serverActions: {
      allowedOrigins: [
        "finance-umber-two.vercel.app",
        "localhost:3000",
      ],
    },
  },
};
 
module.exports = nextConfig;
 
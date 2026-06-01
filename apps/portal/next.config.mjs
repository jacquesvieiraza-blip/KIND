/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@kind/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig

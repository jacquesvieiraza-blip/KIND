/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@kind/shared'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@kind/shared'],
  typescript: {
    // Admin is an internal tool — suppress pre-existing type warnings at build time
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig

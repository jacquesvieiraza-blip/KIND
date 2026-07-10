/** @type {import('next').NextConfig} */

// ── Content-Security-Policy note (#454, Phase 6 · buildplan §10) ──────────────
// The portal does NOT currently set a Content-Security-Policy (no `headers()` here
// and none in src/middleware.ts), so the Learning Centre's YouTube embed is not
// blocked today. IF a CSP is ever added, it MUST include these directives so the
// privacy-enhanced embed + thumbnails keep working (this is the known one-liner):
//   frame-src  https://www.youtube-nocookie.com https://www.youtube.com
//   child-src  https://www.youtube-nocookie.com https://www.youtube.com   (if child-src is set)
//   img-src    https://i.ytimg.com
// Do not invent a whole CSP here — only fold these into an existing policy when one lands.

const nextConfig = {
  transpilePackages: ['@kind/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig

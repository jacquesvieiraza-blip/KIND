import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'K.I.N.D — AI Revenue OS',
    short_name: 'K.I.N.D',
    description: 'Your AI Revenue OS — FIGSY outreach, Milla assistant, lead generation.',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFF5EE',
    theme_color: '#7C3AED',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        url: '/dashboard',
        description: 'Mission Control',
      },
      {
        name: 'Leads',
        url: '/dashboard/leads',
        description: 'Your lead pipeline',
      },
      {
        name: 'FIGSY',
        url: '/dashboard/figsy',
        description: 'AI outreach campaigns',
      },
    ],
  }
}

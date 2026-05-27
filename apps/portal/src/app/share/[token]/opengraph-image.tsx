import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt     = 'KIND Campaign Report'
export const size    = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          justifyContent:  'center',
          width:           '100%',
          height:          '100%',
          background:      'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)',
          fontFamily:      'system-ui, sans-serif',
          gap:             24,
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            width:           80,
            height:          80,
            borderRadius:    20,
            background:      'linear-gradient(135deg, #7C3AED, #A855F7)',
            boxShadow:       '0 12px 40px rgba(124,58,237,0.35)',
            color:           '#fff',
            fontSize:        40,
            fontWeight:      900,
          }}
        >
          K
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize:   56,
            fontWeight: 900,
            color:      '#1E0A5C',
            letterSpacing: '-1px',
          }}
        >
          K.I.N.D
        </div>

        {/* Badge */}
        <div
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          8,
            padding:      '10px 24px',
            borderRadius: 999,
            background:   'rgba(124,58,237,0.1)',
            border:       '1px solid rgba(124,58,237,0.25)',
            color:        '#7C3AED',
            fontSize:     22,
            fontWeight:   600,
          }}
        >
          Campaign Report
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize:   18,
            color:      '#9CA3AF',
            marginTop:  8,
          }}
        >
          Outreach performance · powered by K.I.N.D
        </div>
      </div>
    ),
    { ...size },
  )
}

import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
          borderRadius: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          fontWeight: 800,
          fontSize: 220,
          color: 'white',
          letterSpacing: -8,
        }}
      >
        K
      </div>
    ),
    { ...size },
  )
}

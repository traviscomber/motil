import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <svg width="512" height="512" viewBox="0 0 512 512">
        <rect width="512" height="512" rx="96" fill="#0a0a0a" />
        <path
          fill="#f5f0e6"
          d="M122 110h86l48 118 48-118h86v292h-72V240l-37 92h-50l-37-92v162h-72V110z"
        />
      </svg>
    ),
    {
      width: 512,
      height: 512,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  );
}

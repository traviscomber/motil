import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
        }}
      >
        <img
          src="https://www.motil.app/icon-512.png"
          alt=""
          width="192"
          height="192"
          style={{ width: '192px', height: '192px' }}
        />
      </div>
    ),
    {
      width: 192,
      height: 192,
    },
  );
}

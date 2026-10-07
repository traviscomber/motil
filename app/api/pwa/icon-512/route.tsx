import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const wordmark = new URL('/brand/motil-wordmark.png', request.url).toString();

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
          borderRadius: '22%',
        }}
      >
        <img
          src={wordmark}
          alt=""
          width="394"
          height="115"
          style={{
            width: '77%',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>
    ),
    {
      width: 512,
      height: 512,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    },
  );
}

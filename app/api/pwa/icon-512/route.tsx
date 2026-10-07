import { ImageResponse } from 'next/og';

export const runtime = 'edge';

function toDataUri(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

export async function GET(request: Request) {
  const logoUrl = new URL('/brand/motil-wordmark.png', request.url);
  const logoResponse = await fetch(logoUrl, { cache: 'no-store' });
  if (!logoResponse.ok) {
    return new Response('MOTIL logo unavailable', { status: 502 });
  }

  const logoDataUri = toDataUri(new Uint8Array(await logoResponse.arrayBuffer()));

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
          src={logoDataUri}
          alt=""
          width="394"
          height="115"
          style={{ objectFit: 'contain' }}
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

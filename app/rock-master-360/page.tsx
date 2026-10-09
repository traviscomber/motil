import { notFound } from 'next/navigation';
import LandingStone from '../landing-stone';
import '../landing.css';

export const dynamic = 'force-dynamic';

const angles = [0, 90, 180, 270] as const;

// Deliberately unavailable on production. This is an isolated visual release gate.
export default async function RockMaster360({
  searchParams,
}: {
  searchParams: Promise<{ angle?: string }>;
}) {
  if (process.env.VERCEL_ENV !== 'preview' && process.env.NODE_ENV !== 'development') notFound();
  const query = await searchParams;
  const selected = angles.find((value) => String(value) === query.angle) ?? 0;

  return (
    <main className="motil-landing min-h-screen bg-[#171715] text-[#e8e3d6]">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-12">
        <p className="mb-5 text-[11px] tracking-[0.32em] uppercase text-[#aaa69c]">MOTIL / Brand laboratory / Preview only</p>
        <h1 className="font-light text-3xl md:text-4xl">Rock Master v1</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#aaa69c]">
          Revisión 360° del modelo original con sus colores por vértice y material PBR.
          Arrastra la roca para rotarla libremente o inspecciona los cuatro ángulos fijos.
          La iluminación es neutra y no modifica el color del archivo.
        </p>
        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Vista de la roca">
          {angles.map((angle) => (
            <a
              key={angle}
              href={`/rock-master-360?angle=${angle}`}
              aria-current={selected === angle ? 'page' : undefined}
              className={`border px-5 py-3 text-xs tracking-widest transition-colors ${selected === angle
                ? 'border-[#b95732] text-[#e8e3d6]'
                : 'border-[#393833] text-[#aaa69c] hover:border-[#747169] hover:text-[#e8e3d6]'}`}
            >
              {angle}°
            </a>
          ))}
        </nav>
        <div className="mt-10 flex min-h-[360px] items-center justify-center border border-[#292925] bg-[#20201d] p-4 md:min-h-[600px]">
          <LandingStone force3D initialYaw={selected} />
        </div>
        <p className="mt-7 text-xs leading-6 text-[#aaa69c]">
          Modelo: /motil-rock-master-v1.glb · Fallback visual: /brand/hero-stone.png.
          No se activa el 3D del hero en producción hasta aprobar los cuatro lados.
        </p>
      </div>
    </main>
  );
}

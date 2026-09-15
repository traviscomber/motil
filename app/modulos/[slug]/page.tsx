import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const modules = {
  produccion: {
    name: 'Producción Minera',
    title: 'Software de producción minera',
    description: 'Transporte de Mineral, planta, metalurgia, geología, topografía, química y sondaje conectados a la trazabilidad operacional.',
    capabilities: ['Transporte de Mineral', 'Planta y metalurgia', 'Geología y topografía', 'Química', 'Sondaje de producción y exploración'],
    operations: [
      'Conecta el movimiento de mineral con los registros de planta y el contexto de la operación.',
      'Mantiene información de geología, topografía, química y sondaje dentro del mismo entorno operacional.',
      'Relaciona la evidencia de producción con personas, equipos, turnos y áreas responsables cuando esos datos están disponibles.',
    ],
    outcome: 'El objetivo es reducir registros aislados entre mina y planta y mantener continuidad desde el dato capturado en terreno hasta su revisión operacional.',
  },
  mantenimiento: {
    name: 'Mantenimiento Minero',
    title: 'Software de mantenimiento minero',
    description: 'Órdenes de trabajo, activos móviles y estáticos, planificación, vehículos, historial técnico y Maestranza.',
    capabilities: ['Órdenes de trabajo', 'Equipos móviles y estáticos', 'Vehículos', 'Planificación preventiva', 'Maestranza e historial'],
    operations: [
      'Organiza órdenes de trabajo y las vincula con el activo, responsables, planificación y evidencia de ejecución.',
      'Mantiene historial técnico para equipos móviles, equipos estáticos y vehículos dentro del contexto de la faena.',
      'Conecta mantenimiento preventivo, trabajo de taller y consumo de repuestos con las áreas habilitadas del Mining OS.',
    ],
    outcome: 'La operación puede seguir el ciclo de mantenimiento con una trazabilidad común, evitando que planificación, ejecución, activos y evidencia queden repartidos en sistemas separados.',
  },
  inventario: {
    name: 'Inventario Minero',
    title: 'Inventario y repuestos para minería',
    description: 'Stock, reservas, movimientos, reposición y trazabilidad de repuestos y materiales para la operación.',
    capabilities: ['Stock y movimientos', 'Reservas', 'Reposición', 'Repuestos críticos', 'Historial de consumo'],
    operations: ['Mantiene stock y movimientos con trazabilidad.', 'Relaciona reservas y reposición con necesidades operacionales.', 'Conserva historial de consumo de repuestos y materiales.'],
    outcome: 'Inventario comparte contexto con las áreas habilitadas para sostener una fuente común de información operacional.',
  },
  compras: {
    name: 'Compras Mineras',
    title: 'Compras y proveedores para minería',
    description: 'Cotizaciones, comparación de proveedores, órdenes de compra y seguimiento del abastecimiento.',
    capabilities: ['Cotizaciones', 'Comparación de proveedores', 'Órdenes de compra', 'Proveedores aprobados', 'Seguimiento'],
    operations: ['Ordena solicitudes y cotizaciones.', 'Permite comparar alternativas de proveedores.', 'Mantiene seguimiento de órdenes y abastecimiento.'],
    outcome: 'Compras conecta el abastecimiento con la necesidad operacional que le dio origen cuando ese contexto está disponible.',
  },
  finanzas: {
    name: 'Finanzas Mineras',
    title: 'Control financiero para operaciones mineras',
    description: 'Costos, compromisos, centros de costo y trazabilidad financiera conectados a la operación.',
    capabilities: ['Centros de costo', 'Compromisos', 'Costos operacionales', 'Trazabilidad financiera', 'Resumen certificado'],
    operations: ['Organiza costos y compromisos.', 'Relaciona información con centros de costo.', 'Mantiene trazabilidad entre hechos operacionales y su contexto financiero.'],
    outcome: 'Finanzas permite revisar el impacto económico de la operación sin separar la información de su origen operacional.',
  },
  rrhh: {
    name: 'RRHH Minería',
    title: 'RRHH y desempeño para minería',
    description: 'Personas, asignaciones laborales, competencias, desempeño, evidencia operacional y ficha laboral 360°.',
    capabilities: ['Ficha laboral 360°', 'Competencias y credenciales', 'Desempeño', 'Evidencia operacional', 'Historial laboral'],
    operations: ['Concentra información laboral relevante.', 'Relaciona competencias y credenciales con las personas.', 'Conserva evidencia e historial dentro de los permisos definidos.'],
    outcome: 'RRHH conecta el contexto de las personas con la operación sin duplicar la fuente de verdad laboral.',
  },
  sostenibilidad: {
    name: 'Sostenibilidad y HSE',
    title: 'HSE y sostenibilidad para minería',
    description: 'Prevención de riesgos, inspecciones, EPP, medio ambiente, comunidades y cumplimiento en una misma área.',
    capabilities: ['Prevención de riesgos', 'Inspecciones', 'EPP', 'Medio ambiente', 'Comunidades y cumplimiento'],
    operations: ['Ordena evidencia de prevención e inspecciones.', 'Mantiene contexto de EPP y seguridad.', 'Conecta registros ambientales, comunidades y cumplimiento según los flujos habilitados.'],
    outcome: 'Sostenibilidad mantiene evidencia revisable y conectada con el contexto operacional correspondiente.',
  },
  legal: {
    name: 'Legal Minería',
    title: 'Contratos y cumplimiento para minería',
    description: 'Contratos, documentos, permisos, vencimientos y cumplimiento con trazabilidad documental.',
    capabilities: ['Contratos', 'Documentos', 'Permisos y licencias', 'Vencimientos', 'Cumplimiento'],
    operations: ['Centraliza documentos y contratos.', 'Mantiene seguimiento de permisos, licencias y vencimientos.', 'Relaciona evidencia documental con responsables y áreas cuando corresponde.'],
    outcome: 'Legal mantiene continuidad documental y trazabilidad sin reemplazar la revisión profesional o regulatoria que corresponda.',
  },
} as const;

type ModuleSlug = keyof typeof modules;

export function generateStaticParams() {
  return Object.keys(modules).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const mod = modules[slug as ModuleSlug];
  if (!mod) return {};
  return {
    title: `${mod.title} en Chile`,
    description: `${mod.description} Parte de MOTIL Mining OS para operaciones mineras en Chile.`,
    alternates: { canonical: `/modulos/${slug}` },
  };
}

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mod = modules[slug as ModuleSlug];
  if (!mod) notFound();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← MOTIL Mining OS</Link>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-primary">Módulo MOTIL · Minería Chile</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">{mod.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{mod.description}</p>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Capacidades principales</h2>
          <div className="mt-5 overflow-hidden rounded-lg border bg-card">
            {mod.capabilities.map((item) => <div key={item} className="border-b px-4 py-4 text-sm font-medium last:border-0">{item}</div>)}
          </div>
        </section>

        <section className="mt-12 border-t pt-10">
          <h2 className="text-2xl font-semibold">Cómo se integra en la operación minera</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {mod.operations.map((item) => <p key={item} className="rounded-lg border bg-card p-5 text-sm leading-relaxed text-muted-foreground">{item}</p>)}
          </div>
          <p className="mt-6 max-w-3xl leading-relaxed text-muted-foreground">{mod.outcome}</p>
        </section>

        <section className="mt-12 grid gap-8 border-t pt-10 md:grid-cols-2">
          <div><h2 className="text-xl font-semibold">Conectado al Mining OS</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">El módulo comparte contexto con las demás áreas habilitadas sin duplicar la fuente de verdad operacional.</p></div>
          <div><h2 className="text-xl font-semibold">Trazabilidad operacional</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Las acciones relevantes mantienen historial y evidencia para revisión operacional, auditoría y toma de decisiones.</p></div>
        </section>

        <section className="mt-12 border-t pt-10">
          <h2 className="text-xl font-semibold">Software minero conectado para Chile</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{mod.name} forma parte de MOTIL Mining OS, una plataforma modular para conectar producción, mantenimiento, inventario, compras, finanzas, RRHH, sostenibilidad HSE y legal bajo una trazabilidad común.</p>
        </section>

        <div className="mt-12 flex flex-wrap gap-4"><Link className="text-sm font-medium text-primary hover:underline" href="/mineria-chile">Software para minería en Chile</Link><Link className="text-sm font-medium text-primary hover:underline" href="/">Ver todos los módulos</Link></div>
      </div>
    </main>
  );
}

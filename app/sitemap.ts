import type { MetadataRoute } from 'next';

const baseUrl = 'https://www.motil.app';
const moduleSlugs = ['produccion', 'mantenimiento', 'inventario', 'compras', 'finanzas', 'rrhh', 'sostenibilidad', 'legal'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/mineria-chile`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    ...moduleSlugs.map((slug) => ({
      url: `${baseUrl}/modulos/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: slug === 'produccion' || slug === 'mantenimiento' ? 0.85 : 0.75,
    })),
  ];
}

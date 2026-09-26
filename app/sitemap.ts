import type { MetadataRoute } from 'next';

const baseUrl = 'https://www.motil.app';
const moduleSlugs = ['produccion', 'mantenimiento', 'inventario', 'compras', 'finanzas', 'rrhh', 'sostenibilidad', 'legal'];

/* Hreflang alternates: the unprefixed URL is the canonical Spanish (es-CL /
   x-default) version; /en/* serves the English rendering of the same page. */
function languages(path: string) {
  return {
    'es-CL': `${baseUrl}${path}`,
    en: `${baseUrl}/en${path}`,
    'x-default': `${baseUrl}${path}`,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: { languages: languages('/') },
    },
    {
      url: `${baseUrl}/mineria-chile`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: { languages: languages('/mineria-chile') },
    },
    ...moduleSlugs.map((slug) => ({
      url: `${baseUrl}/modulos/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: slug === 'produccion' || slug === 'mantenimiento' ? 0.85 : 0.75,
      alternates: { languages: languages(`/modulos/${slug}`) },
    })),
  ];
}

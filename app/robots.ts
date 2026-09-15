import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/auth/', '/dashboard/', '/demo/', '/login/', '/portal/'],
    },
    sitemap: 'https://www.motil.app/sitemap.xml',
    host: 'https://www.motil.app',
  };
}

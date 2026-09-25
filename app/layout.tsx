import type { Metadata } from 'next';

import { Geist, Geist_Mono, Manrope, Montserrat } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import './globals.css';
import './motil-system.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.motil.app'),
  title: {
    default: 'MOTIL | Sistema Operativo para Minería en Chile',
    template: '%s | MOTIL Mining OS',
  },
  description:
    'MOTIL es un Sistema Operativo para Minería en Chile. Conecta producción, mantenimiento, inventario, compras, finanzas, RRHH, sostenibilidad HSE y legal con trazabilidad operacional y evidencia auditable.',
  applicationName: 'MOTIL Mining OS',
  authors: [{ name: 'Neuralia' }],
  creator: 'Neuralia',
  publisher: 'Neuralia',
  category: 'Sistema Operativo para Minería',
  keywords: [
    'sistema operativo para minería',
    'sistemas operativos para minería',
    'software minero Chile',
    'software de gestión minera',
    'Mining Operating System',
    'sistema de gestión minera',
    'ERP minero Chile',
    'software mantenimiento minero',
    'software producción minera',
    'gestión HSE minería',
    'RRHH minería',
    'trazabilidad minera',
    'operaciones mineras Chile',
    'software faena minera',
    'MOTIL Mining OS',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: 'https://www.motil.app',
    siteName: 'MOTIL Mining OS',
    title: 'MOTIL | Sistema Operativo para Minería',
    description: 'Una plataforma operacional para conectar la faena completa con trazabilidad, evidencia y control por área.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MOTIL | Sistema Operativo para Minería',
    description: 'Sistema Operativo para Minería desarrollado en Chile.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CL" className={`${geist.variable} ${geistMono.variable} ${montserrat.variable} ${manrope.variable} scroll-smooth`} suppressHydrationWarning>
      <head><meta charSet="utf-8" /></head>
      <body className="bg-background font-sans text-foreground antialiased selection:bg-primary/20 selection:text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="motil-theme" disableTransitionOnChange>
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}

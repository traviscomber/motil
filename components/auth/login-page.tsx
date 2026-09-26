'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, CheckCircle2, ShieldCheck, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const accessBenefits = [
  'Acceso centralizado para operación, mantención y gerencia',
  'Trazabilidad de acciones y evidencia de trabajo',
  'Contexto y permisos aplicados según el usuario',
];

function getSafeRedirect() {
  if (typeof window === 'undefined') return '/dashboard';

  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) return '/dashboard';
  return redirect;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorMessage = new URLSearchParams(window.location.search).get('error');
    if (errorMessage) {
      setError(errorMessage === 'session_expired' ? 'Tu sesión expiró. Inicia sesión nuevamente.' : errorMessage);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        const sessionResponse = await fetch('/api/me/access', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!sessionResponse.ok) {
          setError('Las credenciales fueron aceptadas, pero la sesión no pudo establecerse. Intenta nuevamente.');
          return;
        }

        window.location.replace(getSafeRedirect());
        return;
      }
      setError(data?.error || 'Credenciales inválidas');
    } catch {
      setError('No fue posible conectar con el servicio de acceso. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8" suppressHydrationWarning>
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_420px]">
        <section className="order-2 space-y-6 lg:order-1">
          <Image
            src="/brand/motil-wordmark.png"
            alt="MOTIL"
            width={2094}
            height={610}
            priority
            className="h-9 w-auto"
          />
          <div className="inline-flex items-center gap-2 rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
            <ShieldCheck className="h-4 w-4" />
            Acceso seguro a Motil
          </div>

          <div className="space-y-3">
            <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Gestión operacional conectada y trazable
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Accede a producción, mantenimiento, inventario, HSE, documentos y control financiero desde un solo entorno.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-card p-4">
              <Wrench className="mb-3 h-5 w-5 text-primary" />
              <p className="font-semibold">Operación diaria</p>
              <p className="mt-1 text-sm text-muted-foreground">Órdenes, activos, inventario y seguimiento en terreno.</p>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <CheckCircle2 className="mb-3 h-5 w-5 text-secondary" />
              <p className="font-semibold">Control y evidencia</p>
              <p className="mt-1 text-sm text-muted-foreground">Historial, documentos, permisos y decisiones trazables.</p>
            </div>
          </div>

          <ul className="space-y-3 text-sm text-muted-foreground">
            {accessBenefits.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="order-1 lg:order-2">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
              <CardDescription>Motil · Plataforma operacional</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
                {error ? (
                  <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Correo electrónico</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@empresa.cl"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading} aria-busy={isLoading}>
                  {isLoading ? 'Ingresando…' : 'Iniciar sesión'}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Solicita acceso al administrador de tu organización cuando no tengas credenciales.
                </p>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

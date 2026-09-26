'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Dictionary } from '@/lib/i18n/dictionaries';

export function RegisterPage({ dictionary }: { dictionary: Dictionary }) {
  const t = dictionary.auth.register;
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return t.passwordRules.minChars;
    if (!/[A-Z]/.test(pwd)) return t.passwordRules.upper;
    if (!/[0-9]/.test(pwd)) return t.passwordRules.number;
    if (!/[!@#$%^&*]/.test(pwd)) return t.passwordRules.symbol;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email || !password || !confirmPassword || !fullName) {
      setError(t.errors.allFields);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.errors.mismatch);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(`${t.errors.weakPrefix}: ${passwordError}`);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'operador_produccion',
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch {
      setError(t.errors.signupFailed);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Image
            src="/brand/motil-wordmark.png"
            alt="MOTIL"
            width={2094}
            height={610}
            priority
            className="h-10 w-auto"
          />
        </div>

        <Card className="border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">{t.title}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-8">
                <CheckCircle2 className="h-12 w-12 text-[var(--brand-verde)]" />
                <p className="text-center font-semibold">{t.successTitle}</p>
                <p className="text-center text-sm text-muted-foreground">{t.successRedirect}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-medium">
                    {t.fullNameLabel}
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Juan Pérez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    required
                    className="bg-input"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    {t.emailLabel}
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@empresa.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="bg-input"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    {t.passwordLabel}
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="bg-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.passwordHint}
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    {t.confirmLabel}
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="bg-input"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t.submitting : t.submit}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                {t.hasAccount}{' '}
                <Link href="/login" className="font-semibold text-sidebar-primary hover:underline">
                  {t.signInLink}
                </Link>
              </p>
            </div>

            <div className="mt-6 border-t border-border pt-6">
              <p className="pt-4 text-center text-xs text-muted-foreground">
                {t.developedWith}{' '}
                <a href="https://n3uralia.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                  n3uralia
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { Activity, ArrowRight } from 'lucide-react';
import { AvailabilitySemaphore } from '@/components/maintenance/availability-semaphore';
import { AlertsBanner } from '@/components/maintenance/alerts-banner';
import { Button } from '@/components/ui/button';
import { getDictionaryForRequest } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getDictionaryForRequest();
  const t = dictionary.app.availability;

  return {
    title: t.meta.title,
    description: t.meta.description,
  };
}

export default async function AvailabilityPage() {
  const { dictionary } = await getDictionaryForRequest();
  const t = dictionary.app.availability;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">{t.description}</p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento/equipos">
            {t.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <Activity className="h-4 w-4 text-primary" />
        {t.note}
      </div>

      <AlertsBanner />
      <AvailabilitySemaphore />
    </div>
  );
}

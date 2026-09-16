'use client';

import { useEffect, useState } from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type ControlledMemory = {
  id: string;
  domain: string;
  memory_text: string;
  active: boolean;
};

const domainCopy: Record<string, string> = {
  executive: 'Ejecutivo',
  maintenance: 'Mantención',
  geology: 'Geología',
  inventory: 'Inventario',
  procurement: 'Compras',
  production: 'Producción',
  finance: 'Finanzas',
  documents: 'Documentos',
  data_health: 'Calidad de datos',
};

export function ControlledMemoryPopover() {
  const [open, setOpen] = useState(false);
  const [memories, setMemories] = useState<ControlledMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/intelligence/memory', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar la memoria.');
        return Array.isArray(payload?.memories) ? payload.memories : [];
      })
      .then((items: ControlledMemory[]) => {
        if (!cancelled) setMemories(items.filter((item) => item.active));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'No fue posible cargar la memoria.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function deactivate(memory: ControlledMemory) {
    setUpdatingId(memory.id);
    setError(null);

    try {
      const response = await fetch('/api/intelligence/memory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'set_active', id: memory.id, active: false }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No fue posible desactivar la memoria.');
      setMemories((current) => current.filter((item) => item.id !== memory.id));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No fue posible desactivar la memoria.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Ver memoria de MOTIL"
        >
          <Brain className="size-3.5" />
          Memoria
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={8} className="w-[min(380px,calc(100vw-2rem))] p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Lo que MOTIL recuerda</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Contexto laboral controlado por ti. No reemplaza evidencia operacional ni permisos.</p>
        </div>

        <div className="max-h-80 overflow-y-auto p-3">
          {loading ? (
            <div className="flex min-h-24 items-center justify-center gap-2 text-xs text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" />
              Cargando memoria…
            </div>
          ) : memories.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-4">
              <p className="text-sm font-medium text-foreground">Aún no hay recuerdos activos.</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">MOTIL sólo conservará contexto laboral estable cuando corresponda; nunca hechos operacionales como memoria personal.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {memories.map((memory) => (
                <article key={memory.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                        {domainCopy[memory.domain] || 'Contexto laboral'}
                      </span>
                      <p className="mt-2 text-xs leading-5 text-foreground">{memory.memory_text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deactivate(memory)}
                      disabled={updatingId === memory.id}
                      className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {updatingId === memory.id ? 'Desactivando…' : 'Desactivar'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {error ? <p className="mt-3 text-xs leading-5 text-destructive" role="alert">{error}</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

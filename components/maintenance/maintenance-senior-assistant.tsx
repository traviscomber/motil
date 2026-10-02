'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Database, RotateCcw, SearchCheck, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SourceRef = {
  source?: string;
  tool?: string;
  mode?: 'read' | 'prepare_only' | string;
};

type ChatMessage = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  source_refs?: SourceRef[];
  model?: string | null;
  created_at?: string;
};

type ChatState = {
  conversation?: { id: string; title?: string | null } | null;
  messages?: ChatMessage[];
  hasMore?: boolean;
  oldestMessageAt?: string | null;
  sessionIdleHours?: number;
  memoryCount?: number;
  cargo?: string | null;
  agent?: string;
};

const toolCopy: Record<string, string> = {
  search_assets: 'Activos',
  get_maintenance_attention_queue: 'Cola de atención',
  get_maintenance_attention_context: 'Atención + contexto',
  get_asset_context: 'Contexto del activo',
  get_asset_context_batch: 'Contexto de activos',
  get_open_work_orders: 'Órdenes abiertas',
  get_maintenance_plan: 'Plan preventivo',
  get_observed_condition_history: 'Condición observada',
  get_closure_readiness: 'Preparación de cierre',
  prepare_maintenance_decision_case: 'Caso preparado',
};

function MaintenanceAiMark() {
  return (
    <svg
      viewBox="0 0 96 96"
      aria-hidden="true"
      className="h-[76px] w-[76px] overflow-visible text-primary"
    >
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="origin-center motion-safe:animate-[spin_18s_linear_infinite] motion-reduce:animate-none"
      >
        <path d="M18 44A31 31 0 0 1 44 17" stroke="var(--primary)" strokeWidth="5" />
        <path d="M51 17A31 31 0 0 1 73 29" stroke="var(--secondary)" strokeWidth="5" />
        <path d="M77 39A31 31 0 0 1 72 68" stroke="var(--primary)" strokeWidth="5" />
        <path d="M64 75A31 31 0 0 1 31 75" stroke="var(--secondary)" strokeWidth="5" />
        <path d="M24 68A31 31 0 0 1 17 52" stroke="var(--primary)" strokeWidth="5" />
      </g>

      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M58.5 27.5a14 14 0 0 0-17.2 17.2L28.7 57.3a7.2 7.2 0 1 0 10.2 10.2l12.6-12.6a14 14 0 0 0 17.2-17.2l-8.2 8.2-7.6-2-2-7.6 7.6-8.8Z"
          stroke="var(--secondary)"
          strokeWidth="4"
        />
        <circle cx="33.7" cy="62.4" r="2.6" stroke="var(--secondary)" strokeWidth="3" />
        <path
          d="M51 57.5h16.5a5.5 5.5 0 0 1 5.5 5.5v12l-7-4H51a5.5 5.5 0 0 1-5.5-5.5V63a5.5 5.5 0 0 1 5.5-5.5Z"
          stroke="var(--primary)"
          strokeWidth="3.5"
        />
      </g>

      <circle
        cx="78"
        cy="30"
        r="4.2"
        fill="var(--secondary)"
        className="motion-safe:animate-[pulse_3.6s_ease-in-out_infinite] motion-reduce:animate-none"
      />
      <circle cx="54" cy="64.5" r="2.2" fill="var(--primary)" />
      <circle cx="60.5" cy="64.5" r="2.2" fill="var(--primary)" />
      <circle cx="67" cy="64.5" r="2.2" fill="var(--primary)" />
    </svg>
  );
}

const starters = [
  'Dame las 5 acciones de mantenimiento que requieren atención hoy.',
  '¿Qué OT están bloqueadas y qué falta para destrabarlas?',
  '¿Qué preventivos están vencidos y con qué evidencia?',
  '¿Qué equipos tienen observaciones operacionales sin resolver?',
];

function uniqueToolRefs(refs: SourceRef[]) {
  const unique = new Map<string, SourceRef>();
  for (const ref of refs) {
    if (!ref?.tool) continue;
    const key = `${ref.tool}:${ref.mode || 'read'}`;
    if (!unique.has(key)) unique.set(key, ref);
  }
  return Array.from(unique.values());
}

function modelCopy(model?: string | null) {
  if (!model) return null;
  if (model === 'canonical-fallback') return 'Modo canónico resiliente';
  return model;
}

export function MaintenanceSeniorAssistant() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [oldestMessageAt, setOldestMessageAt] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);
  const [cargo, setCargo] = useState<string | null>(null);
  const [sessionIdleHours, setSessionIdleHours] = useState(8);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const suppressAutoScrollRef = useRef(false);

  useEffect(() => {
    if (!open || loaded) return;
    let active = true;
    fetch('/api/maintenance/senior-assistant', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as ChatState & { error?: string };
        if (!response.ok) throw new Error(data?.error || 'No fue posible abrir el asistente.');
        if (!active) return;
        setConversationId(data.conversation?.id || null);
        setMessages(data.messages || []);
        setHasMore(Boolean(data.hasMore));
        setOldestMessageAt(data.oldestMessageAt || null);
        setMemoryCount(data.memoryCount || 0);
        setCargo(data.cargo || null);
        setSessionIdleHours(data.sessionIdleHours || 8);
        setLoaded(true);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'No fue posible abrir el asistente.');
        setLoaded(true);
      });
    return () => { active = false; };
  }, [open, loaded]);

  useEffect(() => {
    if (!open) return;
    if (suppressAutoScrollRef.current) {
      suppressAutoScrollRef.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, messages, sending]);

  const loadOlder = async () => {
    if (!conversationId || !hasMore || !oldestMessageAt || loadingOlder) return;
    setLoadingOlder(true);
    setError(null);
    try {
      const params = new URLSearchParams({ conversationId, before: oldestMessageAt });
      const response = await fetch(`/api/maintenance/senior-assistant?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = (await response.json().catch(() => null)) as ChatState & { error?: string };
      if (!response.ok) throw new Error(data?.error || 'No fue posible cargar mensajes anteriores.');
      const older = data.messages || [];
      suppressAutoScrollRef.current = true;
      setMessages((current) => {
        const existing = new Set(current.map((item) => item.id).filter(Boolean));
        return [...older.filter((item) => !item.id || !existing.has(item.id)), ...current];
      });
      setHasMore(Boolean(data.hasMore));
      setOldestMessageAt(data.oldestMessageAt || oldestMessageAt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar mensajes anteriores.');
    } finally {
      setLoadingOlder(false);
    }
  };

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const question = message.trim();
    if (!question || sending) return;

    const optimistic: ChatMessage = {
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setMessage('');
    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/maintenance/senior-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: question, conversationId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No fue posible consultar al asistente.');
      setConversationId(payload?.conversationId || conversationId);
      if (payload?.message) {
        setMessages((current) => [...current, payload.message]);
      } else if (payload?.answer) {
        const sourceRefs: SourceRef[] = [
          ...(Array.isArray(payload?.sources) ? payload.sources.map((source: string) => ({ source })) : []),
          ...(Array.isArray(payload?.toolsUsed) ? payload.toolsUsed.map((tool: { name?: string; mode?: string }) => ({ tool: tool?.name, mode: tool?.mode })) : []),
        ];
        setMessages((current) => [...current, {
          role: 'assistant',
          content: payload.answer,
          source_refs: sourceRefs,
          model: payload?.model || null,
        }]);
      }
      if (Number(payload?.learned || 0) > 0) {
        setMemoryCount((current) => current + Number(payload.learned));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible consultar al asistente.');
    } finally {
      setSending(false);
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const startNewConversation = async () => {
    if (sending) return;
    setError(null);
    try {
      if (conversationId) {
        const response = await fetch('/api/maintenance/senior-assistant', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'archive', conversationId }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'No fue posible cerrar la conversación.');
      }
      setConversationId(null);
      setMessages([]);
      setHasMore(false);
      setOldestMessageAt(null);
      setMessage('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cerrar la conversación.');
    }
  };

  return <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'group fixed bottom-5 right-5 z-50 grid h-[88px] w-[88px] place-items-center rounded-full bg-transparent p-0 transition-transform duration-300 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        open && 'pointer-events-none scale-95 opacity-0',
      )}
      aria-label="Abrir Asistente Senior de Mantenimiento"
      title="Asistente Senior de Mantenimiento"
    >
      <span
        aria-hidden="true"
        className="absolute inset-[9px] rounded-full border border-primary/20 opacity-50 motion-safe:animate-[pulse_4.8s_ease-in-out_infinite] motion-reduce:animate-none"
      />
      <MaintenanceAiMark />
    </button>

    {open ? <section className="fixed bottom-4 right-4 z-50 flex h-[min(700px,calc(100vh-2rem))] w-[min(460px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-none" aria-label="Asistente Senior de Mantenimiento">
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Asistente Senior de Mantenimiento</p>
            <p className="mt-1 text-xs text-muted-foreground">Evidencia canónica MOTIL · decisión humana</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1"><Database className="h-3 w-3"/>Canónico</span>
              {cargo ? <span className="max-w-[210px] truncate rounded-full border px-2 py-1" title={cargo}>{cargo}</span> : null}
              <span className="rounded-full border px-2 py-1">Memoria {memoryCount}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => void startNewConversation()} disabled={sending} aria-label="Nueva conversación" title="Archivar conversación y comenzar una nueva"><RotateCcw className="h-4 w-4"/></Button>
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Cerrar asistente"><X className="h-4 w-4"/></Button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/10 px-4 py-4" aria-live="polite">
        {!loaded ? <p className="text-sm text-muted-foreground">Cargando contexto de mantenimiento…</p> : null}

        {loaded && hasMore ? <div className="mb-4 flex justify-center"><Button type="button" variant="ghost" size="sm" onClick={() => void loadOlder()} disabled={loadingOlder}>{loadingOlder ? 'Cargando…' : 'Ver mensajes anteriores'}</Button></div> : null}

        {loaded && messages.length === 0 ? <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">Pregunta qué requiere atención, qué evidencia lo respalda, qué contradice la señal y cuál es la próxima acción de mayor valor.</p>
          <div className="grid gap-2">
            {starters.map((starter) => <button key={starter} type="button" className="min-h-10 rounded-md border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setMessage(starter)}>{starter}</button>)}
          </div>
        </div> : null}

        <div className="space-y-5">
          {messages.map((item, index) => {
            const refs = item.source_refs || [];
            const sources = refs.map((ref) => ref?.source).filter(Boolean) as string[];
            const tools = uniqueToolRefs(refs);
            const key = item.id || `${item.role}-${item.created_at || index}-${index}`;
            return <article key={key} className={cn('text-sm leading-relaxed', item.role === 'user' ? 'ml-8 border-l-2 border-primary/30 pl-3' : 'mr-2')}>
              <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{item.role === 'user' ? 'Tú' : 'Asistente Senior'}</p>
              <div className="whitespace-pre-wrap">{item.content}</div>
              {item.role === 'assistant' && (sources.length || tools.length) ? <details className="mt-3 rounded-md border bg-background px-3 py-2 text-[11px] text-muted-foreground">
                <summary className="cursor-pointer select-none font-medium text-foreground">Evidencia consultada{tools.length ? ` · ${tools.length} consulta(s)` : ''}</summary>
                {tools.length ? <div className="mt-2 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-[0.1em]">Consultas operacionales</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tools.map((tool) => <span key={`${tool.tool}:${tool.mode}`} className="inline-flex items-center gap-1 rounded-full border px-2 py-1"><SearchCheck className="h-3 w-3"/>{toolCopy[tool.tool || ''] || tool.tool}{tool.mode === 'prepare_only' ? ' · borrador' : ''}</span>)}
                  </div>
                </div> : null}
                {sources.length ? <div className="mt-2 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-[0.1em]">Fuentes canónicas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sources.map((source) => <span key={source} className="rounded-full border px-2 py-1 font-mono text-[9px]">{source}</span>)}
                  </div>
                </div> : null}
                <p className="mt-2 text-[10px]">Las consultas son de lectura o preparación. La decisión y ejecución permanecen humanas.</p>
              </details> : null}
              {item.role === 'assistant' && item.model ? <p className="mt-2 text-[10px] text-muted-foreground">{item.model === 'canonical-fallback' ? 'Operando con datos canónicos · IA generativa no disponible' : `Modelo: ${modelCopy(item.model)}`}</p> : null}
            </article>;
          })}
          {sending ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><SearchCheck className="h-4 w-4"/><span>Consultando evidencia canónica y contrastando señales…</span></div> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div ref={bottomRef} />
        </div>
      </div>

      <footer className="border-t bg-card p-3">
        <form onSubmit={submit} className="flex items-end gap-2">
          <label className="sr-only" htmlFor="maintenance-assistant-question">Consulta de mantenimiento</label>
          <textarea id="maintenance-assistant-question" name="maintenance-assistant-question" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={onKeyDown} rows={3} maxLength={12000} placeholder="Consulta de mantenimiento..." className="min-h-[72px] flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"/>
          <Button type="submit" size="icon" disabled={sending || !message.trim()} aria-label="Enviar consulta"><Send className="h-4 w-4"/></Button>
        </form>
        <p className="mt-2 text-[10px] text-muted-foreground">Continuidad de sesión: {sessionIdleHours} h · memoria laboral separada de la evidencia operacional.</p>
      </footer>
    </section> : null}
  </>;
}

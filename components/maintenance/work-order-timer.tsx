'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, Pause, Play, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface WorkOrderTimerProps {
  workOrderId: string;
  status?: string;
  onActionComplete?: (action: string, totalMinutes: number) => void;
}

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function WorkOrderTimer({ workOrderId, onActionComplete }: WorkOrderTimerProps) {
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTimer = async () => {
      try {
        const res = await fetch(`/api/maintenance/work-orders/${workOrderId}/timer`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setTimerStatus(data.current.timer_status);
        setTotalSeconds(Number(data.current.total_seconds ?? Number(data.current.total_minutes || 0) * 60));
        setStartTime(data.current.timer_start_time ? new Date(data.current.timer_start_time) : null);
        setNowMs(Date.now());
      } catch (err) {
        console.error('[maintenance] Failed to fetch timer:', err);
      }
    };
    void fetchTimer();
  }, [workOrderId]);

  useEffect(() => {
    if (timerStatus !== 'running' || !startTime) return;
    setNowMs(Date.now());
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timerStatus, startTime]);

  const handleAction = useCallback(async (action: 'play' | 'pause' | 'resume' | 'terminate') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/maintenance/work-orders/${workOrderId}/timer`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: '' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setTimerStatus(data.timer_status);
      setTotalSeconds(Number(data.total_seconds ?? Number(data.total_minutes || 0) * 60));
      setStartTime(data.timer_start_time ? new Date(data.timer_start_time) : null);
      setNowMs(Date.now());
      onActionComplete?.(action, Math.floor(Number(data.total_seconds ?? 0) / 60));
    } catch (err) {
      console.error('[maintenance] Timer action failed:', err);
    } finally {
      setLoading(false);
    }
  }, [workOrderId, onActionComplete]);

  const liveSeconds = timerStatus === 'running' && startTime
    ? Math.max(0, Math.floor((nowMs - startTime.getTime()) / 1000))
    : 0;
  const displaySeconds = totalSeconds + liveSeconds;

  return (
    <Card className="space-y-4 border-border bg-card p-4 shadow-none">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Tiempo de trabajo</h3>
      </div>

      <div className="text-center">
        <div className="font-mono text-4xl font-bold tabular-nums text-primary">{formatDuration(displaySeconds)}</div>
        <p className="mt-2 text-xs text-muted-foreground">
          Estado: {timerStatus === 'running' ? 'En progreso' : timerStatus === 'paused' ? 'Pausado' : 'Detenido'}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {(timerStatus === 'idle' || timerStatus === 'paused') && (
          <Button onClick={() => void handleAction(timerStatus === 'idle' ? 'play' : 'resume')} disabled={loading} className="flex-1 gap-2" size="sm">
            <Play className="h-4 w-4" />
            {timerStatus === 'idle' ? 'Iniciar' : 'Reanudar'}
          </Button>
        )}
        {timerStatus === 'running' && (
          <>
            <Button onClick={() => void handleAction('pause')} disabled={loading} className="flex-1 gap-2" variant="outline" size="sm">
              <Pause className="h-4 w-4" />
              Pausa
            </Button>
            <Button onClick={() => void handleAction('terminate')} disabled={loading} className="flex-1 gap-2" variant="destructive" size="sm">
              <StopCircle className="h-4 w-4" />
              Terminar
            </Button>
          </>
        )}
        {timerStatus === 'paused' && (
          <Button onClick={() => void handleAction('terminate')} disabled={loading} className="w-full gap-2" variant="destructive" size="sm">
            <StopCircle className="h-4 w-4" />
            Terminar
          </Button>
        )}
      </div>
    </Card>
  );
}

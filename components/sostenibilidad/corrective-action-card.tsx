'use client';

import { useState, type ReactElement } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { CorrectiveActionRecord } from '@/components/sostenibilidad/nonconformance-types';

interface CorrectiveActionCardProps {
  action: CorrectiveActionRecord;
  onUpdate: (id: string) => void;
}

export function CorrectiveActionCard({ action, onUpdate }: CorrectiveActionCardProps) {
  const [updating, setUpdating] = useState(false);

  const statusColors: Record<string, string> = {
    planned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    verified: 'bg-emerald-100 text-emerald-800',
    on_hold: 'bg-gray-100 text-gray-800',
  };

  const statusIcons: Record<string, ReactElement> = {
    planned: <Clock className="w-4 h-4" />,
    in_progress: <AlertCircle className="w-4 h-4" />,
    completed: <CheckCircle className="w-4 h-4" />,
    verified: <CheckCircle className="w-4 h-4" />,
  };

  const dueDate = action.scheduled_completion_date || '';
  const isOverdue = Boolean(dueDate) && new Date(dueDate) < new Date() && !['completed', 'verified'].includes(action.status);

  return (
    <Card className={isOverdue ? 'border-red-300' : ''}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{action.ca_number}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{action.action_description}</p>
          </div>
          <Badge className={statusColors[action.status] || statusColors.on_hold}>
            <div className="flex items-center gap-1">
              {statusIcons[action.status]}
              {action.status}
            </div>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Responsable:</span>
            <span>{action.responsible_person_name || action.responsible_person || 'N/D'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha objetivo:</span>
            <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>{dueDate || 'Sin fecha'}</span>
          </div>
          {action.percentage_complete !== undefined && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Avance:</span>
                <span>{action.percentage_complete}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${action.percentage_complete}%` }} />
              </div>
            </div>
          )}
        </div>
        <Button size="sm" className="w-full mt-4" disabled={updating} onClick={() => onUpdate(action.id)}>
          Actualizar estado
        </Button>
      </CardContent>
    </Card>
  );
}

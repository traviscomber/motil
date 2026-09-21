'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export interface EeccRow {
  id: string;
  name: string;
  rut: string;
  representative: string;
  email: string;
  phone: string;
  is_active: boolean;
  notes: string;
}

interface EeccFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eecc?: EeccRow | null;
  onSaved: () => void;
}

const emptyForm = {
  name: '',
  rut: '',
  representative: '',
  email: '',
  phone: '',
  notes: '',
  isActive: true,
};

export function EeccFormDialog({ open, onOpenChange, eecc, onSaved }: EeccFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(eecc);

  useEffect(() => {
    if (open) {
      setForm(
        eecc
          ? {
              name: eecc.name,
              rut: eecc.rut,
              representative: eecc.representative,
              email: eecc.email,
              phone: eecc.phone,
              notes: eecc.notes,
              isActive: eecc.is_active,
            }
          : emptyForm
      );
    }
  }, [open, eecc]);

  const updateField = (field: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre de la empresa es obligatorio');
      return;
    }

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/eecc/${eecc!.id}` : '/api/eecc';
      const method = isEdit ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { error?: string }).error || 'No se pudo guardar la EECC');
      }

      toast.success(isEdit ? 'EECC actualizada correctamente' : 'EECC creada correctamente');
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ocurrió un error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar EECC' : 'Nueva EECC'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Actualiza los datos de la empresa contratista.'
                : 'Registra una nueva empresa de servicios complementarios.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="eecc-name">Nombre / Razón social *</Label>
              <Input
                id="eecc-name"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Ej: Transportes ABC Ltda."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="eecc-rut">RUT</Label>
                <Input
                  id="eecc-rut"
                  value={form.rut}
                  onChange={(event) => updateField('rut', event.target.value)}
                  placeholder="76.123.456-7"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eecc-phone">Teléfono</Label>
                <Input
                  id="eecc-phone"
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="eecc-representative">Representante</Label>
              <Input
                id="eecc-representative"
                value={form.representative}
                onChange={(event) => updateField('representative', event.target.value)}
                placeholder="Nombre del representante"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="eecc-email">Correo electrónico</Label>
              <Input
                id="eecc-email"
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="contacto@empresa.cl"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="eecc-notes">Notas</Label>
              <Textarea
                id="eecc-notes"
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                placeholder="Información adicional"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="eecc-active" className="text-sm font-medium">
                  Empresa activa
                </Label>
                <p className="text-xs text-muted-foreground">
                  Solo las EECC activas aparecen al crear contratos.
                </p>
              </div>
              <Switch
                id="eecc-active"
                checked={form.isActive}
                onCheckedChange={(checked) => updateField('isActive', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear EECC'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarpetaArranqueFormProps {
  onSuccess: () => void;
}

const DOCUMENTOS_REQUERIDOS = [
  'Certificado de afiliacion y cotizacion a Organismo Administrador',
  'Certificado de Accidentabilidad (últimos 2 años)',
  'Reglamento interno de orden, higiene y seguridad',
  'Copia IRL de todos sus colaboradores',
  'Contratos de trabajos de su personal',
  'Registro de entrega de EPP',
  'Registro interno de la empresa contratista',
  'Recepción firmada del Sistema de Gestión y Seguridad en el Trabajo',
  'Exámenes pre-ocupacionales (últimos 3 años)',
  'Exámenes ocupacionales (agentes como ruido, sílice)',
  'Documentación de trabajadores extranjeros',
  'Procedimientos de trabajo actualizados con NRCT',
  'Procedimiento en caso de accidente',
  'Política de empresa contratista en control de riesgos',
  'Copia carnet de identidad de todos los colaboradores',
  'Licencias de conducción vigentes',
  'Recepción de conductores por reglamento interno',
  'Programa de supervisión a cargo de personal',
  'Matriz de Identificación de Peligros (MIPER)',
];

type SlotStatus = 'idle' | 'uploading' | 'done' | 'error';

interface SlotState {
  file: File | null;
  status: SlotStatus;
  errorMsg: string;
}

export default function CarpetaArranqueForm({ onSuccess }: CarpetaArranqueFormProps) {
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [empresaRut, setEmpresaRut] = useState('');
  const [contactoEmail, setContactoEmail] = useState('');
  const [carpetaId, setCarpetaId] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotState[]>(
    DOCUMENTOS_REQUERIDOS.map(() => ({ file: null, status: 'idle', errorMsg: '' }))
  );
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const uploadedCount = slots.filter(s => s.status === 'done').length;
  const progress = (uploadedCount / DOCUMENTOS_REQUERIDOS.length) * 100;

  // Step 1: create the carpeta skeleton in DB
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaNombre.trim() || !contactoEmail.trim()) return;
    setCreating(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/carpeta-arranque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ empresa_nombre: empresaNombre, empresa_rut: empresaRut, contacto_email: contactoEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? data.error : 'Error al crear carpeta');
      setCarpetaId(data.carpeta.id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCreating(false);
    }
  };

  // Step 2: upload a single document slot
  const handleFileSelect = useCallback(
    async (slotIndex: number, file: File) => {
      if (!carpetaId) return;

      setSlots(prev => prev.map((s, i) => i === slotIndex ? { ...s, file, status: 'uploading', errorMsg: '' } : s));

      const fd = new FormData();
      fd.append('file', file);
      fd.append('slot_index', String(slotIndex + 1));

      try {
        const res = await fetch(`/api/carpeta-arranque/${carpetaId}/upload-doc`, {
          method: 'POST',
          credentials: 'include',
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ? data.error : 'Error al subir');
        setSlots(prev => prev.map((s, i) => i === slotIndex ? { ...s, status: 'done' } : s));
      } catch (err) {
        setSlots(prev => prev.map((s, i) =>
          i === slotIndex ? { ...s, status: 'error', errorMsg: err instanceof Error ? err.message : 'Error' } : s
        ));
      }
    },
    [carpetaId]
  );

  const handleRemove = (slotIndex: number) => {
    setSlots(prev => prev.map((s, i) => i === slotIndex ? { file: null, status: 'idle', errorMsg: '' } : s));
  };

  // Step 3: submit carpeta for review → triggers email notifications
  const handleSubmit = async () => {
    if (!carpetaId || uploadedCount === 0) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`/api/carpeta-arranque/${carpetaId}/submit`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? data.error : 'Error al enviar');
      setSubmitted(true);
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  // Submitted confirmation screen
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h3 className="text-xl font-semibold">Carpeta enviada a revisión</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          Se ha notificado a Dennyse, Javier Vargas y Gonzalo Canales.
          Recibirás un correo cuando tus documentos sean revisados.
        </p>
      </div>
    );
  }

  // Step 1 form: company details
  if (!carpetaId) {
    return (
      <form onSubmit={handleCreate} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="empresa_nombre">Nombre de la Empresa *</Label>
            <Input
              id="empresa_nombre"
              placeholder="Ej: Constructora ABC Ltda."
              value={empresaNombre}
              onChange={e => setEmpresaNombre(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="empresa_rut">RUT de la Empresa</Label>
            <Input
              id="empresa_rut"
              placeholder="Ej: 76.123.456-7"
              value={empresaRut}
              onChange={e => setEmpresaRut(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contacto_email">Correo de Contacto EECC *</Label>
          <Input
            id="contacto_email"
            type="email"
            placeholder="contacto@empresa.cl"
            value={contactoEmail}
            onChange={e => setContactoEmail(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            A este correo se enviarán las notificaciones de rechazo/aprobación.
          </p>
        </div>
        {submitError && (
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {submitError}
          </p>
        )}
        <Button type="submit" disabled={creating || !empresaNombre || !contactoEmail}>
          {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creando...</> : 'Continuar y cargar documentos'}
        </Button>
      </form>
    );
  }

  // Step 2: document upload grid
  return (
    <div className="space-y-5">
      {/* Company info summary */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div>
          <p className="text-sm font-semibold">{empresaNombre}</p>
          <p className="text-xs text-muted-foreground">{contactoEmail}</p>
        </div>
        <span className="text-xs text-muted-foreground font-mono">ID: {carpetaId.slice(0, 8)}...</span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Progreso de carga</span>
          <span className="font-semibold tabular-nums">{uploadedCount}/{DOCUMENTOS_REQUERIDOS.length}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {uploadedCount === DOCUMENTOS_REQUERIDOS.length
            ? 'Todos los documentos cargados. Puedes enviar la carpeta.'
            : `${DOCUMENTOS_REQUERIDOS.length - uploadedCount} documento(s) faltante(s)`}
        </p>
      </div>

      {/* Document slots */}
      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {DOCUMENTOS_REQUERIDOS.map((nombre, idx) => {
          const slot = slots[idx];
          return (
            <div
              key={idx}
              className={cn(
                'border rounded-lg p-3 transition-colors',
                slot.status === 'done' && 'border-green-500/50 bg-green-500/5',
                slot.status === 'error' && 'border-destructive/50 bg-destructive/5',
                slot.status === 'uploading' && 'border-primary/50 bg-primary/5',
                slot.status === 'idle' && 'border-border'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2 min-w-0">
                  {/* Status dot */}
                  <span className={cn(
                    'mt-1 h-2 w-2 rounded-full flex-shrink-0',
                    slot.status === 'done' && 'bg-green-500',
                    slot.status === 'error' && 'bg-destructive',
                    slot.status === 'uploading' && 'bg-primary animate-pulse',
                    slot.status === 'idle' && 'bg-muted-foreground/30'
                  )} />
                  <Label className="text-sm font-medium leading-snug">
                    <span className="text-muted-foreground mr-1">{idx + 1}.</span>{nombre}
                  </Label>
                </div>
                {slot.status === 'done' && (
                  <button type="button" onClick={() => handleRemove(idx)} className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {slot.status === 'idle' && (
                <label className="flex items-center gap-2 border border-dashed rounded-md p-3 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors group">
                  <Upload className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    Haz clic para cargar (PDF, Word, Excel — max 50MB)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={e => {
                      const selected = e.target.files?.[0];
                      if (selected) {
                        handleFileSelect(idx, selected);
                      }
                    }}
                  />
                </label>
              )}

              {slot.status === 'uploading' && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Subiendo {slot.file?.name || 'archivo'}...
                </div>
              )}

              {slot.status === 'done' && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <File className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{slot.file?.name || 'archivo'}</span>
                  <span className="flex-shrink-0 text-muted-foreground">
                    ({((slot.file?.size || 0) / 1024).toFixed(0)} KB)
                  </span>
                </div>
              )}

              {slot.status === 'error' && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-destructive flex-1">{slot.errorMsg}</p>
                  <label className="cursor-pointer text-xs underline text-primary">
                    Reintentar
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                      onChange={e => {
                        const selected = e.target.files?.[0];
                        if (selected) {
                          handleFileSelect(idx, selected);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="pt-2 border-t space-y-3">
        {submitError && (
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {submitError}
          </p>
        )}
        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploadedCount === 0}
            className="gap-2"
          >
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
              : <><Send className="h-4 w-4" />Enviar para revisión ({uploadedCount} docs)</>}
          </Button>
          <Button type="button" variant="outline" onClick={() => onSuccess?.()}>
            Guardar y cerrar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Al enviar, Dennyse, Javier Vargas y Gonzalo Canales seran notificados por correo.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useRef, useState, type DragEvent } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Download, Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ImportResult = {
  success: boolean;
  message: string;
  imported_sheets?: number;
  updated_sheets?: number;
  imported_components?: number;
  updated_components?: number;
  imported_fault_modes?: number;
  updated_fault_modes?: number;
  skipped_assets?: number;
  total?: number;
  error?: string;
};

import { buildTemplateCsv } from './technical-sheet-template';
export function TechnicalSheetImportComponent() {
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plantilla-fichas-tecnicas.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const uploadFile = async (file: File) => {
    const valid =
      file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx');
    if (!valid) {
      setResult({ success: false, message: 'Solo aceptamos CSV, XLS o XLSX', error: 'Formato no valido' });
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/maintenance/technical-sheets/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudieron importar las fichas tecnicas');
      }

      setResult({
        success: true,
        message: payload?.message || 'Importación completada',
        imported_sheets: payload?.imported_sheets || 0,
        updated_sheets: payload?.updated_sheets || 0,
        imported_components: payload?.imported_components || 0,
        updated_components: payload?.updated_components || 0,
        imported_fault_modes: payload?.imported_fault_modes || 0,
        updated_fault_modes: payload?.updated_fault_modes || 0,
        skipped_assets: payload?.skipped_assets || 0,
        total: payload?.total || 0,
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'No se pudieron importar las fichas tecnicas',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar fichas tecnicas</h1>
          <p className="mt-2 text-muted-foreground">
            Carga fichas, componentes y fallas por activo desde CSV, XLS o XLSX con un flujo seguro y trazable.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento/fichas-tecnicas">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/80 md:col-span-2">
          <CardHeader>
            <CardTitle>Cargar archivo</CardTitle>
            <CardDescription>Usa la plantilla para subir fichas tecnicas y sus componentes/fallas asociados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-border bg-background/50'
              }`}
            >
              <Upload className="mx-auto mb-3 h-10 w-10 text-primary" />
              <p className="font-medium">Arrastra tu archivo aquí o usa el selector</p>
            <p className="mt-1 text-sm text-muted-foreground">Acepta CSV, XLS y XLSX.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              La plantilla ya incluye modelos con ficha técnica de referencia para ayudar a empezar con data real.
            </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Plantilla
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Seleccionar archivo
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={downloadTemplate} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Descargar plantilla
              </Button>
              {isImporting ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Formato esperado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Identifica el activo por `ASSET_CODE` o `ASSET_NAME` dentro de `maintenance_assets`.</p>
            <p>Incluye `RAW_SPECS` como JSON valido para guardar la ficha técnica base.</p>
            <p>Los componentes se actualizan por `COMPONENT_CODE` y las fallas por `FAULT_CODE`.</p>
          </CardContent>
        </Card>
      </div>

      {result ? (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p>{result.message}</p>
              {result.success ? (
                <div className="text-sm">
                  <p>Fichas importadas: {result.imported_sheets || 0}</p>
                  <p>Fichas actualizadas: {result.updated_sheets || 0}</p>
                  <p>Componentes importados: {result.imported_components || 0}</p>
                  <p>Componentes actualizados: {result.updated_components || 0}</p>
                  <p>Fallas importadas: {result.imported_fault_modes || 0}</p>
                  <p>Fallas actualizadas: {result.updated_fault_modes || 0}</p>
                  <p>Activos omitidos: {result.skipped_assets || 0}</p>
                  <p>Total filas: {result.total || 0}</p>
                </div>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

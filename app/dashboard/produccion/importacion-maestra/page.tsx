'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';

const MASTER_SHA256 = '5e942fc9b4b6a32afad31e58b13f953680a248b32e8d36dad62dc0cd1fca8769';
const EXPECTED = { movements: 35744, exceptions: 3165, plant: 11171 };
const ALLOWED_SOURCES: Record<string, string> = {
  'TM - 2019.xlsx': '43ff4fbc3dc85d349641aa054932b410daff1fdab57cb39addf9dab9d11f0b32',
  'TM - 2020.xlsx': '0c0f716c2d3aa1bd1c156cb3058a47f014b79a756352a228105eb2e30b476452',
  'TM - 2021.xlsx': '8fc92e17d020b755b0db20667ffd41e161e74408127d7fb438ea0d409ea47139',
  'TM - 2022.xlsx': '6c0312cf30e3e0252641eb2bc18a6ac571f8403459f82f4cebe45290249d0010',
  'TM-2023.xlsx': 'a88c87e088a91160bbe78164c9324e6aa8f59cc8ca8a1e9d6f22c0ae757429c9',
  'TM-2024 actualizado.xlsx': 'fd51c112e23a30ea4c614073f7ceaaf88d6e6de50337d02a6bca35772aaa7aa9',
  'TM 2025 actualizado (31-12-2025).xlsx': '2129860d6ce77469289d95f76fded63f5dbf2212e0deaecc4ed243c5fc237ff4',
  'TM 2026 actualizado (06-08-2026).xlsx': 'dbc1b28a68f0faa269fca43dfc127823ef3d1f4155274a152cad7a3c166f6b00',
  'LEY.xlsx': '9235bc3b4b379bc131187cf2b255ce5584f64623c3b5d14c75630a9a2ddf8618',
  'LEYES.xlsx': 'dc7d5a35a55bb117ae8bb4e512d3c2be99b87b3ea981ec0fc43ba2f764043a3f',
};

type JsonRow = Record<string, unknown>;
type Prepared = { movements: JsonRow[]; exceptions: JsonRow[]; plant: JsonRow[]; masterSha: string; sourceCount: number };

function text(value: unknown) {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result || null;
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function normalized(value: unknown) {
  return text(value)?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ') || null;
}

function classify(description: unknown) {
  const value = normalized(description) || '';
  if (value.includes('ESTERIL')) return 'sterile';
  if (value.includes('CENIZA')) return 'ash';
  if (value.includes('MINERAL')) return 'process_mineral';
  return 'unclassified';
}

async function sha256Bytes(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256Text(value: string) {
  return sha256Bytes(new TextEncoder().encode(value).buffer);
}

function sourceIdentity(row: JsonRow) {
  const sourceFile = text(row['ARCHIVO ORIGEN']);
  const sourceSha = text(row['SHA256 ARCHIVO']);
  if (!sourceFile || !sourceSha || ALLOWED_SOURCES[sourceFile] !== sourceSha) {
    throw new Error(`Fuente fuera del scope Motil Producción: ${sourceFile || 'sin archivo'}`);
  }
  return { sourceFile, sourceSha };
}

async function parseMaster(file: File, onProgress: (value: number) => void): Promise<Prepared> {
  const buffer = await file.arrayBuffer();
  const masterSha = await sha256Bytes(buffer);
  if (masterSha !== MASTER_SHA256) throw new Error('El archivo no corresponde al master canónico Motil auditado. SHA-256 distinto.');

  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellFormula: true });
  for (const required of ['TRANSPORTE_CANONICO', 'TRANSPORTE_REVISAR', 'PLANTA_LEYES_CANONICO']) {
    if (!workbook.Sheets[required]) throw new Error(`Falta hoja requerida: ${required}`);
  }

  const rawMovements = XLSX.utils.sheet_to_json<JsonRow>(workbook.Sheets.TRANSPORTE_CANONICO, { defval: null, raw: true });
  const rawExceptions = XLSX.utils.sheet_to_json<JsonRow>(workbook.Sheets.TRANSPORTE_REVISAR, { defval: null, raw: true });
  const rawPlant = XLSX.utils.sheet_to_json<JsonRow>(workbook.Sheets.PLANTA_LEYES_CANONICO, { defval: null, raw: true });

  if (rawMovements.length !== EXPECTED.movements || rawExceptions.length !== EXPECTED.exceptions || rawPlant.length !== EXPECTED.plant) {
    throw new Error(`Conteos inesperados: TM ${rawMovements.length}, revisión ${rawExceptions.length}, planta ${rawPlant.length}.`);
  }

  const sourcePairs = new Set<string>();
  const movements: JsonRow[] = [];
  for (let start = 0; start < rawMovements.length; start += 250) {
    const batch = rawMovements.slice(start, start + 250);
    const mapped = await Promise.all(batch.map(async (row) => {
      const { sourceFile, sourceSha } = sourceIdentity(row);
      sourcePairs.add(`${sourceFile}|${sourceSha}`);
      const movementDate = isoDate(row.FECHA);
      const sourceSheet = text(row['HOJA ORIGEN']);
      const sourceRow = numberValue(row['FILA ORIGEN']);
      const movementNumber = text(row.NUMERO);
      const rawQuantity = numberValue(row['TONELAJE NETO']);
      const normalizedTons = numberValue(row['TONELADAS NORMALIZADAS']);
      if (!movementDate || !sourceSheet || !sourceRow || rawQuantity === null || normalizedTons === null || normalizedTons <= 0) {
        throw new Error(`Movimiento inválido en master: ${sourceFile} / fila ${sourceRow || 'N/D'}`);
      }
      return {
        movement_number: movementNumber,
        movement_date: movementDate,
        mine_name_raw: text(row['MINA ORIGEN']),
        sector_name_raw: text(row.SECTOR),
        driver_name_raw: text(row.CONDUCTOR),
        carrier_name_raw: text(row['EMPRESA TRANSPORTISTA']),
        vehicle_plate_raw: text(row.PATENTE),
        seal_number: text(row['NUMERO DE SELLO']),
        raw_quantity: rawQuantity,
        raw_unit: text(row['UNIDAD ORIGEN']),
        normalized_metric_tons: normalizedTons,
        normalization_rule: text(row['ADAPTER VERSION']),
        source_file: sourceFile,
        source_file_sha256: sourceSha,
        source_sheet: sourceSheet,
        source_row: sourceRow,
        source_hash: await sha256Text([sourceSha, sourceSheet, sourceRow, movementNumber || '', movementDate, rawQuantity].join('|')),
        source_payload: row,
        client_name_raw: text(row.CLIENTE),
        movement_description_raw: text(row.DESCRIPCION),
        interior_mine_raw: text(row['INTERIOR MINA']),
        debt_status_raw: text(row.DEUDA),
        material_classification: classify(row.DESCRIPCION),
        source_schema_version: text(row['SCHEMA ORIGEN']),
        adapter_version: text(row['ADAPTER VERSION']),
      };
    }));
    movements.push(...mapped);
    onProgress(Math.round(((start + batch.length) / rawMovements.length) * 55));
  }

  const exceptions: JsonRow[] = [];
  for (let start = 0; start < rawExceptions.length; start += 250) {
    const batch = rawExceptions.slice(start, start + 250);
    const mapped = await Promise.all(batch.map(async (row) => {
      const { sourceFile, sourceSha } = sourceIdentity(row);
      sourcePairs.add(`${sourceFile}|${sourceSha}`);
      const movementDate = isoDate(row.FECHA);
      const sourceSheet = text(row['HOJA ORIGEN']);
      const sourceRow = numberValue(row['FILA ORIGEN']);
      const movementNumber = text(row.NUMERO);
      const rawQuantity = numberValue(row['TONELAJE NETO']);
      if (!sourceSheet || !sourceRow) throw new Error(`Excepción sin lineage: ${sourceFile}`);
      return {
        exception_type: rawQuantity === 0 ? 'zero_tonnage' : 'other',
        reason: text(row['MOTIVO REVISION']) || 'Requiere revisión de fuente',
        movement_number: movementNumber,
        movement_date: movementDate,
        source_file: sourceFile,
        source_file_sha256: sourceSha,
        source_sheet: sourceSheet,
        source_row: sourceRow,
        source_hash: await sha256Text(['EXCEPTION', sourceSha, sourceSheet, sourceRow, movementNumber || '', movementDate || '', rawQuantity ?? ''].join('|')),
        source_payload: row,
      };
    }));
    exceptions.push(...mapped);
    onProgress(55 + Math.round(((start + batch.length) / rawExceptions.length) * 5));
  }

  const plant: JsonRow[] = [];
  for (let start = 0; start < rawPlant.length; start += 200) {
    const batch = rawPlant.slice(start, start + 200);
    const mapped = await Promise.all(batch.map(async (row) => {
      const { sourceFile, sourceSha } = sourceIdentity(row);
      sourcePairs.add(`${sourceFile}|${sourceSha}`);
      const operationDate = isoDate(row.FECHA);
      const shiftCode = text(row.TURNO);
      const sourceSheet = text(row['HOJA ORIGEN']);
      const sourceRow = numberValue(row['FILA ORIGEN']);
      if (!operationDate || !shiftCode || !sourceSheet || !sourceRow) throw new Error(`Turno sin lineage: ${sourceFile}`);

      const wet = numberValue(row['MINERAL HUMEDO t']);
      const mineralMoisture = numberValue(row['HUMEDAD MINERAL %']);
      const head = numberValue(row['LEY CABEZA %']);
      const galigher = numberValue(row['LEY GALIGHER %']);
      const concentrateGrade = numberValue(row['LEY CONCENTRADO %']);
      const tail = numberValue(row['LEY RELAVE %']);
      const recoveryReported = numberValue(row['RECUPERACION REPORTADA %']);
      const fineReported = numberValue(row['FINO TRATADO REPORTADO t']);
      const concentrateMoisture = numberValue(row['HUMEDAD CONCENTRADO %']);
      const dispatchGrade = numberValue(row['LEY DESPACHO %']);
      const dispatchWet = numberValue(row['DESPACHO HUMEDO t']);
      const mineralDry = wet !== null && mineralMoisture !== null ? wet * (1 - mineralMoisture / 100) : null;
      const feedFine = mineralDry !== null && head !== null ? mineralDry * head / 100 : null;
      const recovery = head !== null && concentrateGrade !== null && tail !== null && head !== 0 && concentrateGrade !== tail
        ? ((head - tail) * concentrateGrade) / ((concentrateGrade - tail) * head) * 100
        : null;
      const dispatchDry = dispatchWet !== null && concentrateMoisture !== null ? dispatchWet * (1 - concentrateMoisture / 100) : null;
      const dispatchFine = dispatchDry !== null && dispatchGrade !== null ? dispatchDry * dispatchGrade / 100 : null;
      const baseHash = await sha256Text([sourceSha, sourceSheet, sourceRow, operationDate, shiftCode].join('|'));
      const partial = wet === null || mineralMoisture === null || head === null;
      return {
        source_file_sha256: sourceSha,
        shift: {
          operation_date: operationDate,
          shift_code: shiftCode,
          raw_treated_quantity: wet,
          raw_treated_unit: 't',
          treated_metric_tons: wet,
          normalization_status: wet !== null ? 'not_required' : 'pending',
          normalization_rule: 'PLANT_TONNES_V1',
          source_file: sourceFile,
          source_file_sha256: sourceSha,
          source_sheet: sourceSheet,
          source_row: sourceRow,
          source_hash: baseHash,
          source_payload: row,
          validation_status: partial ? 'review' : 'valid',
          validation_notes: partial ? 'Turno parcial: faltan tonelaje, humedad mineral o ley cabeza' : null,
          mineral_moisture_pct: mineralMoisture,
          lot_number_raw: text(row.LOTE),
          blend_code_raw: null,
          source_schema_version: text(row['SCHEMA ORIGEN']),
          adapter_version: 'PLANT_MASTER_V1',
        },
        metallurgy: {
          head_grade: head,
          concentrate_grade: concentrateGrade,
          tailings_grade: tail,
          recovery_reported: recoveryReported,
          recovery_calculated: recovery,
          fine_metal_reported: fineReported,
          fine_metal_calculated: feedFine,
          concentrate_quantity: null,
          concentrate_quantity_unit: null,
          analysis_status: partial ? 'partial' : 'calculated',
          calculation_rule_version: 'METALLURGY_DRY_BASIS_V1',
          source_file: sourceFile,
          source_sheet: sourceSheet,
          source_row: sourceRow,
          source_hash: await sha256Text(`MET|${baseHash}`),
          source_payload: row,
          validation_status: partial ? 'review' : 'valid',
          validation_notes: operationDate === '2026-08-06' && (head === null || concentrateGrade === null || tail === null)
            ? '06-08-2026: tonelaje observado con leyes incompletas; no interpretar como cero'
            : null,
          dispatch_moisture: concentrateMoisture,
          dispatch_grade: dispatchGrade,
          dispatched_quantity_raw: dispatchWet,
          dispatched_quantity_unit: dispatchWet !== null ? 't' : null,
          galigher_grade: galigher,
          dispatched_metric_tons: dispatchWet,
          concentrate_wet_metric_tons: null,
          concentrate_moisture_pct: concentrateMoisture,
          dispatch_fine_calculated: dispatchFine,
        },
      };
    }));
    plant.push(...mapped);
    onProgress(60 + Math.round(((start + batch.length) / rawPlant.length) * 40));
  }

  if (sourcePairs.size !== 10) throw new Error(`Se esperaban 10 fuentes Motil y se detectaron ${sourcePairs.size}.`);
  return { movements, exceptions, plant, masterSha, sourceCount: sourcePairs.size };
}

async function sendChunks(kind: 'movement' | 'exception' | 'plant', rows: JsonRow[], onProgress: (done: number) => void) {
  const size = kind === 'plant' ? 180 : 280;
  for (let offset = 0; offset < rows.length; offset += size) {
    const response = await fetch('/api/produccion/import/master-chunk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, rows: rows.slice(offset, offset + size) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Falló bloque ${kind} ${offset + 1}`);
    onProgress(Math.min(rows.length, offset + size));
  }
}

export default function MasterProductionImportPage() {
  const searchParams = useSearchParams();
  const dataHealthIssue = searchParams.get('dataHealth');
  const focusedSource = dataHealthIssue === 'transport_freshness'
    ? 'Transporte'
    : dataHealthIssue === 'plant_freshness'
      ? 'Planta'
      : null;
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importLabel, setImportLabel] = useState('');
  const [reconciled, setReconciled] = useState(false);

  async function onFile(file: File) {
    setParsing(true);
    setPrepared(null);
    setReconciled(false);
    setParseProgress(0);
    try {
      const result = await parseMaster(file, setParseProgress);
      setPrepared(result);
      toast.success('Master Motil validado: 10 fuentes autorizadas, 0 fuentes externas');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible validar el master');
    } finally {
      setParsing(false);
    }
  }

  async function importAll() {
    if (!prepared || importing) return;
    setImporting(true);
    setReconciled(false);
    try {
      await sendChunks('movement', prepared.movements, (done) => setImportLabel(`Movimientos ${done.toLocaleString('es-CL')} / ${prepared.movements.length.toLocaleString('es-CL')}`));
      await sendChunks('exception', prepared.exceptions, (done) => setImportLabel(`Excepciones ${done.toLocaleString('es-CL')} / ${prepared.exceptions.length.toLocaleString('es-CL')}`));
      await sendChunks('plant', prepared.plant, (done) => setImportLabel(`Planta ${done.toLocaleString('es-CL')} / ${prepared.plant.length.toLocaleString('es-CL')}`));
      setImportLabel('Reconciliando contra master canónico…');
      const response = await fetch('/api/produccion/import/master-finalize', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'La reconciliación final no cerró');
      setReconciled(true);
      setImportLabel('Carga reconciliada 100%');
      toast.success('Producción canónica Motil cargada y reconciliada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falló la importación maestra');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Producción · Importación canónica</PageHeaderEyebrow>
          <PageHeaderTitle>{focusedSource ? `Actualizar fuente de ${focusedSource}` : 'Master histórico Motil'}</PageHeaderTitle>
          <PageHeaderDescription>
            {focusedSource
              ? `La tarea de Data Health corresponde a ${focusedSource}. El mismo master canónico actualiza Transporte y Planta; MOTIL conserva la validación SHA-256, lineage y conteos antes de materializar datos.`
              : 'Acepta únicamente el consolidado auditado de TM 2019–2026 + LEY/LEYES. El archivo se valida localmente por SHA-256 y cada fila vuelve a validarse en servidor contra la allowlist Motil.'}
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline"><Link href="/dashboard/produccion"><ArrowLeft className="h-4 w-4" />Volver a Producción</Link></Button>
        </PageHeaderActions>
      </PageHeader>

      {focusedSource ? (
        <Card className="border-amber-300/70 bg-amber-50/40 shadow-none">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-medium">Data Health · {focusedSource}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                La deuda se cerrará sólo cuando esta importación produzca evidencia canónica más reciente.
                Abrir la pantalla o validar el archivo sin materializarlo no cambia la frescura.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" />Frontera de datos</CardTitle>
          <CardDescription>Scope fijo: Motil / Producción. No acepta archivos de otros proyectos aunque tengan estructura similar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <div><div className="text-muted-foreground">Master SHA</div><div className="font-mono text-xs">5e942fc9…ca8769</div></div>
          <div><div className="text-muted-foreground">Fuentes autorizadas</div><div className="font-medium">10 XLS</div></div>
          <div><div className="text-muted-foreground">Registros esperados</div><div className="font-medium">50.080 filas canónicas/revisión</div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="h-4 w-4" />Seleccionar master</CardTitle>
          <CardDescription>El XLSX se procesa en el navegador. El archivo completo no se sube a GitHub ni a almacenamiento público.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept=".xlsx" disabled={parsing || importing} onChange={(event) => { const file = event.target.files?.[0]; if (file) void onFile(file); }} />
          {parsing && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Validando master y lineage… {parseProgress}%</div>}
          {prepared && (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Movimientos</div><div className="text-lg font-medium">{prepared.movements.length.toLocaleString('es-CL')}</div></div>
              <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Excepciones</div><div className="text-lg font-medium">{prepared.exceptions.length.toLocaleString('es-CL')}</div></div>
              <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Turnos</div><div className="text-lg font-medium">{prepared.plant.length.toLocaleString('es-CL')}</div></div>
              <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Fuentes SHA válidas</div><div className="text-lg font-medium">{prepared.sourceCount} / 10</div></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Materializar en Supabase</CardTitle>
          <CardDescription>La operación es idempotente por source_hash. La reconciliación final solo marca los batches como importados si los cuatro conteos canónicos coinciden exactamente.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button disabled={!prepared || importing || parsing || reconciled} onClick={() => void importAll()}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : reconciled ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            {reconciled ? 'Producción reconciliada' : importing ? 'Importando…' : 'Importar master a Motil'}
          </Button>
          {importLabel && <span className="text-sm text-muted-foreground">{importLabel}</span>}
        </CardContent>
      </Card>
    </div>
  );
}

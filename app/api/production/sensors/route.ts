export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type SensorRow = {
  id: string;
  sensor_type: string | null;
  unit: string | null;
  name: string | null;
};

type ReadingRow = {
  id: string;
  sensor_id: string | null;
  value: number | string | null;
  unit: string | null;
  status: string | null;
  timestamp: string | null;
  received_at: string | null;
};

type AlarmRow = {
  id: string;
  sensor_id: string | null;
  severity: string | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function latestBySensor(readings: ReadingRow[]) {
  const latest = new Map<string, ReadingRow>();
  for (const reading of readings) {
    if (reading.sensor_id && !latest.has(reading.sensor_id)) latest.set(reading.sensor_id, reading);
  }
  return latest;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = new URL(request.url);
    const assetId =
      searchParams.get('equipment_id') ||
      searchParams.get('asset_id') ||
      searchParams.get('equipmentId');

    if (!assetId) {
      return NextResponse.json({ error: 'equipment_id es requerido', sensor_data: null, alarms: [] }, { status: 400 });
    }

    const { data: asset, error: assetError } = await context.supabase
      .from('canonical_assets_current')
      .select('id,name,asset_type,operational_status')
      .eq('organization_id', context.organizationId)
      .eq('id', assetId)
      .maybeSingle();

    if (assetError) return NextResponse.json({ error: assetError.message }, { status: 500 });
    if (!asset) return NextResponse.json({ error: 'Equipo no encontrado para la organización' }, { status: 404 });

    const { data: sensors, error: sensorsError } = await context.supabase
      .from('sensors')
      .select('id,sensor_type,unit,name')
      .eq('organization_id', context.organizationId)
      .eq('canonical_asset_id', assetId)
      .order('name', { ascending: true });

    if (sensorsError) return NextResponse.json({ error: sensorsError.message }, { status: 500 });

    const sensorRows = (sensors || []) as SensorRow[];
    const sensorIds = sensorRows.map((sensor) => sensor.id);

    let readings: ReadingRow[] = [];
    let alarms: AlarmRow[] = [];

    if (sensorIds.length > 0) {
      const [readingResult, alarmResult] = await Promise.all([
        context.supabase
          .from('sensor_readings')
          .select('id,sensor_id,value,unit,status,timestamp,received_at')
          .eq('organization_id', context.organizationId)
          .in('sensor_id', sensorIds)
          .order('timestamp', { ascending: false })
          .limit(200),
        context.supabase
          .from('alarms')
          .select('id,sensor_id,severity,message,status,created_at')
          .in('sensor_id', sensorIds)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (readingResult.error) return NextResponse.json({ error: readingResult.error.message }, { status: 500 });
      readings = (readingResult.data || []) as ReadingRow[];
      alarms = (alarmResult.data || []) as AlarmRow[];
    }

    const latest = latestBySensor(readings);
    const byType = (tokens: string[]) => {
      const sensor = sensorRows.find((row) => {
        const value = `${row.sensor_type || ''} ${row.name || ''}`.toLowerCase();
        return tokens.some((token) => value.includes(token));
      });
      return sensor ? latest.get(sensor.id) || null : null;
    };

    const temperature = byType(['temperatura', 'temperature']);
    const pressure = byType(['presion', 'presión', 'pressure']);
    const vibration = byType(['vibracion', 'vibración', 'vibration']);
    const rpm = byType(['rpm', 'revolucion', 'revolución']);
    const newestReading = readings[0] || null;
    const activeAlarms = alarms.filter(
      (alarm) => !['resolved', 'resuelta', 'cerrada', 'closed'].includes(String(alarm.status || '').toLowerCase())
    );

    return NextResponse.json({
      equipment_id: assetId,
      equipment_name: asset.name || 'Equipo',
      equipment_type: asset.asset_type,
      operational_status: asset.operational_status,
      sensor_data: {
        asset_id: assetId,
        temperature: toNumber(temperature?.value),
        pressure: toNumber(pressure?.value),
        vibration: toNumber(vibration?.value),
        rpm: toNumber(rpm?.value),
        timestamp: newestReading?.timestamp || newestReading?.received_at || null,
      },
      availability_percentage: null,
      availability_evidence_status: 'insufficient_evidence',
      alarms: activeAlarms.map((alarm) => ({
        id: alarm.id,
        sensor_id: alarm.sensor_id,
        severity: alarm.severity || null,
        message: alarm.message || 'Alerta operacional',
        created_at: alarm.created_at,
      })),
      last_updated: newestReading?.timestamp || newestReading?.received_at || null,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const assetId = String(body?.asset_id || '').trim();
    if (!assetId) return NextResponse.json({ error: 'asset_id es requerido' }, { status: 400 });

    const { data: asset } = await context.supabase
      .from('canonical_assets_current')
      .select('id')
      .eq('organization_id', context.organizationId)
      .eq('id', assetId)
      .maybeSingle();
    if (!asset) return NextResponse.json({ error: 'Equipo no encontrado para la organización' }, { status: 404 });

    return NextResponse.json(
      { error: 'La telemetría debe ingresar por el flujo canónico de sensores; este endpoint no crea lecturas sintéticas.' },
      { status: 409 }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

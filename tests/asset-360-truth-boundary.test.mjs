import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const overview = fs.readFileSync('components/maintenance/asset-360-overview.tsx', 'utf8');
const legacy = fs.readFileSync('components/maintenance/asset-detail-view.tsx', 'utf8');
const maintenanceSection = fs.readFileSync(
  'components/maintenance/asset-360/maintenance-section.tsx',
  'utf8',
);

test('asset 360 keeps runtime meter distinct from MTBF', () => {
  assert.match(overview, /runtime\?\.latest_meter_hours/);
  assert.match(maintenanceSection, /MTBF real/);
  assert.doesNotMatch(
    overview + maintenanceSection,
    /mtbf_hours[^\n]{0,120}Horómetro|Horómetro[^\n]{0,120}mtbf_hours/i,
  );
});

test('legacy asset detail does not label MTBF as a technical hour meter', () => {
  assert.doesNotMatch(legacy, /Horómetro técnico/);
});

test('asset 360 never exposes an empty work-order close target', () => {
  assert.doesNotMatch(overview, /cierre\?workOrderId=\$\{encodeURIComponent\(data\.closeReadiness\?\.\[0\]\?\.work_order_id \|\| ''\)\}/);
  assert.match(overview, /actionableWorkOrder/);
});

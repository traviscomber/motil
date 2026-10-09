import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTopographyEvidenceSnapshot, filterTopographyEvidence, gapLabel, topographyEvidenceRequest } from '../lib/production/topography-evidence-queue.mjs';
function row(id,code,cls,priority=2){
  return {drill_hole_id:id,hole_code:code,source_gap_class:cls,orientation_state:'measured_value_missing',
    recovery_priority:priority,required_source_action:'Recuperar archivo original',
    audit_scope:'Auditoría 2026-09-05',source_rows:[1,2],source_report_ids:['report']};
}
const rows=[row('a','ONDJI26-02','measurement_not_completed',0),row('b','DP25-45','numeric_angle_convention_unresolved',1),row('c','ONP25-09','external_topography_result_missing',2)];
test('unique holes with verified complete coverage',()=>{
  const result=buildTopographyEvidenceSnapshot(rows,3);
  assert.equal(result.complete,true);assert.equal(result.total,3);
  assert.equal(result.loaded,3);assert.equal(result.duplicateIdentifiers,0);
  assert.equal(result.byClass.external_topography_result_missing,1);
  assert.equal(result.rows[0].source_rows_count,2);
  assert.equal(result.rows[0].source_report_count,1);
  assert.equal(result.isLiveMeasurement,false);
});
test('partial source never reports sample as full universe',()=>{
  const result=buildTopographyEvidenceSnapshot(rows.slice(0,2),92);
  assert.equal(result.total,92);assert.equal(result.loaded,2);assert.equal(result.complete,false);
});
test('duplicate and missing canonical IDs are not silently counted',()=>{
  const result=buildTopographyEvidenceSnapshot([...rows,rows[0],row(null,'BAD','other')],5);
  assert.equal(result.complete,false);assert.equal(result.loaded,3);
  assert.equal(result.duplicateIdentifiers,1);assert.equal(result.invalidIdentifiers,1);
});
test('filters search by hole code and category without mutating source',()=>{
  const result=buildTopographyEvidenceSnapshot(rows,3);
  assert.deepEqual(filterTopographyEvidence(result.rows,'onp','all').map(x=>x.hole_code),['ONP25-09']);
  assert.deepEqual(filterTopographyEvidence(result.rows,'','numeric_angle_convention_unresolved').map(x=>x.hole_code),['DP25-45']);
  assert.equal(filterTopographyEvidence(result.rows,'xyz','all').length,0);
  assert.equal(rows.length,3);
});
test('advisory request includes the original audit and no completion claim',()=>{
  const r=topographyEvidenceRequest(buildTopographyEvidenceSnapshot(rows,3).rows[0]);
  assert.match(r,/ONDJI26-02/);assert.match(r,/Recuperar archivo original/);
  assert.match(r,/Auditoría 2026-09-05/);assert.match(r,/no acredita medición/);
  assert.equal(gapLabel('measurement_not_completed'),'Medición pendiente o fallida');
});

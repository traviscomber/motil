import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeEngineeringSourceReadiness } from '../lib/production/engineering-source-readiness.mjs';
const period={status:'expired',canUseAsCurrent:false,evaluatedDate:'2026-10-09'};
function row(status,mine=true,sector=false,meter='24'){
  return {
    reconciliation_status:status,
    canonical_mine_source_id:mine?'mine-1':null,
    canonical_mine_sector_id:sector?'sector-1':null,
    drilled_meters:meter,mine_raw:'#ERROR!',sector_raw:'No registrado',
    operation_date:'2026-08-17',
  };
}
test('August drilling source is correctly blocked for operational comparison',()=>{
  const rows=[...Array.from({length:78},()=>row('review')),...Array.from({length:1},()=>row('matched',false))];
  const s=summarizeEngineeringSourceReadiness(period,rows,79);
  assert.equal(s.reports.total,79);assert.equal(s.reports.complete,true);
  assert.equal(s.reports.statusCounts.review,78);
  assert.equal(s.reports.statusCounts.matched,1);
  assert.equal(s.reports.resolvedSector,0);
  assert.equal(s.reports.bothResolved,0);
  assert.equal(s.reports.invalidRawMine,79);
  assert.equal(s.reports.unregisteredRawSector,79);
  assert.equal(s.comparisonReady,false);
  assert.ok(s.checks.every(check=>check.passed===false));
  assert.equal(s.reports.notVerifiedExecution,true);
});
test('sampled source is not presented as a verified full month',()=>{
  const s=summarizeEngineeringSourceReadiness(period,[row('review')],79);
  assert.equal(s.reports.complete,false);
  assert.equal(s.reports.loaded,1);
  assert.equal(s.reports.total,79);
  assert.equal(s.checks[1].passed,false);
});
test('even reconciled source reports alone are insufficient topographic execution',()=>{
  const today={status:'current',canUseAsCurrent:true,evaluatedDate:'2026-10-09'};
  const s=summarizeEngineeringSourceReadiness(today,[row('approved',true,true)],1);
  assert.equal(s.checks[0].passed,true);
  assert.equal(s.checks[1].passed,true);
  assert.equal(s.checks[2].passed,true);
  assert.equal(s.checks[3].passed,false);
  assert.equal(s.comparisonReady,false);
});
test('missing plan never claims absence of historical drilling',()=>{
  const s=summarizeEngineeringSourceReadiness({status:'missing',canUseAsCurrent:false,evaluatedDate:'2026-10-09'},[],null);
  assert.equal(s.reports.total,null);
  assert.equal(s.reports.complete,false);
  assert.equal(s.comparisonReady,false);
});

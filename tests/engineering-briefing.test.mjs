import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeEngineeringEvidence,formatEngineeringBriefing } from '../lib/production/engineering-briefing.mjs';
import { assessPlanPeriod } from '../lib/production/engineering-plan-period.mjs';

const samplePlan={ plan_code:'MINE-2026-08',status:'active',period_start:'2026-08-01',period_end:'2026-08-31' };
const gaps = Array.from({ length: 92 }, (_, i) => ({
  hole_code: 'S'+i,
  source_gap_class: i<70 ? 'orientation_source_missing' : 'external_topography_result_missing',
  required_source_action: 'Aportar fuente original',
}));
function snapshot({ plan=samplePlan, gapRecords=gaps, gapTotal=92, tasks=[], lines=[] }={}) {
  return summarizeEngineeringEvidence({
    plan, period:assessPlanPeriod(plan,'2026-10-09'),gaps:gapRecords,gapTotal,
    lines,lineTotal:lines.length,tasks,
  });
}

test('expired active-labelled plan is labeled historical and comparison blocked',()=>{
  const s=snapshot();
  assert.equal(s.plan.rawStatus,'active');
  assert.equal(s.planPeriod,'expired');
  assert.equal(s.hasCurrentPlan,false);
  assert.equal(s.topography.verifiedExecution,false);
  assert.match(formatEngineeringBriefing(s), /vencido/);
  assert.match(formatEngineeringBriefing(s), /no verificable/);
});
test('full gap count groups exact source counts without inventing extra gaps',()=>{
  const s=snapshot();
  assert.equal(s.topography.gapCount,92);
  assert.equal(s.topography.allGapsCovered,true);
  assert.equal(s.topography.gapClasses[0].sampled,70);
  assert.equal(s.topography.gapClasses[1].sampled,22);
  assert.match(formatEngineeringBriefing(s), /92 \(cobertura completa/);
});
test('partial gaps are explicitly samples and never extrapolated',()=>{
  const s=snapshot({gapRecords:gaps.slice(0,12)});
  assert.equal(s.topography.allGapsCovered,false);
  assert.match(formatEngineeringBriefing(s),/muestra parcial de 12/);
  assert.match(formatEngineeringBriefing(s),/12 en muestra/);
});
test('no tasks does not mean engineering has no work',()=>{
  assert.match(formatEngineeringBriefing(snapshot()),/no demuestra que no existan pendientes/);
});
test('upcoming and missing periods are never called current',()=>{
  const upcoming=snapshot({plan:{...samplePlan,period_start:'2026-11-01',period_end:'2026-11-30'}});
  assert.equal(upcoming.hasCurrentPlan,false);
  assert.match(formatEngineeringBriefing(upcoming),/futuro/);
  const missing=snapshot({plan:null,lines:[]});
  assert.match(formatEngineeringBriefing(missing),/No existe un plan/);
});

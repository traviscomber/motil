import test from 'node:test';
import assert from 'node:assert/strict';
import { assessPlanPeriod, currentChileDate } from '../lib/production/engineering-plan-period.mjs';

const august = { period_start: '2026-08-01', period_end: '2026-08-31' };

test('active-labelled August plan is not current in October', () => {
  assert.deepEqual(assessPlanPeriod(august, '2026-10-08'), {
    status: 'expired', evaluatedDate: '2026-10-08', canUseAsCurrent: false,
  });
});
test('first and last day are inclusive; a future plan is upcoming', () => {
  for (const date of ['2026-08-01','2026-08-31']) assert.equal(assessPlanPeriod(august,date).status,'current');
  assert.equal(assessPlanPeriod(august, '2026-07-31').status, 'upcoming');
});
test('missing, impossible, reversed and invalid dates fail closed', () => {
  assert.equal(assessPlanPeriod(null, '2026-10-08').status, 'missing');
  assert.equal(assessPlanPeriod({period_start:'2026-02-30',period_end:'2026-03-31'},'2026-03-01').status,'invalid');
  assert.equal(assessPlanPeriod({period_start:'2026-10-20',period_end:'2026-10-01'},'2026-10-08').status,'invalid');
  assert.equal(assessPlanPeriod(august,'bad').canUseAsCurrent,false);
});
test('Chilean dates do not advance early at UTC rollover', () => {
  assert.equal(currentChileDate(new Date('2026-10-09T02:30:00Z')), '2026-10-08');
});

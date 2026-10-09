/**
 * An active database status is not evidence of calendar validity.
 * Date semantics follow the Chilean operational day.
 * @param {Date} [instant]
 */
export function currentChileDate(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant);
  const value = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/** @param {unknown} date */
function validDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

/**
 * @param {{period_start?: string | null, period_end?: string | null} | null} plan
 * @param {string} today
 * @returns {{status:'current'|'expired'|'upcoming'|'missing'|'invalid', evaluatedDate:string, canUseAsCurrent:boolean}}
 */
export function assessPlanPeriod(plan, today) {
  if (!validDate(today)) return { status: 'invalid', evaluatedDate: today, canUseAsCurrent: false };
  if (!plan) return { status: 'missing', evaluatedDate: today, canUseAsCurrent: false };
  const start = plan.period_start, end = plan.period_end;
  if (!validDate(start) || !validDate(end) || start > end) {
    return { status: 'invalid', evaluatedDate: today, canUseAsCurrent: false };
  }
  if (today < start) return { status: 'upcoming', evaluatedDate: today, canUseAsCurrent: false };
  if (today > end) return { status: 'expired', evaluatedDate: today, canUseAsCurrent: false };
  return { status: 'current', evaluatedDate: today, canUseAsCurrent: true };
}

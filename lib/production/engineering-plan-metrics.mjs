/**
 * Plan-line categories include nested and overlapping summaries.
 * The authoritative monthly totals must come from the plan header rather
 * than from adding "mine_total", "preparation", "chamber" etc.
 *
 * @typedef {{ total_mineral_to_plant_tons?:number|string|null,
 *   total_waste_tons?:number|string|null, total_movement_tons?:number|string|null,
 *   planned_advance_m?:number|string|null, planned_drilling_m?:number|string|null }} MonthlyPlan
 * @typedef {{line_type?:string|null, planned_tons?:number|string|null,
 *   planned_advance_m?:number|string|null, planned_drilling_m?:number|string|null}} PlanLine
 */

/** @param {number|string|null|undefined} value */
function numericOrNull(value) {
  if(value === null || value === undefined || value === '')return null;
  const n=Number(value);
  return Number.isFinite(n) && n>=0 ? n : null;
}
/** @param {PlanLine[]} rows @param {string} kind @param {'planned_tons'|'planned_advance_m'|'planned_drilling_m'} metric */
function sumForKind(rows,kind,metric) {
  const subset=rows.filter(row=>row.line_type===kind);
  if(subset.length===0)return null;
  let n=0;
  let covered=0;
  for(const row of subset){
    const value=numericOrNull(row[metric]);
    if(value !== null){n+=value;covered++;}
  }
  return covered ? n : null;
}
/**
 * @param {MonthlyPlan|null} plan
 * @param {PlanLine[]} lines
 * @param {number|null} lineCount
 */
export function summarizeCanonicalMonthlyPlan(plan,lines,lineCount){
  const mineralToPlantTons=numericOrNull(plan?.total_mineral_to_plant_tons);
  const wasteTons=numericOrNull(plan?.total_waste_tons);
  const movementTons=numericOrNull(plan?.total_movement_tons);
  const plannedAdvanceM=numericOrNull(plan?.planned_advance_m);
  const plannedDrillingM=numericOrNull(plan?.planned_drilling_m);
  const byMineTons=sumForKind(lines,'mine_total','planned_tons');
  const radialDetailM=sumForKind(lines,'radial_drilling','planned_drilling_m');
  const detailAdvanceM=lines.reduce((sum,row)=>sum+(numericOrNull(row.planned_advance_m)||0),0);
  const hasDetailAdvance=lines.some(row=>numericOrNull(row.planned_advance_m)!==null);
  const hasCompleteLines=Number.isInteger(lineCount)&&lineCount>=0&&lines.length===lineCount;
  const movementHeaderConsistent=[mineralToPlantTons,wasteTons,movementTons].every(v=>v!==null)
    ? Math.abs(mineralToPlantTons+wasteTons-movementTons)<=0.01
    : null;

  return {
    summary:{
      plannedTons:mineralToPlantTons,
      plannedAdvanceM,
      plannedDrillingM,
      wasteTons,
      totalMovementTons:movementTons,
      source:'production_monthly_plans',
    },
    breakdown:{
      loadedLines:lines.length,
      totalLines:Number.isInteger(lineCount)&&lineCount>=0?lineCount:null,
      complete:hasCompleteLines,
      mineTotalTons:hasCompleteLines?byMineTons:null,
      radialDrillingM:hasCompleteLines?radialDetailM:null,
      detailedAdvanceM:hasCompleteLines&&hasDetailAdvance?detailAdvanceM:null,
      movementHeaderConsistent,
      overlapsByDesign:true,
      note:'Los renglones contienen agregados por mina y partidas de preparación/cámaras. No se suman las toneladas de todas las filas para calcular el total mensual. El detalle de perforación radial puede ser parcial respecto del objetivo global.',
    },
  };
}

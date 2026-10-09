/**
 * Read-only quality gates before comparing mine planning and drilling sources.
 * Drilling source reports are unverified imports, not topographic measurements.
 * @typedef {{operation_date?:string|null,reconciliation_status?:string|null,
 * canonical_mine_source_id?:string|null,canonical_mine_sector_id?:string|null,
 * drilled_meters?:number|string|null,mine_raw?:string|null,sector_raw?:string|null}} SourceRow
 * @typedef {{status:string,canUseAsCurrent:boolean,evaluatedDate:string}} Period
 */

/** @param {Period} period @param {SourceRow[]} sourceRows @param {number|null} total */
export function summarizeEngineeringSourceReadiness(period,sourceRows,total){
  const hasCount=Number.isInteger(total)&&total>=0;
  const complete=hasCount&&sourceRows.length===total;
  const counts={review:0,matched:0,approved:0,other:0};
  let resolvedMine=0,resolvedSector=0,bothResolved=0,withReportedMeters=0;
  let invalidRawMine=0,unregisteredRawSector=0;
  let firstDate=null,lastDate=null;
  for(const row of sourceRows){
    if(row.reconciliation_status==='review')counts.review++;
    else if(row.reconciliation_status==='matched')counts.matched++;
    else if(row.reconciliation_status==='approved')counts.approved++;
    else counts.other++;
    const mine=Boolean(row.canonical_mine_source_id);
    const sector=Boolean(row.canonical_mine_sector_id);
    if(mine)resolvedMine++;
    if(sector)resolvedSector++;
    if(mine&&sector)bothResolved++;
    if(row.drilled_meters!==null&&row.drilled_meters!==undefined&&row.drilled_meters!=='')withReportedMeters++;
    if(row.mine_raw?.trim()==='#ERROR!')invalidRawMine++;
    if(row.sector_raw?.trim().toLowerCase()==='no registrado')unregisteredRawSector++;
    if(row.operation_date){
      if(!firstDate||row.operation_date<firstDate)firstDate=row.operation_date;
      if(!lastDate||row.operation_date>lastDate)lastDate=row.operation_date;
    }
  }
  const readyPeriod=period.canUseAsCurrent;
  const readySector=Boolean(complete&&total>0&&bothResolved===total);
  const readySource=Boolean(complete&&total>0&&counts.approved===total);
  const checks=[
    {code:'monthly_plan',passed:readyPeriod,
      label:readyPeriod?'Plan mensual vigente':'Plan del período no vigente'},
    {code:'sector_mapping',passed:readySector,
      label:readySector?'Sectores fuente identificados':'Sectores de perforación sin identificación completa'},
    {code:'source_reconciliation',passed:readySource,
      label:readySource?'Registros fuente conciliados':'Registros de perforación pendientes de validación'},
    {code:'topography_measurements',passed:false,
      label:'Sin levantamientos topográficos canónicos incorporados'},
  ];
  return {
    evaluatedDate:period.evaluatedDate,planPeriod:period.status,
    comparisonReady:checks.every(item=>item.passed),checks,
    reports:{
      total:hasCount?total:null,loaded:sourceRows.length,
      complete:Boolean(complete),statusCounts:counts,
      resolvedMine,resolvedSector,bothResolved,withReportedMeters,
      invalidRawMine,unregisteredRawSector,firstDate,lastDate,
      source:'production_drilling_source_reports',
      notVerifiedExecution:true,
    },
    note:'Los registros de perforación son documentos fuente sin conciliación topográfica acreditada. No calcular cumplimiento ni avance real desde esta consulta.',
  };
}

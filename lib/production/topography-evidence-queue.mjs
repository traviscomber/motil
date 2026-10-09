/**
 * A recovery gap is not a measurement of executed drilling or topography.
 * @typedef {{
 * drill_hole_id: string|null, hole_code:string|null, orientation_state:string|null,
 * recovery_priority:number|null, source_gap_class:string|null, required_source_action:string|null,
 * audit_scope:string|null, source_rows:unknown[]|null, source_report_ids:unknown[]|null
 * }} SourceGapRecord
 */
export const TOPOGRAPHY_GAP_LABELS=Object.freeze({
  orientation_source_missing:'Sin orientación original',
  external_topography_result_missing:'Sin resultado topográfico externo',
  verified_setup_values_missing:'Sin parámetros de instalación verificados',
  numeric_angle_convention_unresolved:'Convención angular sin resolver',
  canonical_orientation_partial:'Orientación canónica parcial',
  measurement_not_completed:'Medición pendiente o fallida',
});
/** @param {string|null|undefined} code */
export function gapLabel(code) {
  return TOPOGRAPHY_GAP_LABELS[/** @type {keyof typeof TOPOGRAPHY_GAP_LABELS} */ (code||'')] || 'Otra brecha documentada';
}
/** @param {SourceGapRecord[]} raw @param {number|null} count */
export function buildTopographyEvidenceSnapshot(raw,count) {
  const seen=new Set();
  const rows=[];
  let duplicateIdentifiers=0,invalidIdentifiers=0;
  for(const item of raw){
    const id=item.drill_hole_id?.trim();
    if(!id){invalidIdentifiers++;continue;}
    if(seen.has(id)){duplicateIdentifiers++;continue;}
    seen.add(id);
    rows.push({
      drill_hole_id:id,
      hole_code:item.hole_code||'Sin código',
      source_gap_class:item.source_gap_class||'unclassified',
      orientation_state:item.orientation_state||null,
      recovery_priority:Number.isInteger(item.recovery_priority)?item.recovery_priority:null,
      required_source_action:item.required_source_action||'Verificar evidencia original con Topografía.',
      audit_scope:item.audit_scope||null,
      source_rows_count:Array.isArray(item.source_rows)?item.source_rows.length:null,
      source_report_count:Array.isArray(item.source_report_ids)?item.source_report_ids.length:null,
    });
  }
  /** @type {Record<string,number>} */
  const byClass={};
  for(const item of rows)byClass[item.source_gap_class]=(byClass[item.source_gap_class]||0)+1;
  const verifiedTotal=Number.isInteger(count)&&count>=0;
  return {
    total:verifiedTotal?count:null,loaded:rows.length,sourceRowsRead:raw.length,
    duplicateIdentifiers,invalidIdentifiers,
    complete:Boolean(verifiedTotal&&count===raw.length&&!duplicateIdentifiers&&!invalidIdentifiers),
    byClass,rows,
    provenance:'production_geology_topography_source_gap_2026_v1',isLiveMeasurement:false,
  };
}
/** @param {ReturnType<typeof buildTopographyEvidenceSnapshot>['rows']} rows @param {string} query @param {string} code */
export function filterTopographyEvidence(rows,query,code){
  const lookup=query.trim().toLowerCase();
  return rows.filter((gap)=>(code==='all'||gap.source_gap_class===code)&&
    (!lookup||gap.hole_code.toLowerCase().includes(lookup)));
}
/** @param {ReturnType<typeof buildTopographyEvidenceSnapshot>['rows'][number]} gap */
export function topographyEvidenceRequest(gap){
  return [
    'MOTIL / Solicitud de respaldo documental de Topografía',
    'Sondaje: '+gap.hole_code,
    'Brecha: '+gapLabel(gap.source_gap_class),
    'Prioridad de recuperación en la fuente: '+(gap.recovery_priority??'sin dato'),
    'Acción requerida: '+gap.required_source_action,
    'Auditoría de origen: '+(gap.audit_scope||'no especificada'),
    'Esta solicitud no acredita medición, validación técnica ni cierre de la brecha.',
  ].join('\n');
}

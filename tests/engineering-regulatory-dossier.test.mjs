import test from 'node:test';
import assert from 'node:assert/strict';
import { engineeringReviewSourceId, buildEngineeringRegulatoryDossier } from '../lib/production/engineering-regulatory-dossier.mjs';

const orgA='2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';
const orgB='2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3def';
const item={id:'sernageomin-mine-plans-and-advance-records',title:'Planos mineros',legalBasis:['DS 132'],businessOwner:'Empresa Minera',
 priority:'high',expectedEvidence:['plano_mina_con_version_y_fecha'],nextAction:'Revisar planos.',sourceUrl:'https://example.org/ley',applicabilityNote:'Revisión humana.'};
test('handoff keys are stable RFC-compatible UUIDs and tenant separated',()=>{
 const x=engineeringReviewSourceId(orgA,item.id);
 assert.match(x,/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 assert.equal(engineeringReviewSourceId(orgA,item.id),x);
 assert.notEqual(engineeringReviewSourceId(orgB,item.id),x);
 assert.notEqual(engineeringReviewSourceId(orgA,'sernageomin-approved-project-and-closure-plan'),x);
});
test('operational source metadata never becomes verified SERNAGEOMIN evidence',()=>{
 const snapshot=buildEngineeringRegulatoryDossier([item],orgA,[],0,[{
   id:'source-1',source_file:'PROGRAMA DE PRODUCCION AGOSTO 2026.pdf',
   source_kind:'plan',canonical_role:'plan_only',period_start:'2026-08-01',period_end:'2026-08-31',
 }],1,[]);
 assert.equal(snapshot.requirements.length,1);
 assert.equal(snapshot.requirements[0].documentVerification,'not_assessed_by_legal');
 assert.equal(snapshot.requirements[0].reviewCase,null);
 assert.equal(snapshot.summary.technicalDocumentCount,0);
 assert.equal(snapshot.summary.historicalSourceCount,1);
 assert.equal(snapshot.historicalSources[0].classification,'operational_context_only');
 assert.equal(snapshot.policy.anyComplianceVerdictCalculated,false);
});
test('a persisted Legal case is status-only and never implies approval',()=>{
 const key=engineeringReviewSourceId(orgA,item.id);
 const snapshot=buildEngineeringRegulatoryDossier([item],orgA,[],0,[],0,[
   {id:'case-1',source_id:key,status:'closed',evidence_status:'complete',legal_owner:'no-leak'},
   {id:'unrelated',source_id:engineeringReviewSourceId(orgB,item.id),status:'new',evidence_status:'pending'},
 ]);
 assert.deepEqual(snapshot.requirements[0].reviewCase,{id:'case-1',status:'closed',evidenceStatus:'complete'});
 assert.equal(snapshot.policy.legalApplicabilityVerified,false);
 assert.equal(snapshot.policy.linkedEvidenceVerifiedByLegal,false);
 assert.equal(snapshot.summary.requestedReviews,1);
});
test('truncated inventory cannot be portrayed as a complete document review',()=>{
 const out=buildEngineeringRegulatoryDossier([item],orgA,[],90,[],100,[]);
 assert.equal(out.summary.technicalDocumentsComplete,false);
 assert.equal(out.summary.historicalSourcesComplete,false);
 assert.equal(out.policy.documentsMayExistOutsideThisInventory,true);
});

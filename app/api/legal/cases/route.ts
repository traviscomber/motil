export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';
import { getLegalComplianceOverview } from '@/lib/api/contracts';
import { loadRegulatoryIntelligenceContext } from '@/lib/intelligence/regulatory-intelligence-context';

type LegalCase = {
  id: string;
  source: 'contract' | 'document' | 'regulatory';
  matter: 'contracts' | 'documents' | 'regulatory';
  priority: 'critical' | 'high' | 'medium';
  title: string;
  reason: string;
  nextAction: string;
  owner: string;
  legalRole: string;
  dueLabel: string;
  evidenceState: string;
  href: string;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.LEGAL_MODULO);
  if (access !== 'ED' && access !== 'LEC') {
    return NextResponse.json({ error: 'No tienes acceso al módulo Legal' }, { status: 403 });
  }

  const [compliance, regulatory] = await Promise.all([
    getLegalComplianceOverview(context.organizationId),
    loadRegulatoryIntelligenceContext(context, 100),
  ]);

  const cases: LegalCase[] = [];

  for (const contract of compliance.contracts_pending_review || []) {
    cases.push({
      id: `contract-review-${contract.id}`,
      source: 'contract',
      matter: 'contracts',
      priority: 'high',
      title: contract.title || 'Contrato por revisar',
      reason: 'Contrato en revisión o con cumplimiento pendiente.',
      nextAction: 'Revisar condiciones, responsable, respaldo y decisión pendiente.',
      owner: contract.responsible_area || contract.responsible_person || 'Área responsable sin asignar',
      legalRole: 'Revisar riesgo contractual, observaciones y condición para aprobación.',
      dueLabel: contract.review_due_date
        ? `Revisión: ${contract.review_due_date}`
        : 'Sin fecha de revisión registrada',
      evidenceState: contract.has_file ? 'Contrato con respaldo' : 'Falta respaldo contractual',
      href: '/dashboard/legal/contratos',
    });
  }

  for (const contract of compliance.expiring_contracts || []) {
    cases.push({
      id: `contract-expiry-${contract.id}`,
      source: 'contract',
      matter: 'contracts',
      priority: 'high',
      title: contract.title || 'Contrato por vencer',
      reason: 'Contrato próximo a vencimiento.',
      nextAction: 'Definir renovación, término, modificación o nueva negociación antes del vencimiento.',
      owner: contract.responsible_area || contract.responsible_person || 'Área responsable sin asignar',
      legalRole: 'Controlar plazo, condiciones de salida/renovación y documentación de la decisión.',
      dueLabel: typeof contract.days_until_expiry === 'number'
        ? `Vence en ${contract.days_until_expiry} días`
        : 'Vencimiento próximo',
      evidenceState: contract.has_file ? 'Contrato con respaldo' : 'Falta respaldo contractual',
      href: '/dashboard/legal/contratos',
    });
  }

  for (const contract of compliance.contracts_missing_file || []) {
    cases.push({
      id: `contract-file-${contract.id}`,
      source: 'contract',
      matter: 'documents',
      priority: 'medium',
      title: contract.title || 'Contrato sin respaldo',
      reason: 'Existe registro contractual sin archivo de respaldo.',
      nextAction: 'Obtener y vincular el documento contractual vigente.',
      owner: contract.responsible_area || contract.responsible_person || 'Área responsable sin asignar',
      legalRole: 'Custodiar el expediente y verificar que el archivo corresponda a la versión vigente.',
      dueLabel: 'Sin plazo inferido',
      evidenceState: 'Respaldo faltante',
      href: '/dashboard/legal/documentos',
    });
  }

  for (const document of compliance.expiring_documents || []) {
    cases.push({
      id: `document-expiry-${document.id}`,
      source: 'document',
      matter: 'documents',
      priority: 'high',
      title: document.title || 'Documento por vencer',
      reason: 'Documento regulatorio o de cumplimiento con vencimiento próximo.',
      nextAction: 'Validar renovación, sustitución o cierre antes de la fecha de vencimiento.',
      owner: 'Área dueña del documento por confirmar',
      legalRole: 'Controlar vigencia, aplicabilidad y evidencia de renovación o cierre.',
      dueLabel: document.expiry_date ? `Vence: ${document.expiry_date}` : 'Vencimiento próximo',
      evidenceState: 'Documento registrado',
      href: '/dashboard/legal/documentos',
    });
  }

  if (regulatory.available && regulatory.canonicalEvidence) {
    const evidence = regulatory.canonicalEvidence.items;
    for (const obligation of regulatory.obligations) {
      const normalizedKeywords = obligation.evidenceKeywords.map((value) => value.toLowerCase());
      const matches = evidence.filter((item) => {
        const text = [item.label, ...Object.values(item.provenance || {})].join(' ').toLowerCase();
        return normalizedKeywords.some((keyword) => text.includes(keyword));
      });

      if (!matches.length) continue;

      cases.push({
        id: `regulatory-${obligation.id}`,
        source: 'regulatory',
        matter: 'regulatory',
        priority: obligation.priority,
        title: obligation.title,
        reason: `MOTIL detectó evidencia contextual que puede relacionarse con esta obligación de ${obligation.authority}.`,
        nextAction: obligation.nextAction,
        owner: obligation.businessOwner,
        legalRole: obligation.legalRole,
        dueLabel: obligation.timingRule,
        evidenceState: `${matches.length} evidencia(s) candidata(s) por revisar`,
        href: '/dashboard/legal/sernageomin',
      });
    }
  }

  const rank = { critical: 0, high: 1, medium: 2 } as const;
  cases.sort((a, b) => rank[a.priority] - rank[b.priority]);

  return NextResponse.json({
    cases,
    summary: {
      total: cases.length,
      critical: cases.filter((item) => item.priority === 'critical').length,
      high: cases.filter((item) => item.priority === 'high').length,
      contracts: cases.filter((item) => item.matter === 'contracts').length,
      regulatory: cases.filter((item) => item.matter === 'regulatory').length,
      documents: cases.filter((item) => item.matter === 'documents').length,
    },
    policy: {
      derivedQueue: true,
      sourceOfTruth: 'Los casos se derivan de contratos, documentos y evidencia regulatoria canónica. Esta cola no crea una segunda fuente de verdad.',
      closeRule: 'Un caso sólo puede considerarse resuelto cuando la fuente canónica correspondiente queda actualizada y la revisión humana requerida está completa.',
    },
  });
}

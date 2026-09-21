export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials are not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

interface ApprovalRequest {
  document_id: string;
  approval_level: number;
  action: 'approve' | 'reject';
  comments: string;
  user_id: string;
  user_role: string;
}

interface ApprovalRecord {
  approval_level: number;
  status: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body: ApprovalRequest = await request.json();
    const { document_id, approval_level, action, comments, user_id, user_role } = body;

    if (!document_id || !approval_level || !action || !user_id || !user_role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: approval, error: getError } = await supabase
      .from('document_approvals')
      .select('*')
      .eq('document_id', document_id)
      .eq('approval_level', approval_level)
      .single();

    if (getError || !approval) {
      return NextResponse.json({ error: 'Approval record not found' }, { status: 404 });
    }

    if (approval.required_role !== user_role) {
      return NextResponse.json({ error: 'Insufficient permissions to approve at this level' }, { status: 403 });
    }

    const { data: updatedApproval, error: updateError } = await supabase
      .from('document_approvals')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: user_id,
        approved_at: new Date().toISOString(),
        comments,
        rejection_reason: action === 'reject' ? comments : null,
      })
      .eq('id', approval.id)
      .select()
      .single();

    if (updateError) {
      console.error('[v0] Error updating approval:', updateError);
      return NextResponse.json({ error: 'No se pudo actualizar approval' }, { status: 500 });
    }

    const warnings: string[] = [];

    if (action === 'approve') {
      const { data: allApprovals, error: approvalsError } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', document_id)
        .order('approval_level', { ascending: true });

      if (approvalsError) {
        warnings.push('No se pudo validar la cadena completa de aprobaciones');
      } else {
        let newDocStatus = 'under_review';

        if (allApprovals && allApprovals.length > 0) {
          const approvalsList = Array.isArray(allApprovals) ? (allApprovals as ApprovalRecord[]) : [];
          const isLastLevel = approval_level === Math.max(...approvalsList.map((approval) => approval.approval_level));

          if (isLastLevel) {
            const previousApprovals = approvalsList.filter((approval) => approval.approval_level < approval_level);
            const allPreviousApproved = previousApprovals.every((approval) => approval.status === 'approved');

            if (allPreviousApproved) {
              newDocStatus = 'approved';
            }
          }
        }

        const { error: docUpdateError } = await supabase
          .from('documents')
          .update({
            status: newDocStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', document_id);

        if (docUpdateError) {
          warnings.push('No se pudo actualizar el estado del documento');
          console.error('[v0] Error updating document status:', docUpdateError);
        }
      }
    } else if (action === 'reject') {
      const { error: docUpdateError } = await supabase
        .from('documents')
        .update({
          status: 'rejected',
          rejection_reason: comments,
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', document_id);

      if (docUpdateError) {
        warnings.push('No se pudo actualizar el estado del documento');
        console.error('[v0] Error updating rejected document:', docUpdateError);
      }
    }

    try {
      await supabase.from('document_audit_logs').insert({
        document_id,
        action: action === 'approve' ? 'approved' : 'rejected',
        user_id,
        details: `${action === 'approve' ? 'Approved' : 'Rejected'} at level ${approval_level}: ${comments || ''}`,
      });
    } catch (auditError) {
      warnings.push('No se pudo guardar el audit log');
      console.error('[v0] Error inserting audit log:', auditError);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Document ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        data: updatedApproval,
        warnings,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Error in POST /api/sostenibilidad/documentos-flujo/approve:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import EvidenceForm from './EvidenceForm'

export default async function EvidencePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: link } = await admin
    .from('access_links')
    .select('*, projects(id, name)')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (!link) redirect('/')

  const project = link.projects as { id: string; name: string } | null
  if (!project) redirect('/')

  // 최근 보고 목록 (증빙 첨부 대상)
  const { data: reports } = await admin
    .from('reports')
    .select('id, report_date, overall_status')
    .eq('project_id', project.id)
    .eq('access_link_id', link.id)
    .order('report_date', { ascending: false })
    .limit(10)

  // 기존 증빙 목록
  const { data: existingEvidence } = await admin
    .from('evidence_items')
    .select('*, reports(report_date)')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">증빙자료 제출</h1>
        <p className="text-sm text-gray-500 mt-1">
          작업 결과물, 스크린샷, 링크 등 진행 증빙을 제출합니다.
        </p>
      </div>
      <EvidenceForm
        projectId={project.id}
        token={token}
        reports={reports || []}
        existingEvidence={existingEvidence || []}
      />
    </div>
  )
}

import { createAdminClient } from '@/lib/supabase/admin'
import ReportForm from './ReportForm'
import type { AccessLink, Project, Feature } from '@/types'

export default async function VendorReportPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: link } = await admin
    .from('access_links')
    .select(`*, projects(*)`)
    .eq('token', token)
    .eq('is_active', true)
    .single() as { data: (AccessLink & { projects: Project }) | null }

  if (!link) return <div>유효하지 않은 링크</div>

  const project = link.projects
  const today = new Date().toISOString().split('T')[0]

  // Get approved features for selection
  const { data: features } = await admin
    .from('features')
    .select('id, order_key, name, status')
    .eq('project_id', project.id)
    .in('status', ['spec_approved', 'in_progress', 'completed_candidate'])
    .order('order_key') as { data: Feature[] | null }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">일일 보고</h1>
      <p className="text-sm text-slate-500 mb-6">오늘({today})의 작업 내용을 간략히 공유해 주세요</p>
      <ReportForm
        projectId={project.id}
        accessLinkId={link.id}
        reportDate={today}
        features={features || []}
        token={token}
      />
    </div>
  )
}

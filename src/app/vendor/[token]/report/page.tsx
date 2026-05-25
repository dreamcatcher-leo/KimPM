import { createAdminClient } from '@/lib/supabase/admin'
import ReportForm from './ReportForm'
import type { AccessLink, Project, Feature, Report } from '@/types'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2 } from 'lucide-react'

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

  // 오늘 제출된 보고 조회 (수정 모드 지원)
  const [featuresResult, todayReportResult] = await Promise.all([
    admin
      .from('features')
      .select('id, order_key, name, status')
      .eq('project_id', project.id)
      .in('status', ['spec_approved', 'in_progress', 'completed_candidate'])
      .order('order_key'),
    admin
      .from('reports')
      .select('*')
      .eq('project_id', project.id)
      .eq('report_date', today)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const features = featuresResult.data as Feature[] | null
  const todayReport = todayReportResult.data as Report | null

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-xl font-bold text-slate-900">일일 보고</h1>
        {todayReport && (
          <Badge className="bg-green-100 text-green-700 gap-1 border-green-200">
            <CheckCircle2 className="w-3 h-3" />
            오늘 제출 완료 · 수정 중
          </Badge>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-6">
        오늘({today})의 작업 내용을 간략히 공유해 주세요
        {todayReport && ' — 이미 제출된 내용을 수정합니다'}
      </p>
      <ReportForm
        projectId={project.id}
        accessLinkId={link.id}
        reportDate={today}
        features={features || []}
        token={token}
        existingReport={todayReport}
      />
    </div>
  )
}

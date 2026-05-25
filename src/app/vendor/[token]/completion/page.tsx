import { createAdminClient } from '@/lib/supabase/admin'
import CompletionForm from './CompletionForm'
import type { AccessLink, Project, Feature } from '@/types'

export default async function VendorCompletionPage({
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

  const { data: features } = await admin
    .from('features')
    .select('*')
    .eq('project_id', link.project_id)
    .in('status', ['spec_approved', 'in_progress'])
    .order('order_key') as { data: Feature[] | null }

  const { data: myCompletions } = await admin
    .from('completion_candidates')
    .select(`*, features(order_key, name)`)
    .eq('access_link_id', link.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">개발 완료 신청</h1>
      <p className="text-sm text-slate-500 mb-2">기능 개발이 완료됐다고 판단되면 대표에게 검수를 요청합니다</p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-6">
        <p className="text-xs text-blue-700">
          📋 완료 신청 후 대표가 QA 체크리스트를 기반으로 검수합니다. QA 체크리스트 미작성 시 검수 승인이 지연될 수 있습니다.
        </p>
      </div>
      <CompletionForm
        projectId={link.project_id}
        accessLinkId={link.id}
        features={features || []}
        existingCompletions={myCompletions || []}
        token={token}
      />
    </div>
  )
}

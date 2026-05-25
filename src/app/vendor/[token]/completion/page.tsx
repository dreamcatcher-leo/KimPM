import { createAdminClient } from '@/lib/supabase/admin'
import CompletionForm from './CompletionForm'
import type { AccessLink, Project, Feature } from '@/types'
import { Info } from 'lucide-react'

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

  // ── 기능 목록 (신청 가능 = in_progress 우선, spec_approved도 포함) ──
  const { data: allCandidateFeatures } = await admin
    .from('features')
    .select('*')
    .eq('project_id', link.project_id)
    .in('status', ['spec_approved', 'in_progress'])
    .order('order_key') as { data: Feature[] | null }

  const features = allCandidateFeatures || []

  // in_progress: 완료 신청 가능 (개발 중 → 완료 후보)
  const inProgressFeatures = features.filter(f => f.status === 'in_progress')
  // spec_approved: 개발 착수 전이지만 선택적으로 허용
  const waitingFeatures = features.filter(f => f.status === 'spec_approved')

  const { data: myCompletions } = await admin
    .from('completion_candidates')
    .select(`*, features(order_key, name)`)
    .eq('access_link_id', link.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">개발 완료 신청</h1>
      <p className="text-sm text-slate-500 mb-4">
        기능 개발이 완료됐다고 판단되면 대표에게 검수를 요청합니다
      </p>

      {/* 완료 신청 가능 기능 안내 */}
      {inProgressFeatures.length > 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs font-semibold text-green-800 mb-1.5">
            ✅ 지금 완료 신청 가능한 기능 ({inProgressFeatures.length}건)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {inProgressFeatures.map(f => (
              <span
                key={f.id}
                className="text-xs bg-white border border-green-200 text-green-800 px-2 py-0.5 rounded font-mono"
              >
                [{f.order_key}] {f.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs text-slate-500">
            현재 개발 중(in_progress) 상태인 기능이 없습니다.
            개발을 시작한 기능이 생기면 여기에 표시됩니다.
          </p>
        </div>
      )}

      {/* 검수 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-800">완료 신청 전 체크리스트</p>
          <ul className="text-xs text-blue-700 mt-1 space-y-0.5 list-disc list-inside">
            <li>정의서의 수용 기준(Acceptance Criteria)을 모두 충족했나요?</li>
            <li>QA 체크리스트 항목을 직접 검증했나요?</li>
            <li>주요 시나리오 스크린샷이나 영상 증빙이 준비됐나요?</li>
          </ul>
        </div>
      </div>

      <CompletionForm
        projectId={link.project_id}
        accessLinkId={link.id}
        features={features}
        inProgressFeatures={inProgressFeatures}
        existingCompletions={myCompletions || []}
        token={token}
      />
    </div>
  )
}

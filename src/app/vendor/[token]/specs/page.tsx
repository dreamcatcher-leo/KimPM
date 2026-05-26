import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, FileText, Eye, AlertCircle, Info, Hammer, Clock, Trophy, MessageSquare } from 'lucide-react'
import type { AccessLink, Project, Feature, Spec } from '@/types'
import VendorSpecReviewForm from './VendorSpecReviewForm'

// 외주사가 이 페이지를 열람하면 viewed_at 기록
async function markSpecsViewed(specIds: string[]) {
  if (specIds.length === 0) return
  try {
    const admin = createAdminClient()
    const now = new Date().toISOString()
    // viewed_at이 없는 건만 업데이트 (최초 열람 시각 보존)
    await admin
      .from('specs')
      .update({ viewed_at: now })
      .in('id', specIds)
      .is('viewed_at', null)
  } catch {
    // 컬럼 없으면 graceful skip
  }
}

// ── 기능 카드 컴포넌트 ──────────────────────────────────────────────────
function FeatureSpecCard({
  feature,
  spec,
  isNew,
  projectId,
}: {
  feature: Feature
  spec: Spec | undefined
  isNew: boolean
  projectId: string
}) {
  const isViewed = spec?.viewed_at
  const sentAt = spec?.sent_at
  const approvedAt = spec?.approved_at

  return (
    <Card className={spec ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-60'}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* 상태 배지 행 */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                {feature.order_key}
              </span>

              {/* 🆕 NEW 배지 — spec 있는데 아직 열람 안 한 경우 */}
              {spec && !isViewed && (
                <Badge className="bg-red-500 text-white text-xs animate-pulse border-0">
                  NEW
                </Badge>
              )}

              {spec ? (
                <>
                  <Badge className="bg-green-100 text-green-700 text-xs gap-1 border-green-200">
                    <CheckCircle className="w-3 h-3" />
                    정의서 승인됨
                  </Badge>
                  {isViewed ? (
                    <Badge className="bg-blue-100 text-blue-700 text-xs gap-1 border-blue-100">
                      <Eye className="w-3 h-3" />
                      열람 완료
                    </Badge>
                  ) : sentAt ? (
                    <Badge className="bg-yellow-100 text-yellow-700 text-xs border-yellow-200">
                      📨 전달됨
                    </Badge>
                  ) : approvedAt ? (
                    <Badge className="bg-slate-100 text-slate-500 text-xs border-slate-200">
                      승인됨 (미전달)
                    </Badge>
                  ) : null}
                </>
              ) : (
                <Badge className="bg-slate-100 text-slate-400 text-xs">
                  정의서 준비 중
                </Badge>
              )}
            </div>
            <CardTitle className="text-base text-slate-900">{feature.name}</CardTitle>
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{feature.description}</p>
          </div>

          {/* 버전/날짜 */}
          {spec && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-400">v{spec.version}</p>
              {approvedAt && (
                <p className="text-xs text-slate-300 mt-0.5">
                  {new Date(approvedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 승인
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      {spec ? (
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList className="mb-3 flex-wrap h-auto">
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="scope">범위</TabsTrigger>
              <TabsTrigger value="criteria">수용 기준</TabsTrigger>
              {(spec.qa_checklist?.length > 0 || spec.vendor_expected_questions) && (
                <TabsTrigger value="qa">QA 체크리스트</TabsTrigger>
              )}
            </TabsList>

            {/* 개요 탭 */}
            <TabsContent value="overview" className="space-y-3">
              {spec.background && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">📌 기능 배경</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                    {spec.background}
                  </p>
                </div>
              )}
              {spec.current_problem && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">⚠️ 현재 문제</p>
                  <p className="text-sm text-slate-700 bg-amber-50 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                    {spec.current_problem}
                  </p>
                </div>
              )}
              {spec.related_users && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">👥 관련 사용자</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                    {spec.related_users}
                  </p>
                </div>
              )}
              {!spec.background && !spec.current_problem && !spec.related_users && (
                <p className="text-sm text-slate-400 text-center py-4">개요 정보가 없습니다</p>
              )}
            </TabsContent>

            {/* 범위 탭 */}
            <TabsContent value="scope" className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {spec.in_scope && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-1.5">✅ 포함 범위</p>
                    <p className="text-sm text-slate-700 bg-green-50 border border-green-100 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                      {spec.in_scope}
                    </p>
                  </div>
                )}
                {spec.out_of_scope && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 mb-1.5">❌ 제외 범위</p>
                    <p className="text-sm text-slate-700 bg-red-50 border border-red-100 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                      {spec.out_of_scope}
                    </p>
                  </div>
                )}
              </div>
              {spec.screen_flow && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">🖥️ 화면 흐름</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                    {spec.screen_flow}
                  </p>
                </div>
              )}
              {spec.edge_cases && (
                <div>
                  <p className="text-xs font-semibold text-orange-600 mb-1.5">🔶 엣지 케이스</p>
                  <p className="text-sm text-slate-700 bg-orange-50 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                    {spec.edge_cases}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* 수용 기준 탭 */}
            <TabsContent value="criteria">
              {spec.acceptance_criteria ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-2">✅ 수용 기준 (완료 판단 기준)</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {spec.acceptance_criteria}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">수용 기준이 없습니다</p>
              )}
            </TabsContent>

            {/* QA 탭 */}
            {(spec.qa_checklist?.length > 0 || spec.vendor_expected_questions) && (
              <TabsContent value="qa" className="space-y-3">
                {spec.qa_checklist && spec.qa_checklist.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">📋 QA 체크리스트</p>
                    <div className="space-y-1.5">
                      {spec.qa_checklist.map((item: { id?: string; category: string }, idx: number) => (
                        <div key={item.id || idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span>{item.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {spec.vendor_expected_questions && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">❓ 개발 중 자주 묻는 질문</p>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                      {spec.vendor_expected_questions}
                    </p>
                  </div>
                )}
                {spec.vendor_answer_drafts && (
                  <div>
                    <p className="text-xs font-semibold text-blue-600 mb-1.5">💬 답변 가이드</p>
                    <p className="text-sm text-slate-700 bg-blue-50 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                      {spec.vendor_answer_drafts}
                    </p>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>

          {/* ── 수정 제안 폼 (대표가 전송한 spec에만 표시) ── */}
          {spec.sent_at && (
            <VendorSpecReviewForm
              specId={spec.id}
              featureName={feature.name}
              projectId={projectId}
            />
          )}
          {/* sent_at 없어도 열람 자체가 됐으면 수정 제안 가능 */}
          {!spec.sent_at && spec.viewed_at && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MessageSquare className="w-3.5 h-3.5" />
                수정 제안은 대표가 정의서를 전송한 후 가능합니다.
              </div>
            </div>
          )}
        </CardContent>
      ) : (
        <CardContent>
          <p className="text-sm text-slate-400 text-center py-3">
            이 기능의 정의서는 아직 승인되지 않았습니다
          </p>
        </CardContent>
      )}
    </Card>
  )
}

// ── 섹션 헤더 컴포넌트 ───────────────────────────────────────────────────
function SectionHeader({
  icon,
  label,
  count,
  colorClass,
  bgClass,
}: {
  icon: React.ReactNode
  label: string
  count: number
  colorClass: string
  bgClass: string
}) {
  return (
    <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl ${bgClass} mb-3`}>
      <span className={colorClass}>{icon}</span>
      <span className={`text-sm font-bold ${colorClass}`}>{label}</span>
      <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 ${colorClass}`}>
        {count}건
      </span>
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────
export default async function VendorSpecsPage({
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

  if (!link) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700 mb-2">유효하지 않은 링크</h2>
        <p className="text-sm text-slate-500">링크가 만료되었거나 비활성화된 상태입니다</p>
      </div>
    )
  }

  const project = link.projects

  const featuresResult = await admin
    .from('features')
    .select('*')
    .eq('project_id', link.project_id)
    .order('order_key')
  const features = featuresResult.data as Feature[] | null

  const featureIds = (features || []).map(f => f.id)
  let specs: Spec[] = []
  if (featureIds.length > 0) {
    const specsResult = await admin
      .from('specs')
      .select('*')
      .eq('status', 'approved')
      .in('feature_id', featureIds)
      .order('updated_at', { ascending: false })
    specs = (specsResult.data as Spec[] | null) || []
  }

  // 열람 기록 (최초 열람 시각 보존)
  await markSpecsViewed(specs.map(s => s.id))

  const specMap = Object.fromEntries(specs.map((s: Spec) => [s.feature_id, s]))

  // ── 3개 섹션으로 분리 ─────────────────────────────────────────────────
  // 🔨 지금 개발 중 (in_progress)
  const inProgressFeatures = (features || []).filter(f => f.status === 'in_progress')
  // ⏳ 개발 대기 (spec_approved — 정의서는 있지만 아직 개발 시작 안 함)
  const waitingFeatures = (features || []).filter(f => f.status === 'spec_approved')
  // ✅ 완료 (approved)
  const doneFeatures = (features || []).filter(f => f.status === 'approved')

  const totalVisible = inProgressFeatures.length + waitingFeatures.length + doneFeatures.length

  // NEW 배지 판단: spec 있고 viewed_at이 null인 것
  const isNew = (featureId: string) => {
    const s = specMap[featureId]
    return !!s && !s.viewed_at
  }

  const newCount = [...inProgressFeatures, ...waitingFeatures, ...doneFeatures]
    .filter(f => isNew(f.id)).length

  const viewedCount = specs.filter(s => s.viewed_at).length

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1">기능 정의서</h1>
        <p className="text-sm text-slate-500">
          대표가 승인한 기능 정의서를 확인하세요 —{' '}
          <strong className="text-slate-700">{project.name}</strong>
        </p>
      </div>

      {/* 요약 바 */}
      {totalVisible > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{inProgressFeatures.length}</p>
            <p className="text-xs text-blue-600 mt-0.5">개발 중</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{waitingFeatures.length}</p>
            <p className="text-xs text-amber-600 mt-0.5">개발 대기</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-100 p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{doneFeatures.length}</p>
            <p className="text-xs text-green-600 mt-0.5">완료</p>
          </div>
          <div className={`rounded-xl border p-3 text-center ${newCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-2xl font-bold ${newCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>{newCount}</p>
            <p className={`text-xs mt-0.5 ${newCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>미열람 NEW</p>
          </div>
        </div>
      )}

      {/* 안내 박스 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-800">개발 전 반드시 확인하세요</p>
          <p className="text-xs text-amber-700 mt-0.5">
            포함 범위와 제외 범위를 정확히 숙지하고, 궁금한 점은 질문 탭에서 남겨주세요.
            정의서 외 범위 개발 시 추가 비용이 발생할 수 있습니다.
          </p>
        </div>
      </div>

      {totalVisible === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
          <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">아직 승인된 기능 정의서가 없습니다</p>
          <p className="text-sm text-slate-400 mt-1">대표가 기능 정의서를 승인하면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* ━━━ 🔨 지금 개발 중 ━━━ */}
          {inProgressFeatures.length > 0 && (
            <section>
              <SectionHeader
                icon={<Hammer className="w-4 h-4" />}
                label="지금 개발 중"
                count={inProgressFeatures.length}
                colorClass="text-blue-700"
                bgClass="bg-blue-50 border border-blue-100"
              />
              <div className="space-y-4">
                {inProgressFeatures.map(feature => (
                  <FeatureSpecCard
                    key={feature.id}
                    feature={feature}
                    spec={specMap[feature.id]}
                    isNew={isNew(feature.id)}
                    projectId={link.project_id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ━━━ ⏳ 개발 대기 ━━━ */}
          {waitingFeatures.length > 0 && (
            <section>
              <SectionHeader
                icon={<Clock className="w-4 h-4" />}
                label="개발 대기 — 정의서 확인 후 착수 예정"
                count={waitingFeatures.length}
                colorClass="text-amber-700"
                bgClass="bg-amber-50 border border-amber-100"
              />
              <div className="space-y-4">
                {waitingFeatures.map(feature => (
                  <FeatureSpecCard
                    key={feature.id}
                    feature={feature}
                    spec={specMap[feature.id]}
                    isNew={isNew(feature.id)}
                    projectId={link.project_id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ━━━ ✅ 완료 ━━━ */}
          {doneFeatures.length > 0 && (
            <section>
              <SectionHeader
                icon={<Trophy className="w-4 h-4" />}
                label="개발 완료"
                count={doneFeatures.length}
                colorClass="text-green-700"
                bgClass="bg-green-50 border border-green-100"
              />
              {/* 완료 항목은 기본 접힘 없이 표시, 단 opacity 살짝 낮춤 */}
              <div className="space-y-4 opacity-80">
                {doneFeatures.map(feature => (
                  <FeatureSpecCard
                    key={feature.id}
                    feature={feature}
                    spec={specMap[feature.id]}
                    isNew={isNew(feature.id)}
                    projectId={link.project_id}
                  />
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  )
}

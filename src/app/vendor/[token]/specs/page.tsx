import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, FileText, Eye, AlertCircle, Info } from 'lucide-react'
import type { AccessLink, Project, Feature, Spec } from '@/types'

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

  // 열람 기록
  await markSpecsViewed(specs.map(s => s.id))

  const specMap = Object.fromEntries(specs.map((s: Spec) => [s.feature_id, s]))

  const approvedFeatures = (features || []).filter(f =>
    ['spec_approved', 'in_progress', 'approved'].includes(f.status)
  )

  const totalSpecs = approvedFeatures.length
  const viewedSpecs = specs.filter(s => s.viewed_at).length

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1">기능 정의서</h1>
        <p className="text-sm text-slate-500">
          대표가 승인한 기능 정의서를 확인하세요 — <strong className="text-slate-700">{project.name}</strong>
        </p>
      </div>

      {/* 요약 바 */}
      {totalSpecs > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{totalSpecs}</p>
            <p className="text-xs text-slate-500 mt-0.5">전체 정의서</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-100 p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{specs.length}</p>
            <p className="text-xs text-green-600 mt-0.5">승인 완료</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{viewedSpecs}</p>
            <p className="text-xs text-blue-600 mt-0.5">열람 완료</p>
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

      {approvedFeatures.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
          <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">아직 승인된 기능 정의서가 없습니다</p>
          <p className="text-sm text-slate-400 mt-1">대표가 기능 정의서를 승인하면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvedFeatures.map(feature => {
            const spec = specMap[feature.id]
            const isViewed = spec?.viewed_at
            const sentAt = spec?.sent_at
            const approvedAt = spec?.approved_at

            return (
              <Card key={feature.id} className={spec ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-60'}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {/* 상태 배지 행 */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                          {feature.order_key}
                        </span>
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
                                {spec.qa_checklist.map((item, idx) => (
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
          })}
        </div>
      )}
    </div>
  )
}

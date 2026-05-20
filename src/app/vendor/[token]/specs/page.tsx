import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, FileText } from 'lucide-react'
import type { AccessLink, Project, Feature, Spec } from '@/types'

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

  if (!link) return <div>유효하지 않은 링크</div>

  const featuresResult = await admin
    .from('features')
    .select('*')
    .eq('project_id', link.project_id)
    .order('order_key')
  const features = featuresResult.data as Feature[] | null

  const featureIds = (features || []).map(f => f.id)
  let specs: Spec[] = []
  if (featureIds.length > 0) {
    const specsResult = await admin.from('specs').select('*').eq('status', 'approved').in('feature_id', featureIds)
    specs = (specsResult.data as Spec[] | null) || []
  }

  const specMap = Object.fromEntries(specs.map((s: Spec) => [s.feature_id, s]))

  const approvedFeatures = (features || []).filter(f =>
    ['spec_approved', 'in_progress', 'approved'].includes(f.status)
  )

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">기능 정의서</h1>
      <p className="text-sm text-slate-500 mb-6">대표가 승인한 기능 정의서를 확인하세요</p>

      {approvedFeatures.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">아직 승인된 기능 정의서가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvedFeatures.map(feature => {
            const spec = specMap[feature.id]
            return (
              <Card key={feature.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                          {feature.order_key}
                        </span>
                        {spec && (
                          <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                            <CheckCircle className="w-3 h-3" />
                            정의서 승인됨
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base">{feature.name}</CardTitle>
                      <p className="text-sm text-slate-500 mt-0.5">{feature.description}</p>
                    </div>
                  </div>
                </CardHeader>
                {spec && (
                  <CardContent>
                    <Tabs defaultValue="overview">
                      <TabsList className="mb-3">
                        <TabsTrigger value="overview">개요</TabsTrigger>
                        <TabsTrigger value="scope">범위</TabsTrigger>
                        <TabsTrigger value="criteria">수용 기준</TabsTrigger>
                        <TabsTrigger value="qa">예상 QA</TabsTrigger>
                      </TabsList>
                      <TabsContent value="overview" className="space-y-3">
                        {spec.background && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">기능 배경</p>
                            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">
                              {spec.background}
                            </p>
                          </div>
                        )}
                        {spec.current_problem && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">현재 문제</p>
                            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">
                              {spec.current_problem}
                            </p>
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="scope" className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {spec.in_scope && (
                            <div>
                              <p className="text-xs font-medium text-green-600 mb-1">✅ 포함 범위</p>
                              <p className="text-sm text-slate-700 bg-green-50 rounded-lg p-3 whitespace-pre-wrap">
                                {spec.in_scope}
                              </p>
                            </div>
                          )}
                          {spec.out_of_scope && (
                            <div>
                              <p className="text-xs font-medium text-red-600 mb-1">❌ 제외 범위</p>
                              <p className="text-sm text-slate-700 bg-red-50 rounded-lg p-3 whitespace-pre-wrap">
                                {spec.out_of_scope}
                              </p>
                            </div>
                          )}
                        </div>
                        {spec.screen_flow && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">화면 흐름</p>
                            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">
                              {spec.screen_flow}
                            </p>
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="criteria">
                        {spec.acceptance_criteria && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                              {spec.acceptance_criteria}
                            </p>
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="qa" className="space-y-3">
                        {spec.vendor_expected_questions && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">개발 중 자주 묻는 질문</p>
                            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">
                              {spec.vendor_expected_questions}
                            </p>
                          </div>
                        )}
                        {spec.vendor_answer_drafts && (
                          <div>
                            <p className="text-xs font-medium text-blue-600 mb-1">답변 가이드</p>
                            <p className="text-sm text-slate-700 bg-blue-50 rounded-lg p-3 whitespace-pre-wrap">
                              {spec.vendor_answer_drafts}
                            </p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
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

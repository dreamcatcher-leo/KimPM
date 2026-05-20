import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, TrendingUp, Clock, Bell } from 'lucide-react'
import type { Report, DailyAssessment, EvidenceItem, Feature } from '@/types'

const signalConfig = {
  '정상': { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, iconColor: 'text-green-500' },
  '주의': { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertCircle, iconColor: 'text-yellow-500' },
  '점검_권장': { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle, iconColor: 'text-red-500' },
}

function AssessmentCard({ assessment }: { assessment: DailyAssessment }) {
  const config = signalConfig[assessment.alignment_signal] || signalConfig['주의']
  const Icon = config.icon

  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
          <Badge className={`text-xs ${config.color}`}>
            {assessment.alignment_signal.replace('_', ' ')}
          </Badge>
        </div>
        <span className="text-xs text-slate-400">AI 판단 보조 카드</span>
      </div>

      {assessment.ai_comment && (
        <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{assessment.ai_comment}</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '기능정의서', score: assessment.spec_alignment_score, field: assessment.spec_alignment },
          { label: '주간계획', score: assessment.weekly_plan_score, field: assessment.weekly_plan_alignment },
          { label: '증빙강도', score: assessment.evidence_score, field: assessment.evidence_strength },
        ].map(({ label, score, field }) => (
          <div key={label} className="text-center bg-slate-50 rounded-lg p-2">
            <p className="text-xs text-slate-500 mb-0.5">{label}</p>
            <p className={`text-lg font-bold ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
              {score}
            </p>
            {field && <p className="text-xs text-slate-500 mt-1 leading-tight">{field.slice(0, 60)}...</p>}
          </div>
        ))}
      </div>

      {assessment.risk_signals && assessment.risk_signals !== '특이사항 없음' && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-2">
          <p className="text-xs font-medium text-red-700 mb-0.5">⚠️ 위험 신호</p>
          <p className="text-xs text-red-600">{assessment.risk_signals}</p>
        </div>
      )}

      {assessment.recommended_actions && assessment.recommended_actions !== '계속 진행' && (
        <div className="bg-blue-50 rounded-lg p-2">
          <p className="text-xs font-medium text-blue-700 mb-0.5">💡 추천 후속 액션</p>
          <p className="text-xs text-blue-600">{assessment.recommended_actions}</p>
        </div>
      )}

      <p className="text-xs text-slate-400 border-t pt-2">
        이 카드는 보조 자료이며 실제 코드 실행, 빌드 성공, 진실성 자체를 보장하지 않습니다.
      </p>
    </div>
  )
}

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: reports } = await supabase
    .from('reports')
    .select(`
      *,
      daily_assessments(*),
      evidence_items(*)
    `)
    .eq('project_id', id)
    .order('report_date', { ascending: false })
    .limit(30) as { data: (Report & { daily_assessments: DailyAssessment[]; evidence_items: EvidenceItem[] })[] | null }

  // Get features for display
  const { data: features } = await supabase
    .from('features')
    .select('id, order_key, name')
    .eq('project_id', id) as { data: Feature[] | null }

  const featureMap = Object.fromEntries((features || []).map(f => [f.id, f]))

  const workTypeLabels: Record<string, string> = {
    '코드_구현': '코드 구현',
    '레거시_분석': '레거시 분석',
    '기획_정책_정리': '기획·정책',
    '버그_재현_원인_분석': '버그 분석',
    '테스트_QA': '테스트·QA',
    '배포_준비': '배포 준비',
    '의사결정_대기': '의사결정 대기',
    '외부_API_검토': '외부 API',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">일일 보고 타임라인</h2>
          <p className="text-sm text-slate-500 mt-0.5">총 {reports?.length || 0}개 보고</p>
        </div>
      </div>

      <div className="space-y-6">
        {(reports || []).map(report => {
          const assessment = report.daily_assessments?.[0]
          const relatedFeatures = (report.related_feature_ids || [])
            .map(fid => featureMap[fid])
            .filter(Boolean)

          return (
            <div key={report.id} id={report.id} className="flex gap-4">
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                  assessment?.alignment_signal === '정상' ? 'bg-green-500' :
                  assessment?.alignment_signal === '주의' ? 'bg-yellow-500' :
                  assessment?.alignment_signal === '점검_권장' ? 'bg-red-500' :
                  'bg-slate-400'
                }`} />
                <div className="w-0.5 bg-slate-200 flex-1 mt-1" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{report.report_date}</p>
                        <p className="text-sm text-slate-700 mt-1">{report.summary}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {report.needs_founder_check && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs gap-1">
                            <Bell className="w-3 h-3" />
                            대표 확인 요청
                          </Badge>
                        )}
                        {assessment && (
                          <Badge className={`text-xs ${
                            assessment.alignment_signal === '정상' ? 'bg-green-100 text-green-700' :
                            assessment.alignment_signal === '주의' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {assessment.alignment_signal}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Work types */}
                    <div className="flex flex-wrap gap-1.5">
                      {report.work_types?.map(wt => (
                        <Badge key={wt} variant="outline" className="text-xs py-0">
                          {workTypeLabels[wt] || wt}
                        </Badge>
                      ))}
                    </div>

                    {/* Related features */}
                    {relatedFeatures.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {relatedFeatures.map(f => (
                          <span key={f.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            [{f.order_key}] {f.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Blocker */}
                    {report.blocker && (
                      <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-red-700 mb-0.5">⚡ Blocker</p>
                        <p className="text-sm text-red-600">{report.blocker}</p>
                      </div>
                    )}

                    {/* Optional fields */}
                    {(report.conclusion || report.tomorrow_plan) && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {report.conclusion && (
                          <div className="bg-slate-50 rounded-lg p-2">
                            <p className="font-medium text-slate-600 mb-1">오늘 결론</p>
                            <p className="text-slate-700">{report.conclusion}</p>
                          </div>
                        )}
                        {report.tomorrow_plan && (
                          <div className="bg-slate-50 rounded-lg p-2">
                            <p className="font-medium text-slate-600 mb-1">내일 계획</p>
                            <p className="text-slate-700">{report.tomorrow_plan}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Evidence */}
                    {report.evidence_items && report.evidence_items.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">
                          증빙자료 {report.evidence_items.length}개
                        </p>
                        <div className="space-y-1">
                          {report.evidence_items.map(ev => (
                            <div key={ev.id} className="bg-slate-50 rounded px-2 py-1 text-xs flex items-center gap-2">
                              <span className="text-slate-500 font-medium">{ev.evidence_type.replace(/_/g, ' ')}</span>
                              {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{ev.url}</a>}
                              {ev.content && <span className="text-slate-600 truncate">{ev.content.slice(0, 60)}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Assessment Card */}
                    {assessment && <AssessmentCard assessment={assessment} />}
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        })}

        {(!reports || reports.length === 0) && (
          <div className="text-center py-16">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">보고 없음</h3>
            <p className="text-slate-400 text-sm">외주사가 보고를 제출하면 여기에 표시됩니다</p>
          </div>
        )}
      </div>
    </div>
  )
}

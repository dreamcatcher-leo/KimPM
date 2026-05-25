import { createAdminClient } from '@/lib/supabase/admin'
import ReportForm from './ReportForm'
import type { AccessLink, Project, Feature, Report } from '@/types'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react'

// 작업 유형 한국어 레이블 매핑
const WORK_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  '코드_구현':          { label: '코드 구현',   emoji: '💻' },
  '테스트_QA':          { label: '테스트·QA',   emoji: '🧪' },
  '버그_재현_원인_분석': { label: '버그 분석',   emoji: '🐛' },
  '기획_정책_정리':     { label: '기획·정책',   emoji: '📋' },
  '배포_준비':          { label: '배포 준비',   emoji: '🚀' },
  '레거시_분석':        { label: '레거시 분석', emoji: '🔍' },
  '의사결정_대기':      { label: '대기 중',     emoji: '⏳' },
  '외부_API_검토':      { label: 'API 검토',    emoji: '🔌' },
}

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

  // 오늘 보고 + 기능 목록 + 최근 7일 보고 히스토리 병렬 조회
  const [featuresResult, todayReportResult, recentReportsResult] = await Promise.all([
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
    // 오늘 제외 최근 6건 (히스토리용)
    admin
      .from('reports')
      .select('id, report_date, summary, work_types, blocker, needs_founder_check, submitted_at')
      .eq('project_id', project.id)
      .neq('report_date', today)
      .order('report_date', { ascending: false })
      .limit(6),
  ])

  const features = featuresResult.data as Feature[] | null
  const todayReport = todayReportResult.data as Report | null
  const recentReports = (recentReportsResult.data || []) as {
    id: string
    report_date: string
    summary: string | null
    work_types: string[] | null
    blocker: string | null
    needs_founder_check: boolean | null
    submitted_at: string | null
  }[]

  // 연속 보고일 계산 (오늘 포함)
  const submittedDates = new Set([
    ...(todayReport ? [today] : []),
    ...recentReports.map(r => r.report_date),
  ])
  let streak = 0
  const baseDate = new Date(today)
  for (let i = 0; i < 30; i++) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    if (submittedDates.has(ds)) streak++
    else break
  }

  return (
    <div>
      {/* ── 페이지 헤더 ── */}
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

      {/* ── 연속 보고 배지 ── */}
      {streak >= 2 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="text-sm font-semibold text-blue-800">
            {streak}일 연속 보고 중
          </span>
          <span className="text-xs text-blue-600 ml-1">— 꾸준한 보고가 신뢰를 만듭니다!</span>
        </div>
      )}

      {/* ── 보고 폼 ── */}
      <ReportForm
        projectId={project.id}
        accessLinkId={link.id}
        reportDate={today}
        features={features || []}
        token={token}
        existingReport={todayReport}
      />

      {/* ── 과거 보고 히스토리 ── */}
      {recentReports.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            최근 보고 히스토리
          </h2>
          <div className="space-y-2.5">
            {recentReports.map(r => {
              const dateLabel = new Date(r.report_date).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
                weekday: 'short',
              })
              const workTypes = (r.work_types || []).slice(0, 3)

              return (
                <div
                  key={r.id}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* 날짜 + 작업 유형 칩 */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {dateLabel}
                        </span>
                        {workTypes.map(wt => {
                          const info = WORK_TYPE_LABELS[wt]
                          return info ? (
                            <span
                              key={wt}
                              className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded"
                            >
                              {info.emoji} {info.label}
                            </span>
                          ) : null
                        })}
                        {(r.work_types?.length || 0) > 3 && (
                          <span className="text-xs text-slate-400">
                            +{(r.work_types?.length || 0) - 3}
                          </span>
                        )}
                      </div>

                      {/* 요약 */}
                      {r.summary ? (
                        <p className="text-sm text-slate-700 line-clamp-2">{r.summary}</p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">요약 없음</p>
                      )}

                      {/* blocker / 대표 확인 필요 */}
                      {r.blocker && (
                        <div className="mt-1.5 flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-orange-600 line-clamp-1">{r.blocker}</p>
                        </div>
                      )}
                    </div>

                    {/* 오른쪽 — 제출 시각 */}
                    <div className="flex-shrink-0 text-right">
                      {r.needs_founder_check && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs mb-1 block">
                          대표 확인 필요
                        </Badge>
                      )}
                      {r.submitted_at && (
                        <p className="text-xs text-slate-400">
                          {new Date(r.submitted_at).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })} 제출
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 아직 보고 없는 날 안내 */}
          {!todayReport && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>오늘 보고가 아직 없습니다.</strong> 위 폼으로 오늘 보고를 제출하면 여기에 기록됩니다.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

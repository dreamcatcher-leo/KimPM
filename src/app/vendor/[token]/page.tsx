import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText, Send, MessageSquare, GitBranch, CheckSquare,
  BookOpen, Clock, ChevronRight, AlertTriangle, CheckCircle2,
  TrendingUp, Zap, Info
} from 'lucide-react'
import type { AccessLink, Project, Feature, Report } from '@/types'

export default async function VendorHomePage({
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

  if (!link) redirect('/auth/login')

  const project = link.projects
  const today = new Date().toISOString().split('T')[0]

  // 전체 기능 (상태별 집계용)
  const { data: allFeatures } = await admin
    .from('features')
    .select('id, order_key, name, status, priority_group')
    .eq('project_id', project.id)
    .order('order_key') as { data: Feature[] | null }

  // 승인된 기능 (개발 가능 상태)
  const { data: activeFeatures } = await admin
    .from('features')
    .select('*')
    .eq('project_id', project.id)
    .in('status', ['spec_approved', 'in_progress', 'approved'])
    .order('order_key') as { data: Feature[] | null }

  // 오늘 보고
  const { data: todayReport } = await admin
    .from('reports')
    .select('*')
    .eq('project_id', project.id)
    .eq('report_date', today)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single() as { data: Report | null }

  // 최근 보고 5건
  const { data: recentReports } = await admin
    .from('reports')
    .select('*')
    .eq('project_id', project.id)
    .order('report_date', { ascending: false })
    .limit(5) as { data: Report[] | null }

  // 미답변 질문 (내 링크 기준)
  const { data: pendingQuestions } = await admin
    .from('questions')
    .select('id, question, created_at, schedule_impact')
    .eq('access_link_id', link.id)
    .is('answer', null)
    .order('created_at', { ascending: false })

  // ── 진척률 계산 ──
  const features = allFeatures || []
  const total = features.length
  const approvedCount = features.filter(f => f.status === 'approved').length
  const inProgressCount = features.filter(f => f.status === 'in_progress').length
  const specApprovedCount = features.filter(f => f.status === 'spec_approved').length
  const progressPct = total > 0 ? Math.round((approvedCount / total) * 100) : 0
  const inProgressPct = total > 0 ? Math.round((inProgressCount / total) * 100) : 0

  // ── "지금 해야 할 것" 우선순위 계산 ──
  const urgentItems: { type: string; label: string; href: string; color: string }[] = []
  if (!todayReport) {
    urgentItems.push({ type: 'report', label: '오늘 일일 보고 미제출', href: 'report', color: 'text-blue-700 bg-blue-50 border-blue-200' })
  }
  const highImpactQuestions = (pendingQuestions || []).filter(q => q.schedule_impact === '높음' || q.schedule_impact === '중간')
  if (highImpactQuestions.length > 0) {
    urgentItems.push({ type: 'question', label: `일정 영향 미답변 질문 ${highImpactQuestions.length}건`, href: 'questions', color: 'text-orange-700 bg-orange-50 border-orange-200' })
  }

  const quickActions = [
    { href: `report`, label: '일일 보고', icon: Send, color: 'bg-blue-600 hover:bg-blue-500', desc: '30초 안에 완료', urgent: !todayReport },
    { href: `specs`, label: '기능 정의서', icon: BookOpen, color: 'bg-slate-700 hover:bg-slate-600', desc: `개발 가능 ${activeFeatures?.length || 0}개` },
    { href: `questions`, label: '협의 기록', icon: MessageSquare, color: 'bg-slate-700 hover:bg-slate-600', desc: `미답변 ${(pendingQuestions || []).length}건` },
    { href: `change-request`, label: '범위 변경', icon: GitBranch, color: 'bg-slate-700 hover:bg-slate-600', desc: '범위·일정 변경' },
    { href: `completion`, label: '완료 신청', icon: CheckSquare, color: 'bg-green-600 hover:bg-green-500', desc: `신청 가능 ${specApprovedCount + inProgressCount}개` },
  ]

  return (
    <div className="space-y-5">

      {/* ── 헤더 ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {project.vendor_name && `${project.vendor_name} · `}
          {project.contract_start} ~ {project.contract_end}
        </p>
      </div>

      {/* ── 지금 해야 할 것 (우선순위 알림) ── */}
      {urgentItems.length > 0 && (
        <div className="space-y-2">
          {urgentItems.map((item, i) => (
            <Link key={i} href={item.href}>
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer hover:opacity-90 transition-opacity ${item.color}`}>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── 오늘 보고 카드 ── */}
      {!todayReport ? (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="py-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-blue-900">오늘 보고가 아직 없습니다</p>
              <p className="text-sm text-blue-600 mt-0.5">매일 작성하면 대표의 불필요한 연락이 줄어듭니다</p>
            </div>
            <Link href="report" className="flex-shrink-0">
              <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
                <Send className="w-4 h-4" />
                지금 보고
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="py-3.5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-green-800 text-sm">오늘 보고 완료</p>
                  <Badge className="bg-green-100 text-green-700 text-xs border border-green-200">
                    {today}
                  </Badge>
                </div>
                {todayReport.summary && todayReport.summary.trim().length > 1 ? (
                  <p className="text-sm text-green-700 leading-relaxed break-words line-clamp-3">
                    {todayReport.summary}
                  </p>
                ) : (
                  <p className="text-sm text-green-500 italic">보고가 제출되었습니다.</p>
                )}
                <Link href="report" className="inline-block mt-1.5">
                  <span className="text-xs text-green-600 hover:text-green-800 underline underline-offset-2">내용 수정하기 →</span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 개발 진척률 ── */}
      {total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              개발 진척률
              <span className="ml-auto text-2xl font-bold text-blue-600">{progressPct}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 스택 프로그레스 바 */}
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex mb-3">
              {approvedCount > 0 && (
                <div
                  className="bg-green-500 h-full transition-all"
                  style={{ width: `${(approvedCount / total) * 100}%` }}
                  title={`완료 ${approvedCount}개`}
                />
              )}
              {inProgressCount > 0 && (
                <div
                  className="bg-blue-400 h-full transition-all"
                  style={{ width: `${(inProgressCount / total) * 100}%` }}
                  title={`개발 중 ${inProgressCount}개`}
                />
              )}
              {specApprovedCount > 0 && (
                <div
                  className="bg-slate-300 h-full transition-all"
                  style={{ width: `${(specApprovedCount / total) * 100}%` }}
                  title={`개발 대기 ${specApprovedCount}개`}
                />
              )}
            </div>

            {/* 범례 */}
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                개발 완료 {approvedCount}개
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                개발 중 {inProgressCount}개
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                개발 대기 {specApprovedCount}개
              </div>
              <div className="ml-auto text-slate-400">총 {total}개</div>
            </div>

            {/* P0 미완료 기능 강조 */}
            {(() => {
              const p0Pending = features.filter(f => f.priority_group === 'P0' && f.status !== 'approved')
              return p0Pending.length > 0 ? (
                <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">
                    <span className="font-semibold">P0 핵심 기능 {p0Pending.length}개 미완료</span>
                    {' — '}{p0Pending.slice(0, 2).map(f => f.name).join(', ')}{p0Pending.length > 2 ? ` 외 ${p0Pending.length - 2}개` : ''}
                  </p>
                </div>
              ) : null
            })()}
          </CardContent>
        </Card>
      )}

      {/* ── 미답변 질문 경고 ── */}
      {(pendingQuestions || []).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-amber-800">
                대표 답변 대기 중인 질문 {(pendingQuestions || []).length}건
              </p>
            </div>
            <Link href="questions">
              <span className="text-xs text-amber-700 hover:text-amber-900 underline underline-offset-2 flex-shrink-0">전체 보기</span>
            </Link>
          </div>
          <div className="space-y-1.5">
            {(pendingQuestions || []).slice(0, 3).map(q => (
              <div key={q.id} className="flex items-start gap-2">
                {q.schedule_impact === '높음' ? (
                  <Badge className="bg-red-100 text-red-700 text-xs border border-red-200 flex-shrink-0 mt-0.5">일정 영향↑</Badge>
                ) : q.schedule_impact === '중간' ? (
                  <Badge className="bg-orange-100 text-orange-700 text-xs border border-orange-200 flex-shrink-0 mt-0.5">일정 영향</Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-500 text-xs border-slate-200 flex-shrink-0 mt-0.5">대기 중</Badge>
                )}
                <p className="text-xs text-amber-800 line-clamp-1">{q.question}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-2">
            💡 답변 없이 임의 진행 시 나중에 분쟁이 생길 수 있습니다. 기본 가정을 질문에 명시해두세요.
          </p>
        </div>
      )}

      {/* ── 퀵 액션 ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">빠른 메뉴</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <Card className={`cursor-pointer hover:shadow-md transition-all ${action.urgent ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
                  <CardContent className="py-4 px-4">
                    <Icon className="w-5 h-5 text-slate-500 mb-2" />
                    <p className="font-semibold text-slate-900 text-sm">{action.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{action.desc}</p>
                    {action.urgent && (
                      <Badge className="mt-2 bg-blue-100 text-blue-700 text-xs border border-blue-200">미제출</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── 현재 개발 중인 기능 ── */}
      {activeFeatures && activeFeatures.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              현재 개발 대상 기능
            </h2>
            <Link href="specs">
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                정의서 전체 보기 <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="space-y-1.5">
            {activeFeatures.slice(0, 6).map(f => {
              const statusColor =
                f.status === 'approved' ? 'bg-green-100 text-green-700' :
                f.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-500'
              const statusLabel =
                f.status === 'approved' ? '완료' :
                f.status === 'in_progress' ? '개발 중' :
                '개발 대기'
              return (
                <Link key={f.id} href="specs">
                  <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all group">
                    <span className="text-xs font-mono text-slate-400 w-10 flex-shrink-0">{f.order_key}</span>
                    <span className="text-sm text-slate-700 flex-1 group-hover:text-blue-700 transition-colors">{f.name}</span>
                    <Badge className={`text-xs flex-shrink-0 ${statusColor}`}>{statusLabel}</Badge>
                  </div>
                </Link>
              )
            })}
            {activeFeatures.length > 6 && (
              <Link href="specs">
                <p className="text-xs text-slate-400 text-center py-2 hover:text-blue-600 cursor-pointer">
                  +{activeFeatures.length - 6}개 더 보기 →
                </p>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── 최근 보고 히스토리 ── */}
      {recentReports && recentReports.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">최근 보고 내역</h2>
            <Link href="report">
              <span className="text-xs text-slate-400 hover:text-blue-600 cursor-pointer">+ 새 보고 작성</span>
            </Link>
          </div>
          <div className="space-y-1.5">
            {recentReports.map(r => (
              <div key={r.id} className="bg-white rounded-lg px-4 py-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  <span className="text-xs text-slate-400 font-mono">{r.report_date}</span>
                  {r.report_date === today && (
                    <Badge className="text-xs bg-blue-100 text-blue-600 border-blue-200">오늘</Badge>
                  )}
                  {r.needs_founder_check && (
                    <Badge className="text-xs bg-purple-100 text-purple-600 ml-auto">대표 확인 요청</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed break-words line-clamp-2 pl-5">
                  {r.summary && r.summary.trim().length > 1 ? r.summary : '(요약 없음)'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 계약 정보 ── */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500">프로젝트 정보</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">계약 기간</p>
              <p className="text-slate-700 font-medium text-sm">
                {project.contract_start} ~ {project.contract_end}
              </p>
            </div>
            {project.contract_amount && (
              <div>
                <p className="text-xs text-slate-400">계약 금액</p>
                <p className="text-slate-700 font-medium text-sm">{project.contract_amount.toLocaleString()}원</p>
              </div>
            )}
          </div>
          {project.goal && (
            <div className="mt-3">
              <p className="text-xs text-slate-400 mb-1">프로젝트 목표</p>
              <p className="text-sm text-slate-700 leading-relaxed">{project.goal}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

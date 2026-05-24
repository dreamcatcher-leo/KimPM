import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DisputeCenterClient from './DisputeCenterClient'
import type {
  Project, Feature, Report, Decision, Risk, MustCheckItem,
  ChangeRequest, Question, WeeklyPlan, EvidenceItem
} from '@/types'
import {
  ShieldAlert, FileCheck, AlertTriangle, Scale, GitBranch,
  MessageSquare, Bell, ChevronRight, Download, Clock
} from 'lucide-react'

export default async function DisputeCenterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('founder_id', user.id)
    .single() as { data: Project | null }

  if (!project) redirect('/dashboard')

  // 분쟁 대비에 필요한 모든 데이터 병렬 조회
  const [
    { data: features },
    { data: decisions },
    { data: risks },
    { data: mustChecks },
    { data: changeRequests },
    { data: questions },
    { data: weeklyPlans },
    { data: reports },
    { data: evidenceItems },
  ] = await Promise.all([
    supabase.from('features').select('*').eq('project_id', id).order('order_key'),
    supabase.from('decisions').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('risks').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('must_check_items').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('change_requests').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('questions').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('weekly_plans').select('*').eq('project_id', id).order('week_start', { ascending: false }),
    supabase.from('reports').select('*, evidence_items(*)').eq('project_id', id).order('report_date', { ascending: false }),
    supabase.from('evidence_items').select('*').eq('project_id', id).order('created_at', { ascending: false }),
  ])

  // 분쟁 위험 자동 감지
  const disputeRisks = []

  // 1. 미답변 질문이 7일 이상 된 것
  const oldUnanswered = (questions || []).filter(q => {
    if (q.answer) return false
    const daysOld = Math.floor((Date.now() - new Date(q.created_at).getTime()) / (1000 * 60 * 60 * 24))
    return daysOld >= 7
  })
  if (oldUnanswered.length > 0) {
    disputeRisks.push({
      level: 'high',
      title: `미답변 질문 ${oldUnanswered.length}건 (7일 이상)`,
      description: '답변 없이 방치된 질문은 "대표가 승인했다"는 분쟁의 빌미가 됩니다.',
      link: `/projects/${id}/decisions`,
    })
  }

  // 2. 승인 없이 진행된 변경 요청
  const unapprovedChanges = (changeRequests || []).filter(cr => cr.status === 'pending' && cr.created_at)
  const oldUnapproved = unapprovedChanges.filter(cr => {
    const daysOld = Math.floor((Date.now() - new Date(cr.created_at).getTime()) / (1000 * 60 * 60 * 24))
    return daysOld >= 5
  })
  if (oldUnapproved.length > 0) {
    disputeRisks.push({
      level: 'high',
      title: `변경 요청 미결 ${oldUnapproved.length}건 (5일 이상)`,
      description: '대표 승인 없이 착수한 변경 사항은 추가 비용 분쟁으로 이어질 수 있습니다.',
      link: `/projects/${id}/change-requests`,
    })
  }

  // 3. 증빙 없는 완료 처리된 기능
  const completedFeatures = (features || []).filter(f => f.status === 'approved')
  const reportsWithEvidence = (reports || []).filter(r =>
    r.evidence_items && Array.isArray(r.evidence_items) && r.evidence_items.length > 0
  )
  const noEvidenceCompleted = completedFeatures.filter(f => {
    return !reportsWithEvidence.some(r =>
      Array.isArray(r.related_feature_ids) && r.related_feature_ids.includes(f.id)
    )
  })
  if (noEvidenceCompleted.length > 0) {
    disputeRisks.push({
      level: 'medium',
      title: `증빙 없이 완료된 기능 ${noEvidenceCompleted.length}건`,
      description: '증빙 없는 완료는 "실제로 구현했는가"에 대한 분쟁에서 불리합니다.',
      link: `/projects/${id}/features`,
    })
  }

  // 4. 주간 계획 미승인
  const unapprovedPlans = (weeklyPlans || []).filter(wp => wp.status === 'draft' || wp.status === 'vendor_agreed')
  if (unapprovedPlans.length > 0) {
    disputeRisks.push({
      level: 'medium',
      title: `주간 계획 미승인 ${unapprovedPlans.length}건`,
      description: '대표가 승인하지 않은 주간 계획은 "합의된 범위"로 인정받기 어렵습니다.',
      link: `/projects/${id}/weekly-plan`,
    })
  }

  // 5. 오픈 리스크 고위험
  const highRisks = (risks || []).filter(r => !r.is_resolved && (r.level === '위험' || r.level === 'Must_Check_필요'))
  if (highRisks.length > 0) {
    disputeRisks.push({
      level: 'medium',
      title: `고위험 미해결 리스크 ${highRisks.length}건`,
      description: '위험 신호가 기록되었음에도 조치 없이 방치된 경우 책임 소재가 불명확해집니다.',
      link: `/projects/${id}/risks`,
    })
  }

  // 타임라인 데이터 구성
  type TimelineItem = {
    date: string
    type: string
    title: string
    detail?: string | null
    link?: string
    badge?: string
  }
  const timeline: TimelineItem[] = []

  // 의사결정 이력
  ;(decisions || []).filter(d => d.status !== 'pending').forEach(d => {
    timeline.push({
      date: d.decided_at || d.updated_at || d.created_at,
      type: 'decision',
      title: d.title,
      detail: d.founder_decision,
      badge: d.status === 'approved' ? '승인' : d.status === 'rejected' ? '반려' : '보류',
    })
  })

  // 변경 요청 이력
  ;(changeRequests || []).forEach(cr => {
    timeline.push({
      date: cr.decided_at || cr.created_at,
      type: 'change',
      title: cr.title,
      detail: cr.schedule_impact || cr.cost_impact,
      badge: cr.status === 'approved' ? '승인' : cr.status === 'rejected' ? '반려' : cr.status === 'pending' ? '대기' : '보류',
    })
  })

  // 주간 계획 승인 이력
  ;(weeklyPlans || []).filter(wp => wp.founder_approved_at).forEach(wp => {
    timeline.push({
      date: wp.founder_approved_at!,
      type: 'plan',
      title: `주간 계획 승인 (${wp.week_start} ~ ${wp.week_end})`,
      badge: '승인',
    })
  })

  // 날짜순 정렬 (최신이 위)
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // 통계
  const stats = {
    totalDecisions: (decisions || []).length,
    approvedDecisions: (decisions || []).filter(d => d.status === 'approved').length,
    totalChangeRequests: (changeRequests || []).length,
    approvedChanges: (changeRequests || []).filter(cr => cr.status === 'approved').length,
    totalQuestions: (questions || []).length,
    answeredQuestions: (questions || []).filter(q => q.answer).length,
    totalReports: (reports || []).length,
    totalEvidence: (evidenceItems || []).length,
    approvedWeeklyPlans: (weeklyPlans || []).filter(wp => wp.status === 'approved' || wp.founder_approved_at).length,
    totalFeatures: (features || []).length,
    completedFeatures: completedFeatures.length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <h1 className="text-2xl font-bold text-slate-900">분쟁 대비 센터</h1>
          </div>
          <p className="text-slate-500 text-sm">
            외주 개발 분쟁 시 필요한 증거와 합의 이력을 한 곳에서 관리합니다.
            <span className="text-slate-400"> · {project.name} / {project.vendor_name}</span>
          </p>
        </div>
        <DisputeCenterClient
          projectId={id}
          projectName={project.name}
          vendorName={project.vendor_name}
          contractStart={project.contract_start}
          contractEnd={project.contract_end}
          stats={stats}
          disputeRisks={disputeRisks}
          timeline={timeline}
          decisions={decisions || []}
          changeRequests={changeRequests || []}
          questions={questions || []}
          weeklyPlans={weeklyPlans || []}
          reports={reports || []}
        />
      </div>

      {/* ─── 분쟁 위험 알림 ─── */}
      {disputeRisks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            자동 감지된 분쟁 위험 ({disputeRisks.length}건)
          </h2>
          {disputeRisks.map((risk, idx) => (
            <Link key={idx} href={risk.link}>
              <div className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${
                risk.level === 'high'
                  ? 'bg-red-50 border-red-200 hover:bg-red-100'
                  : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
              }`}>
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${risk.level === 'high' ? 'text-red-500' : 'text-orange-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${risk.level === 'high' ? 'text-red-900' : 'text-orange-900'}`}>
                      {risk.title}
                    </span>
                    <Badge className={`text-xs ${risk.level === 'high' ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'} border-0`}>
                      {risk.level === 'high' ? '고위험' : '주의'}
                    </Badge>
                  </div>
                  <p className={`text-xs mt-0.5 ${risk.level === 'high' ? 'text-red-700' : 'text-orange-700'}`}>
                    {risk.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {disputeRisks.length === 0 && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <FileCheck className="w-5 h-5 text-green-500" />
          <div>
            <p className="text-sm font-semibold text-green-800">현재 자동 감지된 분쟁 위험이 없습니다</p>
            <p className="text-xs text-green-600 mt-0.5">의사결정, 변경 요청, 질문 답변, 주간 계획 승인이 모두 관리되고 있습니다.</p>
          </div>
        </div>
      )}

      {/* ─── 증거 현황 통계 ─── */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3">분쟁 증거 현황</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: '의사결정 이력',
              value: `${stats.approvedDecisions}/${stats.totalDecisions}건`,
              sub: '승인 완료',
              icon: Scale,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
              link: `/projects/${id}/decisions`,
              ok: stats.approvedDecisions === stats.totalDecisions,
            },
            {
              label: '변경 요청 처리',
              value: `${stats.approvedChanges}/${stats.totalChangeRequests}건`,
              sub: '승인 기록',
              icon: GitBranch,
              color: 'text-orange-600',
              bg: 'bg-orange-50',
              link: `/projects/${id}/change-requests`,
              ok: stats.totalChangeRequests === 0 || stats.approvedChanges >= stats.totalChangeRequests * 0.8,
            },
            {
              label: '질문 & 합의 기록',
              value: `${stats.answeredQuestions}/${stats.totalQuestions}건`,
              sub: '답변 완료',
              icon: MessageSquare,
              color: 'text-purple-600',
              bg: 'bg-purple-50',
              link: `/projects/${id}/decisions`,
              ok: stats.totalQuestions === 0 || stats.answeredQuestions >= stats.totalQuestions * 0.8,
            },
            {
              label: '증빙 자료',
              value: `${stats.totalEvidence}건`,
              sub: `보고 ${stats.totalReports}건`,
              icon: FileCheck,
              color: 'text-green-600',
              bg: 'bg-green-50',
              link: `/projects/${id}/reports`,
              ok: stats.totalEvidence > 0,
            },
          ].map(({ label, value, sub, icon: Icon, color, bg, link, ok }) => (
            <Link key={label} href={link}>
              <Card className={`hover:shadow-sm transition-shadow cursor-pointer border ${ok ? 'border-slate-200' : 'border-orange-200'}`}>
                <CardContent className="pt-4">
                  <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                  {!ok && (
                    <p className="text-xs text-orange-600 mt-1">⚠️ 확인 필요</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ─── 합의 타임라인 ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            합의 & 의사결정 타임라인
            <span className="text-xs font-normal text-slate-400">({timeline.length}건)</span>
          </h2>
        </div>

        {timeline.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">아직 기록된 합의·결정이 없습니다</p>
            <p className="text-xs mt-1">의사결정, 변경 요청 처리, 주간 계획 승인이 쌓이면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {timeline.slice(0, 20).map((item, idx) => {
              const typeConfig = {
                decision: { label: '의사결정', icon: Scale, color: 'bg-blue-100 text-blue-700 border-blue-200' },
                change: { label: '변경 요청', icon: GitBranch, color: 'bg-orange-100 text-orange-700 border-orange-200' },
                plan: { label: '주간 계획', icon: FileCheck, color: 'bg-green-100 text-green-700 border-green-200' },
              }[item.type as 'decision' | 'change' | 'plan'] || { label: '기타', icon: Clock, color: 'bg-slate-100 text-slate-600 border-slate-200' }
              const Icon = typeConfig.icon
              const badgeColors: Record<string, string> = {
                '승인': 'bg-green-100 text-green-700 border border-green-200',
                '반려': 'bg-red-100 text-red-700 border border-red-200',
                '보류': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
                '대기': 'bg-slate-100 text-slate-600 border border-slate-200',
              }

              return (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${typeConfig.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </span>
                      <Badge className={`text-xs border ${typeConfig.color}`}>{typeConfig.label}</Badge>
                      {item.badge && (
                        <Badge className={`text-xs ${badgeColors[item.badge] || 'bg-slate-100 text-slate-600'}`}>
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-800 font-medium mt-0.5 truncate">{item.title}</p>
                    {item.detail && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.detail}</p>
                    )}
                  </div>
                </div>
              )
            })}
            {timeline.length > 20 && (
              <p className="text-xs text-slate-400 text-center py-2">
                + {timeline.length - 20}건 더 있음 (export 파일에 전체 포함)
              </p>
            )}
          </div>
        )}
      </div>

      {/* ─── 분쟁 대비 체크리스트 ─── */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3">분쟁 대비 체크리스트</h2>
        <div className="space-y-2">
          {[
            {
              check: stats.approvedDecisions > 0,
              label: '모든 주요 결정이 문서화되어 있다',
              detail: '의사결정함에서 대표 승인 기록 확인',
              link: `/projects/${id}/decisions`,
            },
            {
              check: stats.answeredQuestions >= stats.totalQuestions * 0.9 || stats.totalQuestions === 0,
              label: '외주사 질문에 90% 이상 답변했다',
              detail: `현재 ${stats.answeredQuestions}/${stats.totalQuestions}건 답변 완료`,
              link: `/projects/${id}/decisions`,
            },
            {
              check: stats.approvedChanges >= stats.totalChangeRequests || stats.totalChangeRequests === 0,
              label: '모든 변경 요청이 처리(승인/반려)되었다',
              detail: `현재 ${stats.approvedChanges}/${stats.totalChangeRequests}건 처리 완료`,
              link: `/projects/${id}/change-requests`,
            },
            {
              check: stats.approvedWeeklyPlans > 0,
              label: '주간 계획을 대표가 승인한 이력이 있다',
              detail: `승인된 주간 계획 ${stats.approvedWeeklyPlans}건`,
              link: `/projects/${id}/weekly-plan`,
            },
            {
              check: stats.totalEvidence > 0,
              label: '작업 증빙 자료가 제출되어 있다',
              detail: `현재 증빙 ${stats.totalEvidence}건 등록`,
              link: `/projects/${id}/reports`,
            },
            {
              check: highRisks.length === 0,
              label: '고위험 리스크가 모두 해결되어 있다',
              detail: `현재 미해결 고위험 리스크 ${highRisks.length}건`,
              link: `/projects/${id}/risks`,
            },
          ].map((item, idx) => (
            <Link key={idx} href={item.link}>
              <div className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${
                item.check
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  item.check ? 'bg-green-500' : 'bg-red-400'
                }`}>
                  <span className="text-white text-xs font-bold">{item.check ? '✓' : '!'}</span>
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${item.check ? 'text-green-800' : 'text-red-800'}`}>
                    {item.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${item.check ? 'text-green-600' : 'text-red-600'}`}>
                    {item.detail}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

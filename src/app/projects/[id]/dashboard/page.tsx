import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Bell, AlertTriangle, CheckCircle, Clock, TrendingUp,
  FileText, Calendar, ChevronRight, Zap, Target, HelpCircle,
  ShieldCheck, MessageSquare, GitBranch, Eye, Info
} from 'lucide-react'
import type { Project, Report, DailyAssessment, MustCheckItem, Risk, Feature } from '@/types'
import VendorLinkCard from '@/components/dashboard/VendorLinkCard'
import FounderBriefCard from '@/components/dashboard/FounderBriefCard'
import DashboardWeeklyAnalysis from '@/components/dashboard/DashboardWeeklyAnalysis'
import GenerateBriefButton from '@/components/dashboard/GenerateBriefButton'

// ─── 비개발자 번역 규칙 ────────────────────────────────────────────────────────
function translateRiskType(type: string): string {
  const map: Record<string, string> = {
    '보고_누락': '외주사가 오늘 작업 내용을 보고하지 않았어요',
    '증빙_없는_완료_후보': '개발했다고 했지만 결과물 증거가 부족해요',
    'Weekly_Plan_미정합': '이번 주 계획과 실제 작업이 맞지 않아요',
    '미답변_질문': '외주사 질문에 아직 답변이 없어 작업이 멈췄을 수 있어요',
    '반복_blocker': '같은 문제가 계속 반복되어 일정이 밀릴 수 있어요',
    '범위_변경_위험': '처음 계약한 범위를 벗어날 가능성이 있어요',
    '기획_이탈_가능성': '처음 기획과 다른 방향으로 진행될 수 있어요',
    '검수_지연': '완료된 기능 검수가 늦어지고 있어요',
  }
  return map[type] || type.replace(/_/g, ' ')
}

function translateMustCheckTrigger(trigger: string): string {
  const map: Record<string, string> = {
    '정책_범위_비용_변경': '계약 범위나 비용이 바뀔 수 있어 대표 확인이 필요해요',
    '반복_blocker': '같은 문제가 계속 막혀 대표가 직접 해결해줘야 해요',
    '완료_후보_검수': '외주사가 완료했다고 하는 기능을 대표가 확인해야 해요',
    '점검_권장_신호': 'AI가 이 항목을 한 번 살펴볼 것을 권장하고 있어요',
    '외주사_확인_요청': '외주사가 대표에게 직접 확인을 요청했어요',
    'Weekly_Plan_미달성_누적': '주간 목표를 여러 번 달성하지 못해 대표 확인이 필요해요',
  }
  return map[trigger] || trigger.replace(/_/g, ' ')
}

function translateAlignmentSignal(signal: string): string {
  const map: Record<string, string> = {
    '정상': '이번 보고는 계획에 맞게 진행되고 있어요',
    '주의': '계획과 약간 차이가 있어요. 흐름을 확인해보세요',
    '점검_권장': '계획과 크게 다른 부분이 있어요. 직접 확인이 필요해요',
    'normal': '이번 보고는 계획에 맞게 진행되고 있어요',
    'caution': '계획과 약간 차이가 있어요. 흐름을 확인해보세요',
    'check_required': '계획과 크게 다른 부분이 있어요. 직접 확인이 필요해요',
  }
  return map[signal] || signal
}

export default async function ProjectDashboard({
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

  // Fetch all stats in parallel
  const [
    { data: features },
    { data: mustCheckItems },
    { data: openRisks },
    { data: pendingDecisions },
    { data: recentReports },
    { data: todayBrief },
    { data: accessLinks },
    { data: weeklyPlan },
    { data: changeRequests },
  ] = await Promise.all([
    supabase.from('features').select('*').eq('project_id', id).order('order_key'),
    supabase.from('must_check_items').select('*').eq('project_id', id).eq('is_resolved', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('risks').select('*').eq('project_id', id).eq('is_resolved', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('decisions').select('*').eq('project_id', id).eq('status', 'pending').limit(5),
    supabase.from('reports').select(`*, daily_assessments(*)`).eq('project_id', id).order('report_date', { ascending: false }).limit(5),
    supabase.from('founder_daily_briefs').select('*').eq('project_id', id).order('brief_date', { ascending: false }).limit(1),
    supabase.from('access_links').select('*').eq('project_id', id).eq('is_active', true).limit(1),
    supabase.from('weekly_plans').select('*').eq('project_id', id).order('week_start', { ascending: false }).limit(1),
    supabase.from('change_requests').select('*').eq('project_id', id).eq('status', 'pending').limit(3),
  ])

  const featureStats = {
    total: features?.length || 0,
    approved: features?.filter(f => f.status === 'spec_approved' || f.status === 'approved').length || 0,
    inProgress: features?.filter(f => f.status === 'in_progress').length || 0,
    completed: features?.filter(f => f.status === 'approved').length || 0,
    p0Count: features?.filter(f => f.priority_group === 'P0').length || 0,
  }

  const latestReport = recentReports?.[0]
  const latestAssessment = (latestReport as (Report & { daily_assessments?: DailyAssessment[] }) | null)?.daily_assessments?.[0]
  const vendorLink = accessLinks?.[0]
  const vendorAccessUrl = vendorLink
    ? `${process.env.NEXT_PUBLIC_APP_URL}/vendor/${vendorLink.token}`
    : null
  const latestBrief = todayBrief?.[0]
  const currentWeekPlan = weeklyPlan?.[0]

  const signalColors: Record<string, string> = {
    '정상': 'bg-green-100 text-green-700 border-green-200',
    '주의': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    '점검_권장': 'bg-red-100 text-red-700 border-red-200',
    'normal': 'bg-green-100 text-green-700 border-green-200',
    'caution': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'check_required': 'bg-red-100 text-red-700 border-red-200',
  }

  const riskLevelColors: Record<string, string> = {
    '낮음': 'bg-gray-100 text-gray-600',
    '주의': 'bg-yellow-100 text-yellow-700',
    '위험': 'bg-red-100 text-red-700',
    'Must_Check_필요': 'bg-purple-100 text-purple-700',
  }

  const now = new Date()
  const contractStart = project.contract_start ? new Date(project.contract_start) : null
  const contractEnd = project.contract_end ? new Date(project.contract_end) : null

  const daysLeft = contractEnd
    ? Math.ceil((contractEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const totalDays = (contractStart && contractEnd)
    ? Math.ceil((contractEnd.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // 계약 시작 전이면 0%, 진행 중이면 경과일/전체일, 종료면 100%
  const elapsedDays = contractStart
    ? Math.max(0, Math.ceil((now.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24)))
    : 0
  const progressPercent = totalDays > 0
    ? Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100))
    : 0

  const urgentCount = (mustCheckItems?.length || 0) + (pendingDecisions?.length || 0) + (openRisks?.filter(r => r.level === '위험' || r.level === 'Must_Check_필요').length || 0)

  return (
    <div className="p-6 space-y-5 max-w-[1200px]">

      {/* ══════════════════════════════════════════
          HERO: 개발 진행도 + 오늘 결정 사항
      ══════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        {/* 프로젝트 헤더 */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">{project.name}</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              외주사: <span className="text-slate-300">{project.vendor_name}</span>
              {' · '}
              <span className="text-slate-300">{project.contract_start} ~ {project.contract_end}</span>
              {daysLeft > 0 && (
                <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${daysLeft <= 14 ? 'bg-red-500/30 text-red-300' : daysLeft <= 30 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/10 text-green-300'}`}>
                  {daysLeft}일 남음
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/projects/${id}/features/new`}>
              <Button size="sm" variant="outline" className="gap-1.5 border-white/20 text-white hover:bg-white/10 bg-transparent text-xs">
                <FileText className="w-3.5 h-3.5" />
                기능 추가
              </Button>
            </Link>
            <Link href={`/projects/${id}/weekly-plan`}>
              <Button size="sm" className="gap-1.5 bg-blue-500 hover:bg-blue-400 text-xs">
                <Calendar className="w-3.5 h-3.5" />
                주간 계획
              </Button>
            </Link>
          </div>
        </div>

        {/* 핵심 지표 3개 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* 계약 진행률 */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-xs text-slate-400 mb-1">계약 진행률</p>
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-bold text-white">{progressPercent.toFixed(0)}</span>
              <span className="text-slate-400 text-lg mb-0.5">%</span>
            </div>
            <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${progressPercent >= 70 ? 'bg-red-400' : progressPercent >= 40 ? 'bg-yellow-400' : 'bg-green-400'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">{daysLeft > 0 ? `${daysLeft}일 남음` : '계약 종료'}</p>
          </div>

          {/* 기능 개발 진행률 */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-xs text-slate-400 mb-1">개발 완료율</p>
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-bold text-white">
                {featureStats.total > 0 ? Math.round((featureStats.completed / featureStats.total) * 100) : 0}
              </span>
              <span className="text-slate-400 text-lg mb-0.5">%</span>
            </div>
            <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400"
                style={{ width: `${featureStats.total > 0 ? (featureStats.completed / featureStats.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">{featureStats.completed}/{featureStats.total}개 완료</p>
          </div>

          {/* 오늘 처리 필요 */}
          <div className={`rounded-xl p-4 border ${urgentCount > 0 ? 'bg-red-500/15 border-red-400/30' : 'bg-green-500/10 border-green-400/20'}`}>
            <p className="text-xs text-slate-400 mb-1">오늘 처리 필요</p>
            <div className="flex items-end gap-1.5">
              <span className={`text-3xl font-bold ${urgentCount > 0 ? 'text-red-400' : 'text-green-400'}`}>{urgentCount}</span>
              <span className="text-slate-400 text-sm mb-0.5">건</span>
            </div>
            <div className="mt-2 space-y-0.5 text-xs text-slate-400">
              {(mustCheckItems?.length || 0) > 0 && <div>🔔 Must-Check {mustCheckItems?.length}건</div>}
              {(pendingDecisions?.length || 0) > 0 && <div>⚖️ 결정 대기 {pendingDecisions?.length}건</div>}
              {urgentCount === 0 && <div>✅ 지금 당장 할 것 없음</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          대표 결정함 (고정 영역) — 지금 결정해야 하는 것
      ══════════════════════════════════════════ */}
      {urgentCount > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-bold text-slate-800">지금 결정해야 하는 것</h2>
            <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">{urgentCount}건</Badge>
            <span className="text-xs text-slate-400 ml-auto">결정하지 않으면 개발이 멈출 수 있어요</span>
          </div>
          <div className="space-y-2">

            {/* Must-Check */}
            {mustCheckItems?.slice(0, 2).map(item => (
              <Link key={item.id} href={`/projects/${id}/overview?tab=must-check&item=${item.id}`}>
                <div className="flex items-start gap-3 p-3.5 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer group">
                  <Bell className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-purple-900 truncate">{item.title}</span>
                      <Badge className="bg-purple-200 text-purple-800 border-0 text-xs flex-shrink-0">Must-Check</Badge>
                    </div>
                    {/* 비개발자 번역 */}
                    <p className="text-xs text-purple-700">
                      💬 {translateMustCheckTrigger(item.trigger_type)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-300 flex-shrink-0 mt-1 group-hover:text-purple-500 transition-colors" />
                </div>
              </Link>
            ))}

            {/* 의사결정 대기 */}
            {pendingDecisions?.slice(0, 2).map((dec: Record<string, string>) => (
              <Link key={dec.id} href={`/projects/${id}/overview?tab=decisions&item=${dec.id}`}>
                <div className="flex items-start gap-3 p-3.5 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors cursor-pointer group">
                  <Target className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-orange-900 truncate">{dec.title}</span>
                      <Badge className="bg-orange-200 text-orange-800 border-0 text-xs flex-shrink-0">결정 필요</Badge>
                    </div>
                    <p className="text-xs text-orange-700">
                      💬 대표의 결정이 없으면 외주사가 임의로 진행해 나중에 분쟁이 생길 수 있어요
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-orange-300 flex-shrink-0 mt-1 group-hover:text-orange-500 transition-colors" />
                </div>
              </Link>
            ))}

            {/* 변경 요청 대기 */}
            {changeRequests?.slice(0, 1).map((cr: Record<string, string>) => (
              <Link key={cr.id} href={`/projects/${id}/change-requests`}>
                <div className="flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer group">
                  <GitBranch className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-blue-900 truncate">{cr.title}</span>
                      <Badge className="bg-blue-200 text-blue-800 border-0 text-xs flex-shrink-0">변경 요청</Badge>
                    </div>
                    <p className="text-xs text-blue-700">
                      💬 기존 예산·범위를 벗어날 가능성이 있어요. 합의 없이 진행하면 분쟁 위험이 있어요
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-300 flex-shrink-0 mt-1 group-hover:text-blue-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          통계 카드 (4개)
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">총 기능</p>
            <p className="text-3xl font-bold text-slate-900">{featureStats.total}</p>
            <p className="text-xs text-slate-400 mt-1">완료 {featureStats.completed}개</p>
          </CardContent>
        </Card>
        <Link href={`/projects/${id}/overview?tab=must-check`}>
          <Card className={`hover:shadow-md transition-all cursor-pointer ${(mustCheckItems?.length || 0) > 0 ? 'border-purple-300 bg-purple-50/30' : ''}`}>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 mb-1">Must-Check</p>
              <p className={`text-3xl font-bold ${(mustCheckItems?.length || 0) > 0 ? 'text-purple-600' : 'text-slate-900'}`}>
                {mustCheckItems?.length || 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">직접 확인 필요</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/projects/${id}/overview?tab=risks`}>
          <Card className={`hover:shadow-md transition-all cursor-pointer ${(openRisks?.length || 0) > 0 ? 'border-red-200 bg-red-50/30' : ''}`}>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 mb-1">오픈 리스크</p>
              <p className={`text-3xl font-bold ${(openRisks?.length || 0) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {openRisks?.length || 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">미해결</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/projects/${id}/overview?tab=decisions`}>
          <Card className={`hover:shadow-md transition-all cursor-pointer ${(pendingDecisions?.length || 0) > 0 ? 'border-orange-200 bg-orange-50/30' : ''}`}>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 mb-1">결정 대기</p>
              <p className={`text-3xl font-bold ${(pendingDecisions?.length || 0) > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                {pendingDecisions?.length || 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">승인·반려 필요</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ══════════════════════════════════════════
          주간 AI 분석
      ══════════════════════════════════════════ */}
      <DashboardWeeklyAnalysis projectId={id} projectName={project.name} contractStart={project.contract_start} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ─ 왼쪽 2/3 ─ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Founder Daily Brief */}
          {latestBrief ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">오늘의 AI 브리핑</span>
                <GenerateBriefButton projectId={id} hasBrief={true} />
              </div>
              <FounderBriefCard brief={latestBrief} projectId={id} />
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">오늘의 Founder Daily Brief</p>
                <p className="text-xs text-slate-500 mt-0.5">AI가 보고/리스크/의사결정 항목을 종합 분석해 드립니다</p>
              </div>
              <GenerateBriefButton projectId={id} hasBrief={false} />
            </div>
          )}

          {/* 최근 AI 판단 카드 + 비개발자 번역 */}
          {latestAssessment && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    최근 AI 판단
                    <Badge className={`text-xs ${signalColors[latestAssessment.alignment_signal] || signalColors['주의']}`}>
                      {latestAssessment.alignment_signal?.replace('_', ' ')}
                    </Badge>
                  </CardTitle>
                  <Link href={`/projects/${id}/reports`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      전체 보기 <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {/* 비개발자 번역 */}
                <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg mb-3">
                  <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    💬 {translateAlignmentSignal(latestAssessment.alignment_signal)}
                  </p>
                </div>
                {latestAssessment.ai_comment && (
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 mb-3 text-xs leading-relaxed">
                    {latestAssessment.ai_comment}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '기능정의서 정합', score: latestAssessment.spec_alignment_score, tip: '계획한 기능과 실제 개발이 얼마나 맞는지' },
                    { label: '주간계획 정합', score: latestAssessment.weekly_plan_score, tip: '이번 주 계획대로 진행되고 있는지' },
                    { label: '증빙 강도', score: latestAssessment.evidence_score, tip: '개발 결과물 근거가 얼마나 충분한지' },
                  ].map(({ label, score, tip }) => (
                    <div key={label} className="text-center bg-slate-50 rounded-lg p-2 group relative" title={tip}>
                      <p className="text-xs text-slate-500 mb-1">{label}</p>
                      <p className={`text-lg font-bold ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {score}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2 pt-2 border-t">
                  이 카드는 AI 보조 분석이며 실제 코드 실행·빌드 성공을 보장하지 않습니다
                </p>
              </CardContent>
            </Card>
          )}

          {/* Must-Check 목록 + 비개발자 번역 */}
          {(mustCheckItems?.length || 0) > 0 && (
            <Card className="border-purple-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-600" />
                    Must-Check
                    <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">{mustCheckItems?.length}</Badge>
                  </CardTitle>
                  <Link href={`/projects/${id}/overview?tab=must-check`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      전체 보기 <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {mustCheckItems?.slice(0, 3).map((item) => (
                  <Link key={item.id} href={`/projects/${id}/overview?tab=must-check&item=${item.id}`}>
                    <div className="p-2.5 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <Bell className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                        <p className="text-sm text-purple-900 font-medium flex-1 truncate">{item.title}</p>
                        <ChevronRight className="w-3 h-3 text-purple-300 flex-shrink-0" />
                      </div>
                      {/* 비개발자 번역 */}
                      <p className="text-xs text-purple-600 pl-5">
                        💬 {translateMustCheckTrigger(item.trigger_type)}
                      </p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 오픈 리스크 + 비개발자 번역 */}
          {(openRisks?.length || 0) > 0 && (
            <Card className="border-red-100">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    오픈 리스크
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs">{openRisks?.length}</Badge>
                  </CardTitle>
                  <Link href={`/projects/${id}/overview?tab=risks`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      전체 보기 <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {openRisks?.slice(0, 3).map((risk) => (
                  <Link key={risk.id} href={`/projects/${id}/overview?tab=risks&item=${risk.id}`}>
                    <div className="p-2.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs flex-shrink-0 ${riskLevelColors[risk.level]}`}>{risk.level}</Badge>
                        <p className="text-sm text-slate-800 flex-1 truncate">{risk.title}</p>
                        <ChevronRight className="w-3 h-3 text-red-300 flex-shrink-0" />
                      </div>
                      {/* 비개발자 번역 */}
                      <p className="text-xs text-red-600 pl-1">
                        💬 {translateRiskType(risk.risk_type)}
                      </p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─ 오른쪽 1/3 ─ */}
        <div className="space-y-4">
          {/* 외주사 접속 링크 */}
          <VendorLinkCard
            projectId={id}
            vendorLink={vendorLink || null}
            vendorAccessUrl={vendorAccessUrl}
          />

          {/* 이번 주 계획 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">이번 주 계획</CardTitle>
            </CardHeader>
            <CardContent>
              {currentWeekPlan ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">
                      {(currentWeekPlan as Record<string, string>).week_start} ~ {(currentWeekPlan as Record<string, string>).week_end}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {(currentWeekPlan as Record<string, string>).status === 'approved' ? '✅ 승인됨'
                        : (currentWeekPlan as Record<string, string>).status === 'vendor_agreed' ? '🤝 동의됨'
                        : '📝 초안'}
                    </Badge>
                  </div>
                  <Link href={`/projects/${id}/weekly-plan`}>
                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      주간 계획 보기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-slate-500 mb-2">이번 주 계획이 없습니다</p>
                  <Link href={`/projects/${id}/weekly-plan`}>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 gap-2 text-xs w-full">
                      <Calendar className="w-3.5 h-3.5" />
                      계획 수립하기
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 기능 현황 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">기능 현황</CardTitle>
                <Link href={`/projects/${id}/features`}>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    전체 <ChevronRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: '계획 중', count: featureStats.total - featureStats.approved - featureStats.inProgress, color: 'bg-gray-400' },
                { label: '진행 중', count: featureStats.inProgress, color: 'bg-blue-500' },
                { label: '완료', count: featureStats.completed, color: 'bg-green-500' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
                  <span className="text-xs text-slate-600 flex-1">{label}</span>
                  <span className="text-xs font-semibold text-slate-900">{count}</span>
                </div>
              ))}
              <div className="mt-2 border-t pt-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs text-slate-500">
                    완료율 {featureStats.total > 0 ? ((featureStats.completed / featureStats.total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 최근 보고 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">최근 보고</CardTitle>
                <Link href={`/projects/${id}/reports`}>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    전체 <ChevronRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentReports && recentReports.length > 0 ? (
                recentReports.slice(0, 4).map((report) => {
                  const assessment = (report as Report & { daily_assessments?: DailyAssessment[] }).daily_assessments?.[0]
                  return (
                    <div key={report.id} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 w-16 flex-shrink-0">{report.report_date?.slice(5)}</span>
                      {assessment && (
                        <Badge className={`text-xs py-0 px-1.5 flex-shrink-0 ${signalColors[assessment.alignment_signal] || ''}`}>
                          {assessment.alignment_signal === '정상' ? '정상'
                            : assessment.alignment_signal === '주의' ? '주의'
                            : '점검'}
                        </Badge>
                      )}
                      <span className="text-slate-600 truncate">{report.summary}</span>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-3">
                  <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">아직 보고가 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

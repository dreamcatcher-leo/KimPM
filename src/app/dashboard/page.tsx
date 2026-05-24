import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import TopBar from '@/components/layout/TopBar'
import AppSidebar from '@/components/layout/AppSidebar'
import {
  Plus, ExternalLink, AlertTriangle, Bell, CheckCircle,
  Clock, TrendingUp, TrendingDown, Minus, Activity, Zap,
  Target, Brain, FileWarning, ChevronRight
} from 'lucide-react'
import type { Profile, Project } from '@/types'
import DashboardWeeklyAnalysis from '@/components/dashboard/DashboardWeeklyAnalysis'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('founder_id', user.id)
    .order('created_at', { ascending: false }) as { data: Project[] | null }

  // 프로젝트별 통계 계산
  const projectStats = await Promise.all((projects || []).map(async (project) => {
    const [
      { data: features },
      { count: mustChecks },
      { count: decisions },
      { count: openRisks },
      { data: lastReport },
      { data: weeklyPlan },
    ] = await Promise.all([
      supabase.from('features').select('id, status, priority_group').eq('project_id', project.id),
      supabase.from('must_check_items').select('*', { count: 'exact', head: true }).eq('project_id', project.id).eq('is_resolved', false),
      supabase.from('decisions').select('*', { count: 'exact', head: true }).eq('project_id', project.id).eq('status', 'pending'),
      supabase.from('risks').select('*', { count: 'exact', head: true }).eq('project_id', project.id).eq('is_resolved', false),
      supabase.from('reports').select('report_date').eq('project_id', project.id).order('report_date', { ascending: false }).limit(1),
      supabase.from('weekly_plans').select('*').eq('project_id', project.id).order('week_start', { ascending: false }).limit(1),
    ])

    const totalFeatures = features?.length || 0
    const completedFeatures = features?.filter(f => f.status === 'approved' || f.status === 'completed').length || 0
    const inProgressFeatures = features?.filter(f => f.status === 'in_progress').length || 0
    const specApprovedFeatures = features?.filter(f => f.status === 'spec_approved').length || 0

    // 전체 진행도 계산: 완료 = 100%, 진행 중 = 50%, 정의서 승인 = 20%
    const weightedProgress = totalFeatures > 0
      ? Math.round(((completedFeatures * 100 + inProgressFeatures * 50 + specApprovedFeatures * 20) / (totalFeatures * 100)) * 100)
      : 0

    return {
      project,
      totalFeatures,
      completedFeatures,
      inProgressFeatures,
      specApprovedFeatures,
      weightedProgress,
      mustChecks: mustChecks || 0,
      decisions: decisions || 0,
      openRisks: openRisks || 0,
      lastReportDate: lastReport?.[0]?.report_date || null,
      weeklyPlan: weeklyPlan?.[0] || null,
    }
  }))

  // 전체 통합 진행도
  const allStats = projectStats.filter(s => s.project.status === 'active')
  const overallProgress = allStats.length > 0
    ? Math.round(allStats.reduce((sum, s) => sum + s.weightedProgress, 0) / allStats.length)
    : 0
  const totalMustChecks = allStats.reduce((sum, s) => sum + s.mustChecks, 0)
  const totalDecisions = allStats.reduce((sum, s) => sum + s.decisions, 0)
  const totalOpenRisks = allStats.reduce((sum, s) => sum + s.openRisks, 0)
  const totalFeatures = allStats.reduce((sum, s) => sum + s.totalFeatures, 0)
  const totalCompleted = allStats.reduce((sum, s) => sum + s.completedFeatures, 0)
  const totalInProgress = allStats.reduce((sum, s) => sum + s.inProgressFeatures, 0)

  // 이번 주 날짜 계산
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const weekStart = monday.toISOString().split('T')[0]
  const weekEnd = sunday.toISOString().split('T')[0]

  // 이번 주 보고 수집 (활성 프로젝트)
  let thisWeekReports = 0
  let thisWeekEvidences = 0
  const workingDaysElapsed = Math.max(0, Math.min(5, Math.floor((now.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24)) + 1))

  for (const s of allStats) {
    const [{ count: rCnt }, { count: eCnt }] = await Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true })
        .eq('project_id', s.project.id).gte('report_date', weekStart).lte('report_date', weekEnd),
      supabase.from('evidence_items').select('*', { count: 'exact', head: true })
        .eq('project_id', s.project.id).gte('created_at', monday.toISOString()),
    ])
    thisWeekReports += rCnt || 0
    thisWeekEvidences += eCnt || 0
  }

  // 이번 주 실행도 기본 계산 (보고 기반)
  const expectedReports = allStats.length * workingDaysElapsed
  const weeklyExecution = expectedReports > 0
    ? Math.min(100, Math.round((thisWeekReports / expectedReports) * 100))
    : 0

  // 리스크 레벨 결정
  const getRiskLevel = () => {
    if (totalOpenRisks >= 3 || totalDecisions >= 3) return { level: '높음', color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' }
    if (totalOpenRisks >= 1 || totalDecisions >= 1 || totalMustChecks >= 2) return { level: '보통', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-400' }
    return { level: '낮음', color: 'text-green-600', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' }
  }
  const riskStatus = getRiskLevel()

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-700',
  }
  const statusLabels: Record<string, string> = {
    active: '진행 중',
    paused: '일시 중지',
    completed: '완료',
    archived: '보관',
  }

  const activeProjects = allStats.map(s => s.project)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <TopBar profile={profile} title="전체 대시보드" />
        <main className="flex-1 p-6 space-y-6">

          {/* ============================================ */}
          {/* HERO SECTION: 전체 개발 진행도 대형 바 */}
          {/* ============================================ */}
          {allStats.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-semibold text-slate-200">전체 개발 현황</h2>
                <span className="text-xs text-slate-500">{now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} 기준</span>
              </div>

              {/* 3개 지표 큰 숫자 */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {/* 전체 진행도 */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-slate-400 mb-1">전체 개발 진행도</div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-white">{overallProgress}</span>
                    <span className="text-xl text-slate-400 mb-1">%</span>
                  </div>
                  <div className="mt-3 h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${overallProgress >= 70 ? 'bg-green-400' : overallProgress >= 40 ? 'bg-blue-400' : 'bg-orange-400'}`}
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{totalCompleted}/{totalFeatures}개 완료 · {totalInProgress}개 진행 중</div>
                </div>

                {/* 이번 주 실행도 */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-slate-400 mb-1">이번 주 실행도</div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-white">{weeklyExecution}</span>
                    <span className="text-xl text-slate-400 mb-1">%</span>
                  </div>
                  <div className="mt-3 h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${weeklyExecution >= 70 ? 'bg-green-400' : weeklyExecution >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${weeklyExecution}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    보고 {thisWeekReports}건 · 증빙 {thisWeekEvidences}건 ({workingDaysElapsed}/5일 경과)
                  </div>
                </div>

                {/* 일정 지연 리스크 */}
                <div className={`rounded-xl p-4 border ${
                  riskStatus.level === '높음' ? 'bg-red-500/20 border-red-400/30' :
                  riskStatus.level === '보통' ? 'bg-orange-500/15 border-orange-400/20' :
                  'bg-green-500/10 border-green-400/20'
                }`}>
                  <div className="text-xs text-slate-400 mb-1">일정 지연 리스크</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${riskStatus.dot} animate-pulse`} />
                    <span className={`text-3xl font-bold ${riskStatus.color}`}>{riskStatus.level}</span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    {totalOpenRisks > 0 && <div>⚠️ 오픈 리스크 {totalOpenRisks}건</div>}
                    {totalDecisions > 0 && <div>⏳ 의사결정 대기 {totalDecisions}건</div>}
                    {totalMustChecks > 0 && <div>🔔 Must-Check {totalMustChecks}건</div>}
                    {totalOpenRisks === 0 && totalDecisions === 0 && totalMustChecks === 0 && (
                      <div>✅ 특이사항 없음</div>
                    )}
                  </div>
                </div>
              </div>

              {/* 전체 진행도 대형 막대 */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-slate-300 font-medium">기능 개발 진행 현황</span>
                  <span className="text-sm text-slate-400">{totalFeatures}개 기능 중 {totalCompleted}개 완료</span>
                </div>
                {/* 세그먼트 바 */}
                <div className="h-5 bg-white/10 rounded-full overflow-hidden flex">
                  {totalFeatures > 0 && (
                    <>
                      <div
                        className="bg-green-500 h-full transition-all"
                        style={{ width: `${(totalCompleted / totalFeatures) * 100}%` }}
                        title={`완료: ${totalCompleted}개`}
                      />
                      <div
                        className="bg-blue-400 h-full transition-all"
                        style={{ width: `${(totalInProgress / totalFeatures) * 100}%` }}
                        title={`진행 중: ${totalInProgress}개`}
                      />
                      <div
                        className="bg-slate-500 h-full transition-all"
                        style={{ width: `${((totalFeatures - totalCompleted - totalInProgress) / totalFeatures) * 100}%` }}
                        title={`미착수: ${totalFeatures - totalCompleted - totalInProgress}개`}
                      />
                    </>
                  )}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block" />완료 {totalCompleted}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-full inline-block" />진행 중 {totalInProgress}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-500 rounded-full inline-block" />미착수 {totalFeatures - totalCompleted - totalInProgress}</span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* 대표 결정함 + Digest 3줄 요약 */}
          {/* ============================================ */}
          {allStats.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 대표 결정함 — 지금 결정해야 하는 것 TOP 3 */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-orange-500" />
                  <h2 className="text-sm font-bold text-slate-800">지금 대표가 결정해야 할 것</h2>
                  <Badge className="bg-orange-100 text-orange-700 text-xs border-0">
                    {Math.min(3, totalDecisions + totalMustChecks + totalOpenRisks)}건
                  </Badge>
                </div>
                <div className="space-y-2">
                  {/* Must-Check 항목 */}
                  {totalMustChecks > 0 && allStats.slice(0, 1).map(s => (
                    <Link key={`mc-${s.project.id}`} href={`/projects/${s.project.id}/overview?tab=must-check`}>
                      <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer group">
                        <Bell className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-purple-900">Must-Check {s.mustChecks}건 확인 필요</span>
                            <Badge className="bg-purple-200 text-purple-800 text-xs border-0">즉시</Badge>
                          </div>
                          <p className="text-xs text-purple-700 mt-0.5">
                            직접 확인하지 않으면 외주사가 기다리다 잘못된 방향으로 진행할 수 있습니다
                          </p>
                          <p className="text-xs text-purple-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">→ 통합 결정함에서 바로 처리하기</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      </div>
                    </Link>
                  ))}

                  {/* 의사결정 대기 */}
                  {totalDecisions > 0 && allStats.slice(0, 1).map(s => (
                    <Link key={`dec-${s.project.id}`} href={`/projects/${s.project.id}/overview?tab=decisions`}>
                      <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors cursor-pointer group">
                        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-orange-900">의사결정 대기 {s.decisions}건</span>
                            <Badge className="bg-orange-200 text-orange-800 text-xs border-0">오늘 안에</Badge>
                          </div>
                          <p className="text-xs text-orange-700 mt-0.5">
                            대표 결정이 없으면 개발이 중단되거나 외주사가 임의로 진행해 나중에 분쟁이 생깁니다
                          </p>
                          <p className="text-xs text-orange-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">→ 통합 결정함에서 승인·반려·보류 처리하기</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      </div>
                    </Link>
                  ))}

                  {/* 오픈 리스크 */}
                  {totalOpenRisks > 0 && allStats.slice(0, 1).map(s => (
                    <Link key={`risk-${s.project.id}`} href={`/projects/${s.project.id}/overview?tab=risks`}>
                      <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors cursor-pointer group">
                        <FileWarning className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-red-900">지연 리스크 {s.openRisks}건 미해결</span>
                            <Badge className="bg-red-200 text-red-800 text-xs border-0">일정 위험</Badge>
                          </div>
                          <p className="text-xs text-red-700 mt-0.5">
                            해결되지 않은 리스크가 있으면 납기일이 밀릴 가능성이 높습니다
                          </p>
                          <p className="text-xs text-red-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">→ 통합 결정함에서 리스크 해결하기</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-red-400 flex-shrink-0" />
                      </div>
                    </Link>
                  ))}

                  {/* 모두 해결된 경우 */}
                  {totalDecisions === 0 && totalMustChecks === 0 && totalOpenRisks === 0 && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <p className="text-sm text-green-800 font-medium">지금 당장 결정해야 할 것이 없습니다 ✅</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Digest 3줄 요약 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-blue-500" />
                  <h2 className="text-sm font-bold text-slate-800">오늘의 3줄 요약</h2>
                </div>
                <Card className="bg-slate-900 border-slate-700">
                  <CardContent className="pt-4 space-y-3">
                    {/* 오늘 보고 상태 */}
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 text-xs mt-0.5">📊</span>
                      <div>
                        <p className="text-xs text-slate-400">보고 현황</p>
                        <p className="text-sm text-white font-medium">
                          {allStats.length > 0
                            ? `이번 주 보고 ${thisWeekReports}건 / 예상 ${allStats.length * workingDaysElapsed}건`
                            : '활성 프로젝트 없음'}
                        </p>
                      </div>
                    </div>
                    {/* 가장 위험한 기능 */}
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 text-xs mt-0.5">⚠️</span>
                      <div>
                        <p className="text-xs text-slate-400">가장 위험한 상황</p>
                        <p className="text-sm text-white font-medium">
                          {riskStatus.level === '높음'
                            ? `오픈 리스크 ${totalOpenRisks}건 + 의사결정 ${totalDecisions}건 미해결`
                            : riskStatus.level === '보통'
                            ? `리스크 ${totalOpenRisks}건 또는 결정 대기 ${totalDecisions}건`
                            : '현재 특이사항 없음'}
                        </p>
                      </div>
                    </div>
                    {/* 지금 승인 필요 */}
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 text-xs mt-0.5">✅</span>
                      <div>
                        <p className="text-xs text-slate-400">지금 승인 필요</p>
                        <p className="text-sm text-white font-medium">
                          {totalDecisions > 0
                            ? `의사결정 ${totalDecisions}건 — 대표 승인 대기 중`
                            : totalMustChecks > 0
                            ? `Must-Check ${totalMustChecks}건 확인 필요`
                            : '없음'}
                        </p>
                      </div>
                    </div>
                    {/* 전체 진행도 */}
                    <div className="border-t border-slate-700 pt-2 mt-1">
                      <p className="text-xs text-slate-500">전체 진행도 {overallProgress}% · {totalCompleted}/{totalFeatures}개 완료</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* 주간 플랜 AI 실행도 분석 + 지연 리스크 TOP3 */}
          {/* ============================================ */}
          {activeProjects.length > 0 && (
            <DashboardWeeklyAnalysis
              projectId={activeProjects[0].id}
              projectName={activeProjects[0].name}
            />
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">프로젝트 목록</h1>
              <p className="text-slate-500 text-sm mt-0.5">외주 개발 프로젝트 전체 현황</p>
            </div>
            <Link href="/projects/new">
              <Button className="gap-2 bg-blue-600 hover:bg-blue-500">
                <Plus className="w-4 h-4" />
                새 프로젝트
              </Button>
            </Link>
          </div>

          {/* Projects Grid */}
          {projectStats.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">프로젝트가 없습니다</h3>
              <p className="text-slate-500 text-sm mb-6">첫 외주 개발 프로젝트를 생성해보세요</p>
              <Link href="/projects/new">
                <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
                  <Plus className="w-4 h-4" />
                  프로젝트 생성
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projectStats.map(({ project, totalFeatures, completedFeatures, inProgressFeatures, weightedProgress, mustChecks, decisions, openRisks, lastReportDate }) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base text-slate-900 truncate">
                          {project.name}
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-0.5">{project.vendor_name}</p>
                      </div>
                      <Badge className={statusColors[project.status] || statusColors.active}>
                        {statusLabels[project.status] || project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* 진행도 바 */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs text-slate-500">개발 진행도</span>
                        <span className="text-sm font-semibold text-slate-700">{weightedProgress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${weightedProgress >= 70 ? 'bg-green-500' : weightedProgress >= 40 ? 'bg-blue-500' : 'bg-orange-400'}`}
                          style={{ width: `${weightedProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-slate-400">
                        <span>완료 {completedFeatures}개 · 진행 {inProgressFeatures}개</span>
                        <span>전체 {totalFeatures}개</span>
                      </div>
                    </div>

                    {/* Alerts */}
                    <div className="space-y-1.5 mb-4">
                      {mustChecks > 0 && (
                        <div className="flex items-center gap-2 text-sm bg-purple-50 text-purple-700 rounded-lg px-3 py-1.5">
                          <Bell className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Must-Check {mustChecks}건</span>
                        </div>
                      )}
                      {decisions > 0 && (
                        <div className="flex items-center gap-2 text-sm bg-orange-50 text-orange-700 rounded-lg px-3 py-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>의사결정 대기 {decisions}건</span>
                        </div>
                      )}
                      {openRisks > 0 && (
                        <div className="flex items-center gap-2 text-sm bg-red-50 text-red-700 rounded-lg px-3 py-1.5">
                          <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>오픈 리스크 {openRisks}건</span>
                        </div>
                      )}
                      {lastReportDate && (
                        <div className="flex items-center gap-2 text-sm bg-green-50 text-green-700 rounded-lg px-3 py-1.5">
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>최근 보고: {lastReportDate}</span>
                        </div>
                      )}
                      {!lastReportDate && (
                        <div className="flex items-center gap-2 text-sm bg-slate-50 text-slate-500 rounded-lg px-3 py-1.5">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>아직 보고 없음</span>
                        </div>
                      )}
                    </div>

                    {/* Contract dates */}
                    <p className="text-xs text-slate-400 mb-3">
                      {project.contract_start} ~ {project.contract_end}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link href={`/projects/${project.id}/dashboard`} className="flex-1">
                        <Button variant="default" size="sm" className="w-full bg-blue-600 hover:bg-blue-500 gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5" />
                          프로젝트 열기
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

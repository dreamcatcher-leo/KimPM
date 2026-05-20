import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Bell, AlertTriangle, CheckCircle, Clock, TrendingUp,
  FileText, Calendar, ChevronRight, ExternalLink, Copy
} from 'lucide-react'
import type { Project, Report, DailyAssessment, MustCheckItem, Risk, Feature } from '@/types'
import VendorLinkCard from '@/components/dashboard/VendorLinkCard'
import FounderBriefCard from '@/components/dashboard/FounderBriefCard'

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
  ] = await Promise.all([
    supabase.from('features').select('*').eq('project_id', id).order('order_key'),
    supabase.from('must_check_items').select('*').eq('project_id', id).eq('is_resolved', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('risks').select('*').eq('project_id', id).eq('is_resolved', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('decisions').select('*').eq('project_id', id).eq('status', 'pending').limit(5),
    supabase.from('reports').select(`*, daily_assessments(*)`).eq('project_id', id).order('report_date', { ascending: false }).limit(5),
    supabase.from('founder_daily_briefs').select('*').eq('project_id', id).order('brief_date', { ascending: false }).limit(1),
    supabase.from('access_links').select('*').eq('project_id', id).eq('is_active', true).limit(1),
    supabase.from('weekly_plans').select('*').eq('project_id', id).order('week_start', { ascending: false }).limit(1),
  ])

  const featureStats = {
    total: features?.length || 0,
    approved: features?.filter(f => f.status === 'spec_approved' || f.status === 'approved').length || 0,
    inProgress: features?.filter(f => f.status === 'in_progress').length || 0,
    completed: features?.filter(f => f.status === 'approved').length || 0,
  }

  const latestReport = recentReports?.[0]
  const latestAssessment = latestReport?.daily_assessments?.[0]
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

  const daysLeft = Math.ceil(
    (new Date(project.contract_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )
  const totalDays = Math.ceil(
    (new Date(project.contract_end).getTime() - new Date(project.contract_start).getTime()) / (1000 * 60 * 60 * 24)
  )
  const progressPercent = Math.max(0, Math.min(100, ((totalDays - daysLeft) / totalDays) * 100))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-slate-500 text-sm mt-1">외주사: {project.vendor_name} · {project.contract_start} ~ {project.contract_end}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${id}/features/new`}>
            <Button size="sm" variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              기능 추가
            </Button>
          </Link>
          <Link href={`/projects/${id}/weekly-plan`}>
            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500">
              <Calendar className="w-4 h-4" />
              주간 계획
            </Button>
          </Link>
        </div>
      </div>

      {/* Contract Progress */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">계약 진행률</span>
            <span className="text-sm font-medium text-slate-900">
              {daysLeft > 0 ? `${daysLeft}일 남음` : '계약 종료'}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-slate-400 mt-1">{progressPercent.toFixed(0)}% 경과</p>
        </CardContent>
      </Card>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">총 기능</p>
            <p className="text-3xl font-bold text-slate-900">{featureStats.total}</p>
            <p className="text-xs text-slate-400 mt-1">완료: {featureStats.completed}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">Must-Check</p>
            <p className={`text-3xl font-bold ${(mustCheckItems?.length || 0) > 0 ? 'text-purple-600' : 'text-slate-900'}`}>
              {mustCheckItems?.length || 0}
            </p>
            <p className="text-xs text-slate-400 mt-1">직접 확인 필요</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">오픈 리스크</p>
            <p className={`text-3xl font-bold ${(openRisks?.length || 0) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {openRisks?.length || 0}
            </p>
            <p className="text-xs text-slate-400 mt-1">미해결</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">의사결정 대기</p>
            <p className={`text-3xl font-bold ${(pendingDecisions?.length || 0) > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
              {pendingDecisions?.length || 0}
            </p>
            <p className="text-xs text-slate-400 mt-1">승인/반려 필요</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Brief */}
          {latestBrief && (
            <FounderBriefCard brief={latestBrief} projectId={id} />
          )}

          {/* Latest AI Assessment */}
          {latestAssessment && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">최근 AI 판단 카드</CardTitle>
                  <Link href={`/projects/${id}/reports`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      전체 보기 <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 mb-3">
                  <Badge className={signalColors[latestAssessment.alignment_signal] || signalColors['주의']}>
                    {latestAssessment.alignment_signal.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm text-slate-600">{latestReport?.report_date}</span>
                </div>
                {latestAssessment.ai_comment && (
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 mb-3">
                    {latestAssessment.ai_comment}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '기능정의서 정합', score: latestAssessment.spec_alignment_score },
                    { label: '주간계획 정합', score: latestAssessment.weekly_plan_score },
                    { label: '증빙 강도', score: latestAssessment.evidence_score },
                  ].map(({ label, score }) => (
                    <div key={label} className="text-center bg-slate-50 rounded-lg p-2">
                      <p className="text-xs text-slate-500 mb-1">{label}</p>
                      <p className={`text-lg font-bold ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {score}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3 border-t pt-2">
                  이 카드는 보조 자료이며 실제 코드 실행, 빌드 성공, 진실성 자체를 보장하지 않습니다.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Must-Check Items */}
          {(mustCheckItems?.length || 0) > 0 && (
            <Card className="border-purple-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-600" />
                    Must-Check
                  </CardTitle>
                  <Link href={`/projects/${id}/must-check`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      전체 <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {mustCheckItems?.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg">
                    <Bell className="w-3.5 h-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-purple-900 font-medium">{item.title}</p>
                      <p className="text-xs text-purple-600">{item.trigger_type.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Open Risks */}
          {(openRisks?.length || 0) > 0 && (
            <Card className="border-red-100">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    오픈 리스크
                  </CardTitle>
                  <Link href={`/projects/${id}/risks`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      전체 <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {openRisks?.slice(0, 3).map((risk) => (
                  <div key={risk.id} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                    <Badge className={`text-xs flex-shrink-0 ${riskLevelColors[risk.level]}`}>
                      {risk.level}
                    </Badge>
                    <p className="text-sm text-slate-800">{risk.title}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Vendor Link */}
          <VendorLinkCard
            projectId={id}
            vendorLink={vendorLink || null}
            vendorAccessUrl={vendorAccessUrl}
          />

          {/* Weekly Plan Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">이번 주 계획</CardTitle>
            </CardHeader>
            <CardContent>
              {currentWeekPlan ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">
                      {currentWeekPlan.week_start} ~ {currentWeekPlan.week_end}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {currentWeekPlan.status === 'approved' ? '✅ 승인됨'
                        : currentWeekPlan.status === 'vendor_agreed' ? '🤝 외주사 동의'
                        : currentWeekPlan.status === 'draft' ? '📝 초안'
                        : '완료'}
                    </Badge>
                  </div>
                  <Link href={`/projects/${id}/weekly-plan`}>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      주간 계획 보기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-slate-500 mb-2">이번 주 계획이 없습니다</p>
                  <Link href={`/projects/${id}/weekly-plan`}>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 gap-2 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      계획 수립
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feature Progress */}
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
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-xs text-slate-600 flex-1">{label}</span>
                  <span className="text-xs font-medium text-slate-900">{count}</span>
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

          {/* Recent Reports */}
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
                  const assessment = report.daily_assessments?.[0]
                  return (
                    <div key={report.id} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 w-20 flex-shrink-0">{report.report_date}</span>
                      {assessment && (
                        <Badge className={`text-xs py-0 ${signalColors[assessment.alignment_signal] || ''}`}>
                          {assessment.alignment_signal}
                        </Badge>
                      )}
                      <span className="text-slate-600 truncate">{report.summary}</span>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">보고 없음</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

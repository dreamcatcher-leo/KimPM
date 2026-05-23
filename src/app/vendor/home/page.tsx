import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText, Send, MessageSquare, GitBranch, CheckSquare,
  BookOpen, Clock, ChevronRight, AlertCircle, CheckCircle,
  Calendar, LogOut, Bell
} from 'lucide-react'
import type { AccessLink, Project, Feature, Report } from '@/types'

export default async function VendorHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // role 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'vendor') {
    redirect('/dashboard')
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // vendor 이메일로 access_links 조회
  const { data: links } = await admin
    .from('access_links')
    .select('*, projects(*)')
    .eq('vendor_email', user.email)
    .eq('is_active', true) as { data: (AccessLink & { projects: Project })[] | null }

  const link = links?.[0]
  const project = link?.projects

  if (!link || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">프로젝트 배정 없음</h1>
          <p className="text-slate-500 text-sm">
            현재 배정된 프로젝트가 없습니다.<br />
            대표에게 프로젝트 배정을 요청해주세요.
          </p>
          <form action="/auth/signout" method="POST" className="mt-6">
            <Button variant="outline" size="sm">로그아웃</Button>
          </form>
        </div>
      </div>
    )
  }

  const token = link.token

  // 병렬로 데이터 조회
  const [
    { data: features },
    { data: todayReport },
    { data: weeklyPlan },
    { data: recentReports },
    { data: myQuestions },
    { data: pendingQuestions },
    { data: openChangeRequests },
  ] = await Promise.all([
    admin.from('features').select('*').eq('project_id', project.id)
      .in('status', ['spec_approved', 'in_progress', 'approved']).order('order_key'),
    admin.from('reports').select('*').eq('project_id', project.id).eq('report_date', today)
      .order('submitted_at', { ascending: false }).limit(1).single(),
    admin.from('weekly_plans').select('*').eq('project_id', project.id)
      .order('week_start', { ascending: false }).limit(1).single(),
    admin.from('reports').select('report_date, summary, alignment_signal:daily_assessments(alignment_signal)')
      .eq('project_id', project.id).order('report_date', { ascending: false }).limit(5),
    admin.from('questions').select('*').eq('project_id', project.id)
      .eq('access_link_id', link.id).eq('is_resolved', false).order('created_at', { ascending: false }).limit(5),
    admin.from('questions').select('*').eq('project_id', project.id)
      .eq('access_link_id', link.id).not('answer', 'is', null).eq('is_resolved', false)
      .order('answered_at', { ascending: false }).limit(3),
    admin.from('change_requests').select('*').eq('project_id', project.id)
      .in('status', ['pending', 'reviewing']).order('created_at', { ascending: false }).limit(3),
  ])

  // 이번 주 계획 항목 파싱
  const planContent = (weeklyPlan as Record<string, unknown> | null)?.final_plan as Record<string, unknown> | null
    || (weeklyPlan as Record<string, unknown> | null)?.vendor_modified as Record<string, unknown> | null
    || (weeklyPlan as Record<string, unknown> | null)?.ai_draft as Record<string, unknown> | null
  const weeklyGoals: { feature?: string; target?: string; risk?: string; deliverable?: string }[] = (planContent?.goals as unknown[])?.map(g => g as { feature?: string; target?: string; risk?: string; deliverable?: string }) || []

  // 완료 안된 기능 (진행 중)
  const inProgressFeatures = (features as Feature[] | null)?.filter(f => f.status === 'in_progress') || []
  const specApprovedFeatures = (features as Feature[] | null)?.filter(f => f.status === 'spec_approved') || []

  // 오늘 보고 여부
  const hasTodayReport = !!todayReport

  // 답변된 질문
  const answeredQuestions = pendingQuestions || []

  const navItems = [
    { href: `/vendor/${token}`, label: '홈 (레거시)' },
    { href: `/vendor/${token}/specs`, label: '기능 정의서' },
    { href: `/vendor/${token}/report`, label: '일일 보고' },
    { href: `/vendor/${token}/questions`, label: '질문' },
    { href: `/vendor/${token}/change-request`, label: '변경 요청' },
    { href: `/vendor/${token}/completion`, label: '완료 제출' },
    { href: `/vendor/${token}/evidence`, label: '증빙자료' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 네비게이션 */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">DG</div>
              <span className="font-semibold text-slate-800 text-sm">{project.name}</span>
              <Badge variant="outline" className="text-xs text-purple-600 border-purple-200 bg-purple-50">외주사 포털</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{profile.full_name || user.email}</span>
              <form action="/api/auth/signout" method="POST">
                <Button type="submit" variant="ghost" size="sm" className="h-8 gap-1 text-slate-500">
                  <LogOut className="w-3 h-3" />
                  로그아웃
                </Button>
              </form>
            </div>
          </div>
          {/* 탭 */}
          <div className="flex gap-1 pb-0 overflow-x-auto">
            {navItems.slice(1).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-slate-600 hover:text-blue-600 px-3 py-2 rounded-t-md hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 인사 헤더 */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            안녕하세요, {profile.full_name || '외주사'}님 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>

        {/* 오늘 할 일 - 핵심 액션 */}
        <Card className={`border-2 ${hasTodayReport ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className={`w-4 h-4 ${hasTodayReport ? 'text-green-600' : 'text-orange-500'}`} />
              <span className={hasTodayReport ? 'text-green-700' : 'text-orange-700'}>오늘 할 일</span>
              {hasTodayReport && <Badge className="bg-green-100 text-green-700 text-xs">보고 완료 ✓</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 일일 보고 */}
              <Link href={`/vendor/${token}/report`}>
                <div className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${hasTodayReport ? 'bg-white border-green-200' : 'bg-white border-orange-200 hover:border-orange-400'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${hasTodayReport ? 'bg-green-100' : 'bg-orange-100'}`}>
                    {hasTodayReport ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Send className="w-5 h-5 text-orange-500" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">일일 보고</div>
                    <div className={`text-xs ${hasTodayReport ? 'text-green-600' : 'text-orange-600'}`}>
                      {hasTodayReport ? '오늘 보고 완료' : '아직 미제출 — 지금 제출하세요'}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                </div>
              </Link>

              {/* 증빙 자료 */}
              <Link href={`/vendor/${token}/evidence`}>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-white border-slate-200 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">증빙 자료</div>
                    <div className="text-xs text-slate-500">PR/커밋/스크린샷 첨부</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 이번 주 계획 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              이번 주 계획
              {weeklyPlan && (
                <span className="text-xs text-slate-500 font-normal">
                  {(weeklyPlan as Record<string, unknown>).week_start as string} ~ {(weeklyPlan as Record<string, unknown>).week_end as string}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyGoals.length > 0 ? (
              <div className="space-y-2">
                {weeklyGoals.slice(0, 5).map((goal: { feature?: string; target?: string; risk?: string; deliverable?: string }, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{goal.feature || `목표 ${idx + 1}`}</div>
                      {goal.target && <div className="text-xs text-slate-500 mt-0.5">{goal.target}</div>}
                      {goal.deliverable && <div className="text-xs text-blue-600 mt-0.5">📦 {goal.deliverable}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">이번 주 계획이 아직 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 진행 중인 기능 */}
        {inProgressFeatures.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                현재 진행 중인 기능
                <Badge className="bg-purple-100 text-purple-700 text-xs">{inProgressFeatures.length}건</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inProgressFeatures.slice(0, 5).map(f => (
                  <Link key={f.id} href={`/vendor/${token}/specs`}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">진행 중</Badge>
                      <span className="text-sm text-slate-700">[{f.order_key}] {f.name}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 기능 정의서 확인 필요 */}
        {specApprovedFeatures.length > 0 && (
          <Card className="border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                기능 정의서 확인 필요
                <Badge className="bg-blue-100 text-blue-700 text-xs">{specApprovedFeatures.length}건</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {specApprovedFeatures.slice(0, 3).map(f => (
                  <Link key={f.id} href={`/vendor/${token}/specs`}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 cursor-pointer">
                      <Badge className="bg-blue-100 text-blue-700 text-xs border-0">정의서 승인됨</Badge>
                      <span className="text-sm text-slate-700">[{f.order_key}] {f.name}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                    </div>
                  </Link>
                ))}
              </div>
              <Link href={`/vendor/${token}/specs`}>
                <Button variant="outline" size="sm" className="mt-3 w-full gap-2">
                  <BookOpen className="w-4 h-4" />
                  전체 기능 정의서 보기
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 답변된 질문 알림 */}
        {answeredQuestions.length > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-green-600" />
                <span className="text-green-700">답변된 질문</span>
                <Badge className="bg-green-100 text-green-700 text-xs">{answeredQuestions.length}건</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {answeredQuestions.slice(0, 3).map((q: { id: string; question: string; answer: string | null }) => (
                  <div key={q.id} className="p-2 bg-white rounded-lg border border-green-200">
                    <div className="text-sm text-slate-700 font-medium truncate">{q.question}</div>
                    {q.answer && <div className="text-xs text-green-700 mt-1 line-clamp-2">💬 {q.answer}</div>}
                  </div>
                ))}
              </div>
              <Link href={`/vendor/${token}/questions`}>
                <Button variant="outline" size="sm" className="mt-3 w-full gap-2">
                  <MessageSquare className="w-4 h-4" />
                  질문 & 답변 전체 보기
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 변경 요청 현황 */}
        {(openChangeRequests || []).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-orange-500" />
                처리 중인 변경 요청
                <Badge className="bg-orange-100 text-orange-700 text-xs">{(openChangeRequests || []).length}건</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(openChangeRequests || []).map((cr: { id: string; title: string; status: string }) => (
                  <Link key={cr.id} href={`/vendor/${token}/change-request`}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                        {cr.status === 'pending' ? '검토 대기' : '검토 중'}
                      </Badge>
                      <span className="text-sm text-slate-700 truncate">{cr.title}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 빠른 액션 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: `/vendor/${token}/report`, icon: Send, label: '일일 보고', color: 'text-blue-600 bg-blue-50' },
            { href: `/vendor/${token}/questions`, icon: MessageSquare, label: '질문 등록', color: 'text-purple-600 bg-purple-50' },
            { href: `/vendor/${token}/change-request`, icon: GitBranch, label: '변경 요청', color: 'text-orange-600 bg-orange-50' },
            { href: `/vendor/${token}/completion`, icon: CheckSquare, label: '완료 제출', color: 'text-green-600 bg-green-50' },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}>
              <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 text-center">{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

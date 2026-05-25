import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Send, MessageSquare, GitBranch, CheckSquare, BookOpen, Clock, ChevronRight } from 'lucide-react'
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

  // Get approved features & specs
  const { data: features } = await admin
    .from('features')
    .select('*')
    .eq('project_id', project.id)
    .in('status', ['spec_approved', 'in_progress', 'approved'])
    .order('order_key') as { data: Feature[] | null }

  // Get today's report
  const { data: todayReport } = await admin
    .from('reports')
    .select('*')
    .eq('project_id', project.id)
    .eq('report_date', today)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single() as { data: Report | null }

  // Get recent reports
  const { data: recentReports } = await admin
    .from('reports')
    .select('*')
    .eq('project_id', project.id)
    .order('report_date', { ascending: false })
    .limit(5) as { data: Report[] | null }

  const quickActions = [
    { href: `report`, label: '일일 보고', icon: Send, color: 'bg-blue-600 hover:bg-blue-500', desc: '30초 안에 완료', urgent: !todayReport },
    { href: `specs`, label: '기능 정의서', icon: BookOpen, color: 'bg-slate-700 hover:bg-slate-600', desc: `승인된 ${features?.length || 0}개` },
    { href: `questions`, label: '질문 등록', icon: MessageSquare, color: 'bg-slate-700 hover:bg-slate-600', desc: '궁금한 점 남기기' },
    { href: `change-request`, label: '변경 요청', icon: GitBranch, color: 'bg-slate-700 hover:bg-slate-600', desc: '범위/일정 변경' },
    { href: `completion`, label: '완료 제출', icon: CheckSquare, color: 'bg-green-600 hover:bg-green-500', desc: '기능 완료 보고' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
        <p className="text-slate-500 text-sm mt-1">
          외주사: {project.vendor_name} · {project.contract_start} ~ {project.contract_end}
        </p>
      </div>

      {/* Today's Report Alert */}
      {!todayReport ? (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900">오늘의 일일 보고가 없습니다</p>
              <p className="text-sm text-blue-600 mt-0.5">30초 안에 간단히 작성해 주세요</p>
            </div>
            <Link href={`report`}>
              <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
                <Send className="w-4 h-4" />
                지금 보고하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                ✅
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-800 mb-1">오늘 보고 완료</p>
                {todayReport.summary && todayReport.summary.trim().length > 1 ? (
                  <p className="text-sm text-green-700 leading-relaxed break-words whitespace-pre-wrap line-clamp-4">
                    {todayReport.summary}
                  </p>
                ) : (
                  <p className="text-sm text-green-500 italic">보고가 제출되었습니다.</p>
                )}
                <Link href="report" className="inline-block mt-2">
                  <span className="text-xs text-green-600 hover:text-green-800 underline underline-offset-2">보고 내용 수정하기 →</span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">빠른 메뉴</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <Card className={`cursor-pointer hover:shadow-md transition-all ${action.urgent ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
                  <CardContent className="py-4 px-4">
                    <Icon className="w-5 h-5 text-slate-600 mb-2" />
                    <p className="font-medium text-slate-900 text-sm">{action.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{action.desc}</p>
                    {action.urgent && (
                      <Badge className="mt-2 bg-blue-100 text-blue-700 text-xs">미제출</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Approved Features */}
      {features && features.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              승인된 기능 ({features.length}개)
            </h2>
            <Link href="specs">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                전체 보기 <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {features.slice(0, 5).map(f => (
              <div key={f.id} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-slate-100">
                <span className="text-xs font-mono text-slate-400 w-12">{f.order_key}</span>
                <span className="text-sm text-slate-800 flex-1">{f.name}</span>
                <Badge className="text-xs bg-blue-100 text-blue-700">{f.status === 'approved' ? '완료' : '진행 중'}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reports */}
      {recentReports && recentReports.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">최근 보고</h2>
          <div className="space-y-2">
            {recentReports.map(r => (
              <div key={r.id} className="bg-white rounded-lg px-4 py-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400">{r.report_date}</span>
                  {r.needs_founder_check && (
                    <Badge className="text-xs bg-purple-100 text-purple-600 ml-auto">대표 확인</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed break-words line-clamp-3 pl-5">
                  {r.summary && r.summary.trim().length > 1 ? r.summary : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contract Info */}
      <Card className="bg-slate-50">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">계약 기간</p>
              <p className="text-slate-700 font-medium">{project.contract_start} ~ {project.contract_end}</p>
            </div>
            {project.contract_amount && (
              <div>
                <p className="text-xs text-slate-400">계약 금액</p>
                <p className="text-slate-700 font-medium">{project.contract_amount.toLocaleString()}원</p>
              </div>
            )}
          </div>
          <div className="mt-3">
            <p className="text-xs text-slate-400 mb-1">프로젝트 목표</p>
            <p className="text-sm text-slate-700">{project.goal}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

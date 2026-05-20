import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import TopBar from '@/components/layout/TopBar'
import AppSidebar from '@/components/layout/AppSidebar'
import { Plus, ExternalLink, AlertTriangle, Bell, CheckCircle, Clock } from 'lucide-react'
import type { Profile, Project } from '@/types'

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

  // Get summary stats for each project
  const projectStats = await Promise.all((projects || []).map(async (project) => {
    const [
      { count: totalFeatures },
      { count: mustChecks },
      { count: decisions },
      { count: openRisks },
      { data: lastReport },
    ] = await Promise.all([
      supabase.from('features').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
      supabase.from('must_check_items').select('*', { count: 'exact', head: true }).eq('project_id', project.id).eq('is_resolved', false),
      supabase.from('decisions').select('*', { count: 'exact', head: true }).eq('project_id', project.id).eq('status', 'pending'),
      supabase.from('risks').select('*', { count: 'exact', head: true }).eq('project_id', project.id).eq('is_resolved', false),
      supabase.from('reports').select('report_date').eq('project_id', project.id).order('report_date', { ascending: false }).limit(1),
    ])

    return {
      project,
      totalFeatures: totalFeatures || 0,
      mustChecks: mustChecks || 0,
      decisions: decisions || 0,
      openRisks: openRisks || 0,
      lastReportDate: lastReport?.[0]?.report_date || null,
    }
  }))

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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <TopBar profile={profile} title="전체 대시보드" />
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">프로젝트 현황</h1>
              <p className="text-slate-500 text-sm mt-1">외주 개발 프로젝트를 관리하세요</p>
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
              {projectStats.map(({ project, totalFeatures, mustChecks, decisions, openRisks, lastReportDate }) => (
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
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <p className="text-xs text-slate-500 mb-0.5">총 기능</p>
                        <p className="text-lg font-semibold text-slate-900">{totalFeatures}</p>
                      </div>
                      <div className={`rounded-lg p-2.5 ${openRisks > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <p className="text-xs text-slate-500 mb-0.5">오픈 리스크</p>
                        <p className={`text-lg font-semibold ${openRisks > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                          {openRisks}
                        </p>
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
                          열기
                        </Button>
                      </Link>
                      <Link href={`/projects/${project.id}/reports`}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          보고
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

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WeeklyReportClient from './WeeklyReportClient'

export default async function WeeklyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 최근 4주 범위 계산
  const now = new Date()
  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(now.getDate() - 28)
  const startDate = fourWeeksAgo.toISOString().split('T')[0]

  const [
    { data: project },
    { data: reports },
    { data: features },
    { data: completions },
    { data: weeklyPlans },
    { data: changeRequests },
    { data: risks },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('reports')
      .select('*, daily_assessments(*)')
      .eq('project_id', id)
      .gte('report_date', startDate)
      .order('report_date', { ascending: false }),
    supabase.from('features').select('*').eq('project_id', id).order('priority'),
    supabase.from('completion_candidates')
      .select('*, features(order_key, name, priority)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('weekly_plans')
      .select('*')
      .eq('project_id', id)
      .order('week_start', { ascending: false })
      .limit(8),
    supabase.from('change_requests')
      .select('*, features(order_key, name)')
      .eq('project_id', id)
      .gte('created_at', `${startDate}T00:00:00`)
      .order('created_at', { ascending: false }),
    supabase.from('risks')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">주간 PM 리포트</h1>
        <p className="text-sm text-gray-500 mt-1">
          프로젝트 진행 현황과 주차별 성과를 종합 분석합니다.
        </p>
      </div>
      <WeeklyReportClient
        project={project}
        reports={reports || []}
        features={features || []}
        completions={completions || []}
        weeklyPlans={weeklyPlans || []}
        changeRequests={changeRequests || []}
        risks={risks || []}
      />
    </div>
  )
}

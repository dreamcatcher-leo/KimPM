import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WeeklyPlanClient from './WeeklyPlanClient'
import type { WeeklyPlan, Feature } from '@/types'

function getThisWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day // 월요일 기준
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return {
    start: monday.toISOString().split('T')[0],
    end: friday.toISOString().split('T')[0],
  }
}

// 계약 기간 → 총 주수 계산
function calcTotalWeeks(contractStart: string, contractEnd: string): number {
  const start = new Date(contractStart)
  const end = new Date(contractEnd)
  const diff = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return Math.max(1, diff)
}

export default async function WeeklyPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { start, end } = getThisWeekRange()

  const [{ data: project }, { data: plans }, { data: features }] = await Promise.all([
    supabase.from('projects').select('contract_start, contract_end, name').eq('id', id).single(),
    supabase
      .from('weekly_plans')
      .select('*')
      .eq('project_id', id)
      .order('week_start', { ascending: false })
      .limit(52),
    supabase
      .from('features')
      .select('*')
      .eq('project_id', id)
      .in('status', ['spec_approved', 'in_progress', 'planning'])
      .order('order_key'),
  ])

  const totalWeeks = project
    ? calcTotalWeeks(project.contract_start, project.contract_end)
    : undefined

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">주간 계획</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          이번 주({start} ~ {end}) 작업 계획을 관리합니다
          {totalWeeks && (
            <span className="ml-2 text-slate-400">· 전체 {totalWeeks}주</span>
          )}
        </p>
      </div>
      <WeeklyPlanClient
        projectId={id}
        plans={(plans || []) as WeeklyPlan[]}
        features={(features || []) as Feature[]}
        thisWeekStart={start}
        thisWeekEnd={end}
        contractStart={project?.contract_start}
        contractEnd={project?.contract_end}
        totalWeeks={totalWeeks}
      />
    </div>
  )
}

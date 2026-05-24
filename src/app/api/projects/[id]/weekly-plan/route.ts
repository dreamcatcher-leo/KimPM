import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateWeeklyPlan } from '@/lib/openai/client'
import type { Feature } from '@/types'

// 두 날짜 사이의 주차 목록 생성 (월~금 기준)
function getWeekRanges(contractStart: string, contractEnd: string): { week_start: string; week_end: string; weekNumber: number }[] {
  const start = new Date(contractStart)
  const end = new Date(contractEnd)

  // 첫 월요일로 조정
  const day = start.getDay()
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day
  const monday = new Date(start)
  monday.setDate(start.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  const weeks: { week_start: string; week_end: string; weekNumber: number }[] = []
  let current = new Date(monday)
  let weekNumber = 1

  while (current <= end) {
    const friday = new Date(current)
    friday.setDate(current.getDate() + 4)

    weeks.push({
      week_start: current.toISOString().split('T')[0],
      week_end: friday.toISOString().split('T')[0],
      weekNumber,
    })

    current.setDate(current.getDate() + 7)
    weekNumber++
  }

  return weeks
}

// ─── POST /api/projects/[id]/weekly-plan ────────────────────────────────────
// body: { week_start, week_end, feature_ids, force_refresh? }
// 단일 주차 AI 계획 생성 or 재생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { week_start, week_end, feature_ids, force_refresh } = await request.json()
    const admin = createAdminClient()

    const { data: project } = await admin.from('projects').select('*').eq('id', id).single()
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // 기존 계획이 있고 force_refresh가 아니면 재사용
    const { data: existing } = await admin
      .from('weekly_plans')
      .select('*')
      .eq('project_id', id)
      .eq('week_start', week_start)
      .single()

    if (existing && !force_refresh) {
      return NextResponse.json({ plan: existing, cached: true })
    }

    // feature_ids가 비어있으면 프로젝트 전체 기능 fallback
    let targetFeatureIds: string[] = feature_ids || []
    if (targetFeatureIds.length === 0) {
      const { data: allFeatures } = await admin
        .from('features')
        .select('id')
        .eq('project_id', id)
        .in('status', ['planning', 'spec_approved', 'in_progress'])
      targetFeatureIds = (allFeatures || []).map((f: { id: string }) => f.id)
    }

    const { data: features } = await admin
      .from('features')
      .select('*')
      .eq('project_id', id) as { data: Feature[] | null }

    // 주차 번호 계산
    const allWeeks = getWeekRanges(project.contract_start, project.contract_end)
    const thisWeekIdx = allWeeks.findIndex(w => w.week_start === week_start)
    const weekNumber = thisWeekIdx >= 0 ? allWeeks[thisWeekIdx].weekNumber : undefined
    const totalWeeks = allWeeks.length || undefined

    // 직전 주 요약 가져오기
    let previousSummary: string | undefined
    if (thisWeekIdx > 0) {
      const prevWeek = allWeeks[thisWeekIdx - 1]
      const { data: prevPlan } = await admin
        .from('weekly_plans')
        .select('ai_draft, final_plan')
        .eq('project_id', id)
        .eq('week_start', prevWeek.week_start)
        .single()
      if (prevPlan) {
        const content = prevPlan.final_plan || prevPlan.ai_draft
        previousSummary = content?.summary || undefined
      }
    }

    const planJson = await generateWeeklyPlan(
      features || [],
      week_start,
      week_end,
      project.goal,
      weekNumber,
      totalWeeks,
      previousSummary
    )

    const planContent = JSON.parse(planJson)

    let plan
    if (existing) {
      const { data } = await admin
        .from('weekly_plans')
        .update({
          ai_draft: planContent,
          status: 'draft',
          planned_features: targetFeatureIds,
        })
        .eq('id', existing.id)
        .select()
        .single()
      plan = data
    } else {
      const { data } = await admin
        .from('weekly_plans')
        .insert({
          project_id: id,
          week_start,
          week_end,
          status: 'draft',
          ai_draft: planContent,
          planned_features: targetFeatureIds,
        })
        .select()
        .single()
      plan = data
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Error generating weekly plan:', error)
    return NextResponse.json({ error: 'Failed to generate weekly plan' }, { status: 500 })
  }
}

// ─── PUT /api/projects/[id]/weekly-plan ─────────────────────────────────────
// body: { mode: 'bulk_generate' }  → 계약 전체 기간 주차 일괄 생성
// body: { mode: 'approve', plan_id }  → 계획 승인
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const admin = createAdminClient()

    const { data: project } = await admin.from('projects').select('*').eq('id', id).single()
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // ── 모드 1: 일괄 생성 ─────────────────────────────────────────────
    if (body.mode === 'bulk_generate') {
      const weeks = getWeekRanges(project.contract_start, project.contract_end)
      if (weeks.length === 0) {
        return NextResponse.json({ error: '계약 기간에서 주차를 계산할 수 없습니다' }, { status: 400 })
      }
      if (weeks.length > 52) {
        return NextResponse.json({ error: '주차가 너무 많습니다 (최대 52주)' }, { status: 400 })
      }

      const { data: features } = await admin
        .from('features')
        .select('*')
        .eq('project_id', id) as { data: Feature[] | null }

      const { data: existingPlans } = await admin
        .from('weekly_plans')
        .select('week_start')
        .eq('project_id', id)

      const existingSet = new Set((existingPlans || []).map((p: { week_start: string }) => p.week_start))

      // 이미 있는 주차는 skip (force=true면 덮어쓰기)
      const targetWeeks = body.force
        ? weeks
        : weeks.filter(w => !existingSet.has(w.week_start))

      const results: { week_start: string; status: 'created' | 'skipped' | 'error'; plan_id?: string }[] = []

      for (const week of targetWeeks) {
        try {
          let previousSummary: string | undefined
          const weekIdx = weeks.findIndex(w => w.week_start === week.week_start)
          if (weekIdx > 0) {
            const prevWeek = weeks[weekIdx - 1]
            const { data: prevPlan } = await admin
              .from('weekly_plans')
              .select('ai_draft, final_plan')
              .eq('project_id', id)
              .eq('week_start', prevWeek.week_start)
              .single()
            if (prevPlan) {
              const content = prevPlan.final_plan || prevPlan.ai_draft
              previousSummary = content?.summary || undefined
            }
          }

          const planJson = await generateWeeklyPlan(
            features || [],
            week.week_start,
            week.week_end,
            project.goal,
            week.weekNumber,
            weeks.length,
            previousSummary
          )

          const planContent = JSON.parse(planJson)

          const activeIds = (features || [])
            .filter(f => ['planning', 'spec_approved', 'in_progress'].includes(f.status))
            .map(f => f.id)

          let planId: string | undefined
          if (existingSet.has(week.week_start) && body.force) {
            const { data: existing } = await admin
              .from('weekly_plans')
              .select('id')
              .eq('project_id', id)
              .eq('week_start', week.week_start)
              .single()
            if (existing) {
              await admin.from('weekly_plans').update({
                ai_draft: planContent,
                status: 'draft',
                planned_features: activeIds,
              }).eq('id', existing.id)
              planId = existing.id
            }
          } else {
            const { data: inserted } = await admin
              .from('weekly_plans')
              .insert({
                project_id: id,
                week_start: week.week_start,
                week_end: week.week_end,
                status: 'draft',
                ai_draft: planContent,
                planned_features: activeIds,
              })
              .select('id')
              .single()
            planId = inserted?.id
          }

          results.push({ week_start: week.week_start, status: 'created', plan_id: planId })
        } catch (err) {
          console.error(`Week ${week.week_start} generation error:`, err)
          results.push({ week_start: week.week_start, status: 'error' })
        }
      }

      const skipped = weeks.filter(w => existingSet.has(w.week_start) && !body.force).length
      return NextResponse.json({
        total_weeks: weeks.length,
        generated: results.filter(r => r.status === 'created').length,
        skipped: skipped + results.filter(r => r.status === 'skipped').length,
        errors: results.filter(r => r.status === 'error').length,
        results,
      })
    }

    // ── 모드 2: 계획 승인 ─────────────────────────────────────────────
    if (body.mode === 'approve' && body.plan_id) {
      const { data: plan } = await admin
        .from('weekly_plans')
        .select('*')
        .eq('id', body.plan_id)
        .eq('project_id', id)
        .single()

      if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

      const finalContent = plan.vendor_modified || plan.ai_draft
      const { error } = await admin
        .from('weekly_plans')
        .update({
          status: 'approved',
          final_plan: finalContent,
          founder_approved_at: new Date().toISOString(),
          founder_approved_by: user.id,
        })
        .eq('id', body.plan_id)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  } catch (error) {
    console.error('PUT weekly-plan error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

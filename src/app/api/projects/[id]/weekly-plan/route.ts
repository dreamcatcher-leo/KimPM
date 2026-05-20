import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateWeeklyPlan } from '@/lib/openai/client'
import { notifyWeeklyPlan } from '@/lib/discord/webhook'
import type { Feature } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { week_start, week_end, feature_ids } = await request.json()
    const admin = createAdminClient()

    const { data: project } = await admin.from('projects').select('*').eq('id', id).single()
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const { data: features } = await admin
      .from('features')
      .select('*')
      .in('id', feature_ids || []) as { data: Feature[] | null }

    const planJson = await generateWeeklyPlan(
      features || [],
      week_start,
      week_end,
      project.goal
    )

    const planContent = JSON.parse(planJson)

    // Upsert plan
    const existing = await admin
      .from('weekly_plans')
      .select('id')
      .eq('project_id', id)
      .eq('week_start', week_start)
      .single()

    let plan
    if (existing.data) {
      const { data } = await admin
        .from('weekly_plans')
        .update({
          ai_draft: planContent,
          status: 'draft',
          planned_features: feature_ids || [],
        })
        .eq('id', existing.data.id)
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
          planned_features: feature_ids || [],
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

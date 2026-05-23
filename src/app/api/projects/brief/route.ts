import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateFounderBrief } from '@/lib/openai/client'

// POST: 수동으로 Founder Daily Brief 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { projectId } = await request.json()
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

    const admin = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    const { data: project } = await admin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const [
      { data: reports },
      { data: mustChecks },
      { data: decisions },
      { data: risks },
    ] = await Promise.all([
      admin.from('reports').select('*').eq('project_id', projectId).eq('report_date', today),
      admin.from('must_check_items').select('title, trigger_type').eq('project_id', projectId).eq('is_resolved', false),
      admin.from('decisions').select('title, decision_type').eq('project_id', projectId).eq('status', 'pending'),
      admin.from('risks').select('title, level').eq('project_id', projectId).eq('is_resolved', false),
    ])

    const briefData = await generateFounderBrief(
      project.name,
      reports || [],
      mustChecks || [],
      decisions || [],
      risks || []
    )

    // 기존 오늘 브리프 삭제 후 새로 저장
    await admin.from('founder_daily_briefs').delete().eq('project_id', projectId).eq('brief_date', today)

    const { data: brief, error } = await admin
      .from('founder_daily_briefs')
      .insert({
        project_id: projectId,
        brief_date: today,
        key_signals: briefData.key_signals,
        report_summary: briefData.report_summary,
        full_content: briefData.full_content,
        must_check_items: mustChecks || [],
        pending_decisions: decisions || [],
        open_risks: risks || [],
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ brief })
  } catch (error) {
    console.error('Brief generation error:', error)
    return NextResponse.json({ error: 'Failed to generate brief' }, { status: 500 })
  }
}

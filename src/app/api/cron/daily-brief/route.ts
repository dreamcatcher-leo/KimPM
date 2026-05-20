import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateFounderBrief } from '@/lib/openai/client'
import { sendFounderBrief } from '@/lib/discord/webhook'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5) // HH:MM

  // Get active projects that have their brief time now (±15 min window)
  const { data: projects } = await admin
    .from('projects')
    .select('*')
    .eq('status', 'active')

  const results = []

  for (const project of projects || []) {
    try {
      const briefTime = project.brief_send_time?.slice(0, 5) || '09:00'
      const [bHour, bMin] = briefTime.split(':').map(Number)
      const [cHour, cMin] = currentTime.split(':').map(Number)
      const diff = Math.abs((bHour * 60 + bMin) - (cHour * 60 + cMin))

      if (diff > 15) continue // Skip if not within 15 min window

      // Check if already sent today
      const { data: existing } = await admin
        .from('founder_daily_briefs')
        .select('id')
        .eq('project_id', project.id)
        .eq('brief_date', today)
        .single()

      if (existing) continue

      // Fetch data
      const [
        { data: reports },
        { data: mustChecks },
        { data: decisions },
        { data: risks },
      ] = await Promise.all([
        admin.from('reports').select('*').eq('project_id', project.id).eq('report_date', today),
        admin.from('must_check_items').select('title, trigger_type').eq('project_id', project.id).eq('is_resolved', false),
        admin.from('decisions').select('title, decision_type').eq('project_id', project.id).eq('status', 'pending'),
        admin.from('risks').select('title, level').eq('project_id', project.id).eq('is_resolved', false),
      ])

      const briefData = await generateFounderBrief(
        project.name,
        reports || [],
        mustChecks || [],
        decisions || [],
        risks || []
      )

      const mustCheckItems = (mustChecks || []).slice(0, 3).map((m: { title: string; trigger_type: string }) => ({
        id: '',
        title: m.title,
        trigger_type: m.trigger_type,
      }))

      const decisionItems = (decisions || []).slice(0, 3).map((d: { title: string; decision_type: string | null }) => ({
        id: '',
        title: d.title,
        decision_type: d.decision_type || '',
      }))

      const { data: brief } = await admin
        .from('founder_daily_briefs')
        .insert({
          project_id: project.id,
          brief_date: today,
          key_signals: briefData.key_signals,
          report_summary: briefData.report_summary,
          must_check_items: mustCheckItems,
          decision_items: decisionItems,
          full_content: briefData.full_content,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single()

      // Send Discord notification
      if (project.discord_webhook_url && brief) {
        await sendFounderBrief(
          project.discord_webhook_url,
          project.id,
          brief.id,
          project.name,
          briefData.report_summary,
          briefData.key_signals as { type: string; title: string; description: string }[],
          mustCheckItems.length,
          decisionItems.length,
          today
        )

        await admin.from('founder_daily_briefs').update({
          discord_message_id: 'sent',
        }).eq('id', brief.id)
      }

      results.push({ project_id: project.id, brief_id: brief?.id })
    } catch (err) {
      console.error(`Failed to generate brief for project ${project.id}:`, err)
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

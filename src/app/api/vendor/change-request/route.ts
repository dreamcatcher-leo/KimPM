import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateChangeRequestRecommendation } from '@/lib/openai/client'
import { notifyChangeRequest } from '@/lib/discord/webhook'

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()
    const { token, ...crData } = body

    const { data: link } = await admin
      .from('access_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (!link) return NextResponse.json({ error: 'Invalid access' }, { status: 403 })

    // Generate AI recommendation
    let aiRecommendation = ''
    try {
      aiRecommendation = await generateChangeRequestRecommendation(
        crData.title,
        crData.content,
        crData.reason,
        crData.schedule_impact || '',
        crData.cost_impact || '',
        crData.alternative || ''
      )
    } catch { /* skip if AI fails */ }

    const { data: cr, error } = await admin
      .from('change_requests')
      .insert({
        project_id: link.project_id,
        access_link_id: link.id,
        title: crData.title,
        content: crData.content,
        reason: crData.reason,
        affected_features: crData.affected_features || null,
        schedule_impact: crData.schedule_impact || null,
        cost_impact: crData.cost_impact || null,
        alternative: crData.alternative || null,
        ai_recommendation: aiRecommendation || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Add to decisions and must-check (실패해도 변경요청 등록은 성공)
    await Promise.allSettled([
      admin.from('decisions').insert({
        project_id: link.project_id,
        title: `변경 요청: ${crData.title}`,
        description: crData.content,
        decision_type: '범위_변경',
        ai_recommendation: aiRecommendation,
      }).then(({ error }) => { if (error) console.warn('decisions insert 건너뜀:', error.message) }),
      admin.from('must_check_items').insert({
        project_id: link.project_id,
        trigger_type: '정책_범위_비용_변경',
        title: `변경 요청 검토 필요: ${crData.title}`,
        description: `외주사가 변경 요청을 제출했습니다.\n사유: ${crData.reason}`,
      }).then(({ error }) => { if (error) console.warn('must_check insert 건너뜀:', error.message) }),
    ])

    // ─── Discord 알림 → mustcheck 채널 (실패해도 무시) ──────────────────
    try {
      const { data: proj } = await admin
        .from('projects')
        .select('discord_webhook_mustcheck, discord_webhook_url')
        .eq('id', link.project_id)
        .single()
      const webhook = proj?.discord_webhook_mustcheck || proj?.discord_webhook_url
      if (webhook) {
        await notifyChangeRequest(
          webhook,
          link.project_id,
          crData.title,
          crData.content,
          crData.reason,
          crData.schedule_impact ?? null
        )
      }
    } catch (dErr) {
      console.warn('Discord change-request 알림 건너뜀:', dErr)
    }

    return NextResponse.json({ change_request: cr })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

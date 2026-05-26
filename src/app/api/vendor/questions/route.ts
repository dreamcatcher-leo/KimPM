import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { notifyQuestion } from '@/lib/discord/webhook'

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()

    // access_link 검증
    const { data: link } = await admin
      .from('access_links')
      .select('id, is_active, project_id')
      .eq('id', body.access_link_id)
      .eq('is_active', true)
      .single()

    if (!link) return NextResponse.json({ error: 'Invalid access' }, { status: 403 })

    // ─── questions 테이블 insert ───────────────────────────────────────────
    // 1차 시도: 확장 컬럼 포함
    const insertPayload: Record<string, unknown> = {
      project_id: body.project_id,
      access_link_id: body.access_link_id,
      feature_id: body.feature_id || null,
      question: body.question,
      context: body.context || null,
    }

    if (body.question_type)     insertPayload.question_type     = body.question_type
    if (body.answer_needed_by)  insertPayload.answer_needed_by  = body.answer_needed_by
    if (body.schedule_impact)   insertPayload.schedule_impact   = body.schedule_impact
    if (body.default_assumption) insertPayload.default_assumption = body.default_assumption

    let question: Record<string, unknown> | null = null

    const { data: q1, error: e1 } = await admin
      .from('questions')
      .insert(insertPayload)
      .select()
      .single()

    if (e1) {
      if (e1.code === '42703') {
        // 확장 컬럼 없음 → 기본 컬럼만으로 재시도
        const { data: q2, error: e2 } = await admin
          .from('questions')
          .insert({
            project_id: body.project_id,
            access_link_id: body.access_link_id,
            feature_id: body.feature_id || null,
            question: body.question,
            context: body.context || null,
          })
          .select()
          .single()
        if (e2) throw e2
        question = q2
      } else {
        throw e1
      }
    } else {
      question = q1
    }

    // ─── decisions 테이블 insert (실패해도 질문 등록은 성공) ───────────────
    try {
      const scheduleNote =
        body.schedule_impact && body.schedule_impact !== '없음'
          ? ` [일정영향: ${body.schedule_impact}]`
          : ''
      await admin.from('decisions').insert({
        project_id: body.project_id,
        title: `외주사 협의 요청${scheduleNote}: ${body.question.slice(0, 50)}`,
        description:
          body.question +
          (body.default_assumption
            ? `\n\n기본 가정: ${body.default_assumption}`
            : ''),
        decision_type: '외주사_질문',
      })
    } catch (decErr) {
      // decisions 삽입 실패는 무시 (컬럼 없거나 제약조건 문제)
      console.warn('decisions insert 건너뜀:', decErr)
    }

    // ─── must_check_items 등록 (실패해도 무시) ─────────────────────────────
    try {
      const impact = body.schedule_impact && body.schedule_impact !== '없음'
      await admin.from('must_check_items').insert({
        project_id: body.project_id,
        trigger_type: impact ? '일정_리스크' : '외주사_협의',
        title: `외주사 질문${impact ? ` [일정영향 ${body.schedule_impact}]` : ''}: ${body.question.slice(0, 40)}`,
        description: body.question,
      })
    } catch (mcErr) {
      console.warn('must_check insert 건너뜀:', mcErr)
    }

    // ─── Discord 알림 → mustcheck 채널 (실패해도 무시) ──────────────────
    try {
      const { data: proj } = await admin
        .from('projects')
        .select('discord_webhook_mustcheck, discord_webhook_url, name')
        .eq('id', body.project_id)
        .single()
      const webhook = proj?.discord_webhook_mustcheck || proj?.discord_webhook_url
      if (webhook) {
        // feature_id 있으면 기능명 조회
        let featureName: string | null = null
        if (body.feature_id) {
          const { data: feat } = await admin
            .from('features')
            .select('name')
            .eq('id', body.feature_id)
            .single()
          featureName = feat?.name || null
        }
        await notifyQuestion(
          webhook,
          body.project_id,
          body.question,
          body.schedule_impact ?? null,
          featureName
        )
      }
    } catch (dErr) {
      console.warn('Discord question 알림 건너뜀:', dErr)
    }

    return NextResponse.json({ question })
  } catch (error) {
    console.error('questions API error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

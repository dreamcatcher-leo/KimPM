import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()

    const { data: link } = await admin
      .from('access_links')
      .select('id, is_active')
      .eq('id', body.access_link_id)
      .eq('is_active', true)
      .single()

    if (!link) return NextResponse.json({ error: 'Invalid access' }, { status: 403 })

    // 기본 필드로 먼저 시도, 확장 필드(question_type 등)가 없어도 graceful 처리
    const insertPayload: Record<string, unknown> = {
      project_id: body.project_id,
      access_link_id: body.access_link_id,
      feature_id: body.feature_id || null,
      question: body.question,
      context: body.context || null,
    }

    // 확장 필드: DB 컬럼이 있는 경우에만 추가 (컬럼 없으면 무시됨)
    if (body.question_type) insertPayload.question_type = body.question_type
    if (body.answer_needed_by) insertPayload.answer_needed_by = body.answer_needed_by
    if (body.schedule_impact) insertPayload.schedule_impact = body.schedule_impact
    if (body.default_assumption) insertPayload.default_assumption = body.default_assumption

    const { data: question, error } = await admin
      .from('questions')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      // 확장 컬럼 없어서 에러 난 경우 기본 필드만으로 재시도
      if (error.code === '42703') {
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

        await admin.from('decisions').insert({
          project_id: body.project_id,
          title: `외주사 질문: ${body.question.slice(0, 50)}`,
          description: body.question,
          decision_type: '외주사_질문',
        })
        return NextResponse.json({ question: q2 })
      }
      throw error
    }

    // Create decision for founder review
    const scheduleNote = body.schedule_impact && body.schedule_impact !== '없음'
      ? ` [일정영향: ${body.schedule_impact}]`
      : ''
    await admin.from('decisions').insert({
      project_id: body.project_id,
      title: `외주사 협의 요청${scheduleNote}: ${body.question.slice(0, 50)}`,
      description: body.question + (body.default_assumption ? `\n\n기본 가정: ${body.default_assumption}` : ''),
      decision_type: '외주사_질문',
    })

    return NextResponse.json({ question })
  } catch (error) {
    console.error('questions API error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

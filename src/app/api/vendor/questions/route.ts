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

    const { data: question, error } = await admin
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

    if (error) throw error

    // Create decision for founder review
    await admin.from('decisions').insert({
      project_id: body.project_id,
      title: `외주사 질문: ${body.question.slice(0, 50)}...`,
      description: body.question,
      decision_type: '외주사_질문',
    })

    return NextResponse.json({ question })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

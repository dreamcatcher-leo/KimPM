import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateSpec } from '@/lib/openai/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: feature } = await supabase
      .from('features')
      .select(`*, projects(goal, name)`)
      .eq('id', id)
      .single()

    if (!feature) return NextResponse.json({ error: 'Feature not found' }, { status: 404 })

    const projectGoal = (feature.projects as { goal: string })?.goal || ''
    const rawContent = await generateSpec(feature, projectGoal)

    const admin = createAdminClient()

    // Parse raw content into structured fields
    const parsed = parseSpecContent(rawContent)

    const { data: spec, error } = await admin
      .from('specs')
      .insert({
        feature_id: id,
        version: 1,
        status: 'draft',
        raw_content: rawContent,
        feature_name: feature.name,
        ...parsed,
      })
      .select()
      .single()

    if (error) throw error

    // Update feature status
    await admin.from('features').update({ status: 'spec_draft' }).eq('id', id)

    return NextResponse.json({ spec })
  } catch (error) {
    console.error('Error generating spec:', error)
    return NextResponse.json({ error: 'Failed to generate spec' }, { status: 500 })
  }
}

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

    const { data: spec, error } = await admin
      .from('specs')
      .update(body)
      .eq('feature_id', id)
      .eq('status', 'draft')
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ spec })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update spec' }, { status: 500 })
  }
}

function parseSpecContent(raw: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const sectionMap: Record<string, string> = {
    '기능 배경': 'background',
    '현재 문제': 'current_problem',
    '관련 사용자': 'related_users',
    '포함 범위': 'in_scope',
    '제외 범위': 'out_of_scope',
    '화면 흐름': 'screen_flow',
    '상태값': 'state_values',
    '알림 조건': 'notification_conditions',
    '어드민 기능': 'admin_features',
    '데이터 항목': 'data_items',
    '예외 케이스': 'edge_cases',
    '수용 기준': 'acceptance_criteria',
    'QA 체크리스트': 'qa_checklist_raw',
    '외주사 예상 질문': 'vendor_expected_questions',
    '기본 답변 초안': 'vendor_answer_drafts',
  }

  Object.entries(sectionMap).forEach(([heading, field]) => {
    const regex = new RegExp(`## ${heading}[^\n]*\n([\\s\\S]*?)(?=\n## |$)`, 'i')
    const match = raw.match(regex)
    if (match) {
      sections[field] = match[1].trim()
    }
  })

  return sections
}

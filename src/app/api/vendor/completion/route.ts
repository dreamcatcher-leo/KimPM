import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { notifyCompletion } from '@/lib/discord/webhook'

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()
    const { token, project_id, access_link_id, feature_id, summary, vendor_note } = body

    // 토큰 검증
    const { data: link } = await admin
      .from('access_links')
      .select('*, projects(name, discord_webhook_url)')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (!link) {
      return NextResponse.json({ error: '유효하지 않은 접근입니다.' }, { status: 403 })
    }

    if (!feature_id || !summary) {
      return NextResponse.json({ error: '기능과 완료 요약은 필수입니다.' }, { status: 400 })
    }

    // 기능 정보 조회
    const { data: feature } = await admin
      .from('features')
      .select('order_key, name, priority')
      .eq('id', feature_id)
      .single()

    if (!feature) {
      return NextResponse.json({ error: '기능을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 이미 pending/approved 상태의 완료 후보가 있는지 확인
    const { data: existing } = await admin
      .from('completion_candidates')
      .select('id, status')
      .eq('feature_id', feature_id)
      .in('status', ['pending', 'approved'])
      .single()

    if (existing) {
      return NextResponse.json(
        { error: '이미 완료 검토 중인 항목이 있습니다.' },
        { status: 409 }
      )
    }

    // 완료 후보 등록
    const { data: completion, error } = await admin
      .from('completion_candidates')
      .insert({
        project_id,
        feature_id,
        access_link_id: link.id,
        summary,
        vendor_note: vendor_note || null,
        status: 'pending',
        evidence_ids: [],
        qa_results: {},
      })
      .select()
      .single()

    if (error) {
      console.error('completion insert error:', error)
      return NextResponse.json({ error: '등록에 실패했습니다.' }, { status: 500 })
    }

    // Must-Check 자동 등록 (완료 후보 제출 시)
    await admin.from('must_check_items').insert({
      project_id,
      trigger_type: 'completion_submitted',
      title: `완료 검토 요청: ${feature.order_key} ${feature.name}`,
      description: `외주사가 완료를 제출했습니다. 검토 후 승인/반려 처리가 필요합니다.\n\n**외주사 요약:**\n${summary}${vendor_note ? `\n\n**메모:** ${vendor_note}` : ''}`,
      related_id: completion.id,
      related_type: 'completion_candidate',
      is_resolved: false,
    })

    // 의사결정함에 등록
    await admin.from('decisions').insert({
      project_id,
      title: `완료 승인 필요: ${feature.order_key} ${feature.name}`,
      context: `외주사가 ${feature.name} 기능의 완료를 제출했습니다.\n\n**완료 요약:**\n${summary}${vendor_note ? `\n\n**외주사 메모:** ${vendor_note}` : ''}`,
      options: [
        { label: '승인', description: '완료로 확정하고 다음 단계 진행' },
        { label: '반려', description: '보완 사항을 전달하고 재작업 요청' },
        { label: '조건부 승인', description: '추가 수정을 전제로 임시 승인' },
      ],
      status: 'pending',
      related_id: completion.id,
      related_type: 'completion_candidate',
    })

    // Discord 알림
    const projectName = (link.projects as { name: string; discord_webhook_url: string | null } | null)?.name || '프로젝트'
    const webhookUrl = (link.projects as { name: string; discord_webhook_url: string | null } | null)?.discord_webhook_url

    if (webhookUrl) {
      try {
        await notifyCompletion(
          webhookUrl,
          feature.name,
          link.vendor_name || projectName,
          `[${feature.order_key}] ${summary}`
        )
      } catch (discordError) {
        console.error('Discord notification failed:', discordError)
        // Discord 알림 실패해도 성공 처리
      }
    }

    return NextResponse.json({ success: true, id: completion.id })
  } catch (error) {
    console.error('vendor completion error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const projectId = searchParams.get('project_id')

    if (!token || !projectId) {
      return NextResponse.json({ error: '필수 파라미터가 없습니다.' }, { status: 400 })
    }

    // 토큰 검증
    const { data: link } = await admin
      .from('access_links')
      .select('id')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (!link) {
      return NextResponse.json({ error: '유효하지 않은 접근입니다.' }, { status: 403 })
    }

    const { data: completions, error } = await admin
      .from('completion_candidates')
      .select('*, features(order_key, name)')
      .eq('project_id', projectId)
      .eq('access_link_id', link.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: '조회 실패' }, { status: 500 })
    }

    return NextResponse.json(completions)
  } catch (error) {
    console.error('vendor completion GET error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

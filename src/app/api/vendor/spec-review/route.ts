// 외주사 → 기능 정의서 수정 제안 제출
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { notifyMustCheck } from '@/lib/discord/webhook'

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()
    const { spec_id, project_id, review, feature_name } = body

    if (!spec_id || !review?.trim()) {
      return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
    }

    // spec 조회
    const { data: spec } = await admin
      .from('specs')
      .select('id, feature_id, vendor_answer_drafts')
      .eq('id', spec_id)
      .single()

    if (!spec) return NextResponse.json({ error: 'Spec not found' }, { status: 404 })

    const now = new Date()
    const dateLabel = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })

    // vendor_answer_drafts에 수정 제안 블록 추가
    const suggestionBlock = `\n\n---\n[외주사 수정 제안 — ${dateLabel}]\n${review.trim()}`
    const updatedDrafts = (spec.vendor_answer_drafts || '') + suggestionBlock

    // viewed_at + vendor_answer_drafts 업데이트 (graceful)
    const { error: updateErr } = await admin
      .from('specs')
      .update({ vendor_answer_drafts: updatedDrafts, viewed_at: now.toISOString() })
      .eq('id', spec_id)

    if (updateErr) {
      // viewed_at 컬럼 없으면 vendor_answer_drafts만 업데이트
      if (updateErr.code === '42703') {
        await admin
          .from('specs')
          .update({ vendor_answer_drafts: updatedDrafts })
          .eq('id', spec_id)
      } else {
        throw updateErr
      }
    }

    // Must-Check 생성 — 대표에게 수정 제안 알림
    const pid = project_id
    if (pid) {
      try {
        await admin.from('must_check_items').insert({
          project_id: pid,
          trigger_type: '외주사_확인_요청',
          title: `기능 정의서 수정 제안: ${feature_name || '기능'}`,
          description: `외주사가 기능 정의서에 수정 제안을 제출했습니다.\n\n제안 내용:\n${review.trim()}`,
        })
      } catch (mcErr) {
        console.warn('must_check insert 건너뜀:', mcErr)
      }

      // Discord 의사결정 채널 알림
      try {
        const { data: proj } = await admin
          .from('projects')
          .select('discord_webhook_decision, discord_webhook_url')
          .eq('id', pid)
          .single()
        const webhook = proj?.discord_webhook_decision || proj?.discord_webhook_url
        if (webhook) {
          await notifyMustCheck(
            webhook,
            pid,
            `기능 정의서 수정 제안: ${feature_name || '기능'}`,
            '외주사_확인_요청',
            `외주사가 기능 정의서에 수정 제안을 제출했습니다.\n${review.trim().slice(0, 100)}...`
          )
        }
      } catch (dErr) {
        console.warn('Discord spec-review 알림 건너뜀:', dErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('spec-review error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// 외주사 열람 기록 (viewed_at) — 사용 안 됨, 호환 유지
export async function PATCH(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()
    const { spec_id } = body

    try {
      await admin
        .from('specs')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', spec_id)
        .is('viewed_at', null)
    } catch {
      // viewed_at 컬럼 없으면 무시
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/projects/[id]
 * 프로젝트 설정 업데이트
 * - admin client 미사용 (service_role key 의존 제거)
 * - 일반 supabase client + RLS 로 founder_id 검증
 * - 컬럼을 개별 그룹으로 분리해서 없는 컬럼 때문에 전체 실패 방지
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // ── 1단계: 초기 스키마에 반드시 존재하는 핵심 컬럼 ─────────────────────
    const coreFields: Record<string, unknown> = {}
    const CORE = ['name', 'description', 'goal', 'contract_start', 'contract_end', 'contract_amount', 'status']
    for (const k of CORE) {
      if (k in body) coreFields[k] = body[k]
    }

    const { data: project, error: coreError } = await supabase
      .from('projects')
      .update(coreFields)
      .eq('id', id)
      .eq('founder_id', user.id)   // RLS: 본인 프로젝트만
      .select()
      .single()

    if (coreError) {
      console.error('[PATCH projects] core 실패:', coreError.code, coreError.message)
      return NextResponse.json({ error: coreError.message }, { status: 500 })
    }

    // ── 2단계: 추가 컬럼들 — 각각 독립 try-catch ────────────────────────────
    const extraGroups = [
      // 구 단일 웹훅 컬럼 (초기부터 존재할 가능성 높음)
      ['discord_webhook_url', 'discord_channel_id'],
      // 시간 설정 컬럼
      ['brief_send_time', 'vendor_report_reminder_time'],
      // discord 신규 컬럼 (migration 002 필요)
      ['discord_webhook_daily', 'discord_webhook_mustcheck'],
      // discord deprecated 컬럼
      ['discord_webhook_risk', 'discord_webhook_decision'],
    ]

    for (const group of extraGroups) {
      const groupData: Record<string, unknown> = {}
      for (const k of group) {
        if (k in body) groupData[k] = body[k] ?? null
      }
      if (Object.keys(groupData).length === 0) continue
      try {
        const { error } = await supabase
          .from('projects')
          .update(groupData)
          .eq('id', id)
          .eq('founder_id', user.id)
        if (error) {
          console.warn(`[PATCH projects] 그룹 [${group.join(',')}] 실패 (컬럼 미존재 가능):`, error.message)
        }
      } catch (e) {
        console.warn(`[PATCH projects] 그룹 [${group.join(',')}] 예외:`, e)
      }
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('[PATCH projects] 최상위 예외:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

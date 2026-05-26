import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/projects/[id]
 * 프로젝트 설정 업데이트
 * - 1단계: 확실히 존재하는 핵심 컬럼만 업데이트
 * - 2단계: discord 신규 컬럼 (daily/mustcheck) — 실패해도 warn만
 * - 3단계: deprecated discord 컬럼 (risk/decision) — 실패해도 warn만
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
    const admin = createAdminClient()

    // ── 확실히 존재하는 핵심 컬럼만 추출 ──────────────────────────────────
    const SAFE_COLUMNS = [
      'name', 'description', 'goal',
      'contract_start', 'contract_end', 'contract_amount',
      'discord_webhook_url', 'discord_channel_id',
      'brief_send_time', 'vendor_report_reminder_time',
      'status',
    ] as const

    const coreData: Record<string, unknown> = {}
    for (const col of SAFE_COLUMNS) {
      if (col in body) coreData[col] = body[col]
    }

    // ── 1단계: 핵심 컬럼 업데이트 ─────────────────────────────────────────
    const { data: project, error: coreError } = await admin
      .from('projects')
      .update(coreData)
      .eq('id', id)
      .eq('founder_id', user.id)
      .select()
      .single()

    if (coreError) {
      console.error('[PATCH projects] core update error:', coreError)
      return NextResponse.json({ error: coreError.message }, { status: 500 })
    }

    // ── 2단계: discord 신규 컬럼 (migration 002 필요) ─────────────────────
    const discordNew: Record<string, unknown> = {}
    if ('discord_webhook_daily' in body) discordNew.discord_webhook_daily = body.discord_webhook_daily ?? null
    if ('discord_webhook_mustcheck' in body) discordNew.discord_webhook_mustcheck = body.discord_webhook_mustcheck ?? null

    if (Object.keys(discordNew).length > 0) {
      try {
        const { error } = await admin.from('projects').update(discordNew).eq('id', id)
        if (error) console.warn('[PATCH projects] discord 신규 컬럼 업데이트 실패 (migration 002 미실행 가능):', error.message)
      } catch (e) {
        console.warn('[PATCH projects] discord 신규 컬럼 예외:', e)
      }
    }

    // ── 3단계: deprecated discord 컬럼 (risk/decision) ────────────────────
    const discordDeprecated: Record<string, unknown> = {}
    if ('discord_webhook_risk' in body) discordDeprecated.discord_webhook_risk = body.discord_webhook_risk ?? null
    if ('discord_webhook_decision' in body) discordDeprecated.discord_webhook_decision = body.discord_webhook_decision ?? null

    if (Object.keys(discordDeprecated).length > 0) {
      try {
        const { error } = await admin.from('projects').update(discordDeprecated).eq('id', id)
        if (error) console.warn('[PATCH projects] discord deprecated 컬럼 업데이트 실패:', error.message)
      } catch (e) {
        console.warn('[PATCH projects] discord deprecated 컬럼 예외:', e)
      }
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('[PATCH projects] 예외:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

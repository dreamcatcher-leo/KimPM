import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/projects/[id]
 * 프로젝트 설정 업데이트 — discord_webhook_daily/mustcheck 컬럼 포함
 * 컬럼 미존재 시 fallback 처리 (PGRST204 방어)
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

    // discord_webhook_daily / mustcheck 분리
    const {
      discord_webhook_daily,
      discord_webhook_mustcheck,
      ...coreData
    } = body

    const admin = createAdminClient()

    // 1단계: 핵심 데이터 업데이트 (항상 안전한 컬럼만)
    const { data: project, error: coreError } = await admin
      .from('projects')
      .update(coreData)
      .eq('id', id)
      .eq('founder_id', user.id)
      .select()
      .single()

    if (coreError) {
      console.error('[PATCH /api/projects/[id]] core update error:', coreError)
      return NextResponse.json({ error: coreError.message }, { status: 500 })
    }

    // 2단계: discord 채널 컬럼 업데이트 (컬럼 없으면 warn만)
    if (discord_webhook_daily !== undefined || discord_webhook_mustcheck !== undefined) {
      try {
        const discordPayload: Record<string, string | null> = {}
        if (discord_webhook_daily !== undefined) {
          discordPayload.discord_webhook_daily = discord_webhook_daily || null
        }
        if (discord_webhook_mustcheck !== undefined) {
          discordPayload.discord_webhook_mustcheck = discord_webhook_mustcheck || null
        }

        const { error: discordError } = await admin
          .from('projects')
          .update(discordPayload)
          .eq('id', id)

        if (discordError) {
          // PGRST204 = 컬럼 없음 → warn 후 계속
          console.warn('[PATCH /api/projects/[id]] discord webhook 컬럼 업데이트 실패 (컬럼 미존재 가능):', discordError.message)
        }
      } catch (discordErr) {
        console.warn('[PATCH /api/projects/[id]] discord webhook 2단계 예외:', discordErr)
      }
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('[PATCH /api/projects/[id]] 예외:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

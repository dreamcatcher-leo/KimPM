import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  sendFounderBrief,
  notifyQuestion,
  notifyChangeRequest,
  notifyCompletion,
  notifyWeeklyPlan,
} from '@/lib/discord/webhook'

/**
 * POST /api/discord/send-test
 * 더미데이터로 Discord 웹훅 실제 발송 테스트
 * body: {
 *   projectId: string,
 *   type: 'founder_brief'|'question'|'change_request'|'completion'|'weekly_plan'|'all',
 *   // URL을 직접 넘겨서 DB SELECT 없이 동작 (컬럼 미존재 방어)
 *   dailyUrl?: string,
 *   mustcheckUrl?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { projectId, type = 'all', dailyUrl: clientDailyUrl, mustcheckUrl: clientMustcheckUrl } = body

    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

    // 프론트에서 URL을 직접 넘긴 경우 우선 사용 (DB 컬럼 미존재 방어)
    let dailyUrl: string | null = clientDailyUrl || null
    let mustcheckUrl: string | null = clientMustcheckUrl || null

    // 프론트에서 URL을 안 넘긴 경우 → DB에서 조회 (안전 컬럼만 SELECT)
    if (!dailyUrl && !mustcheckUrl) {
      const { data: project } = await supabase
        .from('projects')
        .select('id, name, discord_webhook_url')
        .eq('id', projectId)
        .eq('founder_id', user.id)
        .single()

      if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

      // migration 002 실행 후에는 daily/mustcheck 컬럼도 읽기 시도
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: extProject } = await supabase
          .from('projects')
          .select('discord_webhook_daily, discord_webhook_mustcheck')
          .eq('id', projectId)
          .single() as { data: { discord_webhook_daily?: string | null; discord_webhook_mustcheck?: string | null } | null }

        if (extProject) {
          dailyUrl = extProject.discord_webhook_daily || (project as { discord_webhook_url?: string | null }).discord_webhook_url || null
          mustcheckUrl = extProject.discord_webhook_mustcheck || (project as { discord_webhook_url?: string | null }).discord_webhook_url || null
        }
      } catch {
        // 컬럼 없으면 fallback
        dailyUrl = (project as { discord_webhook_url?: string | null }).discord_webhook_url || null
        mustcheckUrl = (project as { discord_webhook_url?: string | null }).discord_webhook_url || null
      }
    }

    if (!dailyUrl && !mustcheckUrl) {
      return NextResponse.json({
        error: 'Discord 웹훅 URL이 설정되지 않았습니다. 설정 → Discord 알림 설정에서 먼저 웹훅 URL을 입력하고 저장해주세요.',
      }, { status: 400 })
    }

    // project name 조회 (projectId만 사용)
    const { data: projectInfo } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('founder_id', user.id)
      .single()

    const projectName = projectInfo?.name || '테스트 프로젝트'

    const results: { type: string; success: boolean; message: string }[] = []
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kimpm.vercel.app'
    const today = new Date().toISOString().split('T')[0]

    // ── 1. Founder Daily Brief ──────────────────────────────────────────────
    if (type === 'founder_brief' || type === 'all') {
      if (dailyUrl) {
        try {
          const ok = await sendFounderBrief(
            dailyUrl,
            projectId,
            'dummy-brief-id',
            projectName,
            '이번 주 로그인 API 완료, 결제 연동 진행 중. 증빙 자료 2건 첨부됨.',
            [
              { type: 'positive', title: 'P0 기능 2개 완료', description: '로그인/회원가입 기능이 완료되어 검수 대기 중입니다.' },
              { type: 'warning', title: '증빙 자료 부족', description: '이번 주 PR 링크 첨부가 1건 누락되었습니다.' },
              { type: 'critical', title: '결제 API 키 미수신', description: '카카오페이 API 키를 수신하지 못해 결제 연동이 지연되고 있습니다.' },
            ],
            3,
            1,
            today,
            [
              { title: '결제 PG 연동 지연', level: '위험' },
              { title: '증빙 자료 부족', level: '주의' },
            ],
            '카카오페이 API 키 미수신 — 3일째 반복'
          )
          results.push({ type: 'founder_brief', success: ok, message: ok ? '📊 Founder Daily Brief 발송 완료' : '📊 발송 실패' })
        } catch (err) {
          results.push({ type: 'founder_brief', success: false, message: `📊 오류: ${err}` })
        }
      } else {
        results.push({ type: 'founder_brief', success: false, message: '📊 일일보고 채널 URL 미설정' })
      }
    }

    // ── 2. 외주사 질문 ──────────────────────────────────────────────────────
    if (type === 'question' || type === 'all') {
      if (mustcheckUrl) {
        try {
          const ok = await notifyQuestion(
            mustcheckUrl,
            projectId,
            '결제 PG사를 카카오페이로 진행할까요, 아니면 토스페이로 할까요? 연동 공수가 달라져서 일정에 영향이 있습니다.',
            '높음',
            '결제 시스템 연동'
          )
          results.push({ type: 'question', success: ok, message: ok ? '🔴 외주사 질문 알림 발송 완료' : '🔴 발송 실패' })
        } catch (err) {
          results.push({ type: 'question', success: false, message: `🔴 오류: ${err}` })
        }
      } else {
        results.push({ type: 'question', success: false, message: '🔴 Must-Check 채널 URL 미설정' })
      }
    }

    // ── 3. 변경 요청 ────────────────────────────────────────────────────────
    if (type === 'change_request' || type === 'all') {
      if (mustcheckUrl) {
        try {
          const ok = await notifyChangeRequest(
            mustcheckUrl,
            projectId,
            '관리자 대시보드 매출 통계 차트 추가',
            '관리자 페이지에 매출 통계 차트 기능을 추가해달라는 요청이 있습니다.',
            '기존 범위 외 추가 기능 요청',
            '3일 연장 필요'
          )
          results.push({ type: 'change_request', success: ok, message: ok ? '🔴 변경요청 알림 발송 완료' : '🔴 발송 실패' })
        } catch (err) {
          results.push({ type: 'change_request', success: false, message: `🔴 오류: ${err}` })
        }
      } else {
        results.push({ type: 'change_request', success: false, message: '🔴 Must-Check 채널 URL 미설정' })
      }
    }

    // ── 4. 완료 신청 ────────────────────────────────────────────────────────
    if (type === 'completion' || type === 'all') {
      if (mustcheckUrl) {
        try {
          const ok = await notifyCompletion(
            mustcheckUrl,
            projectId,
            '로그인/회원가입',
            '테스트 외주사 (더미)',
            '로그인 기능 구현 완료. 카카오 소셜 로그인 포함. PR #42 검수 요청드립니다.'
          )
          results.push({ type: 'completion', success: ok, message: ok ? '🔴 완료신청 알림 발송 완료' : '🔴 발송 실패' })
        } catch (err) {
          results.push({ type: 'completion', success: false, message: `🔴 오류: ${err}` })
        }
      } else {
        results.push({ type: 'completion', success: false, message: '🔴 Must-Check 채널 URL 미설정' })
      }
    }

    // ── 5. 주간 계획 ────────────────────────────────────────────────────────
    if (type === 'weekly_plan' || type === 'all') {
      if (mustcheckUrl) {
        try {
          const ok = await notifyWeeklyPlan(
            mustcheckUrl,
            projectId,
            'dummy-plan-id',
            APP_URL,
            '2025-05-26',
            '2025-05-30',
            [
              '결제 시스템 카카오페이 API 연동 완료',
              '상품 목록 검색 필터 기능 구현',
              '관리자 대시보드 UI 초안',
            ]
          )
          results.push({ type: 'weekly_plan', success: ok, message: ok ? '🔴 주간계획 알림 발송 완료' : '🔴 발송 실패' })
        } catch (err) {
          results.push({ type: 'weekly_plan', success: false, message: `🔴 오류: ${err}` })
        }
      } else {
        results.push({ type: 'weekly_plan', success: false, message: '🔴 Must-Check 채널 URL 미설정' })
      }
    }

    const successCount = results.filter(r => r.success).length
    return NextResponse.json({
      success: successCount === results.length,
      partial: successCount > 0 && successCount < results.length,
      summary: `${successCount}/${results.length}건 발송 성공`,
      results,
      webhooks: {
        daily: dailyUrl ? `${dailyUrl.slice(0, 50)}...` : '미설정',
        mustcheck: mustcheckUrl ? `${mustcheckUrl.slice(0, 50)}...` : '미설정',
      },
    })
  } catch (error) {
    console.error('[discord/send-test] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

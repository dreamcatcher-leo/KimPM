import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateDailyAssessment } from '@/lib/openai/client'
import { notifyDailyReport, sendFounderBrief } from '@/lib/discord/webhook'
import type { Report } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()
    const {
      project_id, access_link_id, report_date, work_types,
      related_feature_ids, summary, blocker, files_modified,
      conclusion, tomorrow_plan, needs_founder_check,
    } = body

    // 외주사 access 검증
    if (access_link_id) {
      const { data: link } = await admin
        .from('access_links')
        .select('*')
        .eq('id', access_link_id)
        .eq('project_id', project_id)
        .eq('is_active', true)
        .single()

      if (!link) return NextResponse.json({ error: 'Invalid access' }, { status: 403 })
      await admin.from('access_links').update({ last_used_at: new Date().toISOString() }).eq('id', access_link_id)
    }

    // 보고서 저장
    const { data: report, error: reportError } = await admin
      .from('reports')
      .insert({
        project_id, access_link_id, report_date, work_types,
        related_feature_ids: related_feature_ids || [],
        summary, blocker, files_modified, conclusion, tomorrow_plan,
        needs_founder_check: needs_founder_check || false,
      })
      .select()
      .single() as { data: Report | null; error: unknown }

    if (reportError || !report) throw reportError

    // AI 판단에 필요한 컨텍스트 조회
    const [
      { data: specs },
      { data: weeklyPlan },
      { data: previousReports },
      { data: project },
    ] = await Promise.all([
      admin.from('specs').select('*').eq('status', 'approved').in(
        'feature_id',
        related_feature_ids?.length > 0 ? related_feature_ids : ['00000000-0000-0000-0000-000000000000']
      ),
      admin.from('weekly_plans').select('*').eq('project_id', project_id)
        .in('status', ['approved', 'vendor_agreed'])
        .order('week_start', { ascending: false }).limit(1),
      admin.from('reports').select('blocker, summary').eq('project_id', project_id)
        .not('blocker', 'is', null).order('report_date', { ascending: false }).limit(5),
      admin.from('projects')
        .select('discord_webhook_daily, discord_webhook_mustcheck, discord_webhook_url, vendor_name, name')
        .eq('id', project_id).single(),
    ])

    // AI 평가 생성
    const previousBlockers = previousReports
      ?.map((r: { blocker: string | null }) => r.blocker)
      .filter(Boolean) as string[] || []

    const assessment = await generateDailyAssessment(
      report,
      weeklyPlan?.[0] || null,
      specs || [],
      previousBlockers
    )

    const { data: savedAssessment } = await admin
      .from('daily_assessments')
      .insert(assessment)
      .select()
      .single()

    // ── Must-Check 트리거 목록 ──────────────────────────────────────────────
    const mustCheckTriggers = []

    if (needs_founder_check) {
      mustCheckTriggers.push({
        project_id,
        trigger_type: '외주사_확인_요청',
        title: `${report_date}: 외주사 대표 확인 요청`,
        description: `외주사가 오늘 보고에서 대표 확인을 요청했습니다.\n요약: ${summary}`,
        related_report_id: report.id,
      })
    }

    if (savedAssessment?.alignment_signal === '점검_권장') {
      mustCheckTriggers.push({
        project_id,
        trigger_type: '점검_권장_신호',
        title: `${report_date}: 정합성 '점검 권장' 신호`,
        description: savedAssessment.ai_comment || '',
        related_report_id: report.id,
      })
    }

    // 반복 blocker 감지
    let repeatBlocker: string | null = null
    if (blocker && previousBlockers.length >= 2) {
      const sameCount = previousBlockers.filter(b => b && b.includes(blocker.slice(0, 20))).length
      if (sameCount >= 2) {
        repeatBlocker = blocker
        mustCheckTriggers.push({
          project_id,
          trigger_type: '반복_blocker',
          title: `반복 Blocker 감지 (${sameCount + 1}회)`,
          description: `동일한 blocker가 반복 보고되고 있습니다:\n${blocker}`,
          related_report_id: report.id,
        })
      }
    }

    if (mustCheckTriggers.length > 0) {
      try {
        await admin.from('must_check_items').insert(mustCheckTriggers)
      } catch { /* must_check insert 실패 무시 */ }
    }

    // ── AI 리스크 자동 생성 ────────────────────────────────────────────────
    const detectedRisks: { title: string; level: string }[] = []

    if (savedAssessment?.alignment_signal === '점검_권장') {
      try {
        await admin.from('risks').insert({
          project_id,
          risk_type: 'Weekly_Plan_미정합',
          level: '주의',
          title: `${report_date}: 주간 계획 정합성 낮음`,
          description: savedAssessment.ai_comment,
          related_report_id: report.id,
        })
      } catch { /* risks insert 실패 무시 */ }
      detectedRisks.push({ title: '주간 계획 정합성 낮음', level: '주의' })
    }

    // ── Discord 알림 ───────────────────────────────────────────────────────
    // 📊 daily 채널: 보고 링크 + Founder Brief (리스크/blocker 포함)
    const dailyWebhook =
      project?.discord_webhook_daily || project?.discord_webhook_url

    // 🔴 mustcheck 채널: 대표 확인 요청만 (질문/변경요청은 각 API에서 전송)
    const mustcheckWebhook =
      project?.discord_webhook_mustcheck || project?.discord_webhook_url

    if (dailyWebhook) {
      // 보고 링크만 (전문 X)
      await notifyDailyReport(
        dailyWebhook,
        project_id,
        report.id,
        project?.vendor_name || '외주사',
        savedAssessment?.alignment_signal || '주의',
        blocker,
        report_date
      )

      // Founder Brief — AI 요약 + 리스크 + blocker 통합
      const keySignals = savedAssessment?.key_signals || []
      await sendFounderBrief(
        dailyWebhook,
        project_id,
        report.id,
        project?.name || '',
        summary || '(요약 없음)',
        keySignals,
        mustCheckTriggers.length,
        0,
        report_date,
        detectedRisks,
        repeatBlocker
      )
    }

    // 외주사 직접 확인 요청은 Must-Check 채널로 즉시 알림
    if (mustcheckWebhook && needs_founder_check) {
      await notifyMustCheckDirect(
        mustcheckWebhook,
        project_id,
        report_date,
        summary
      )
    }

    return NextResponse.json({
      report,
      assessment: savedAssessment,
      must_check_count: mustCheckTriggers.length,
    })
  } catch (error) {
    console.error('Error creating report:', error)
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
  }
}

// 외주사가 "대표 확인 요청" 버튼을 누른 경우 Must-Check 채널로 전송
async function notifyMustCheckDirect(
  webhookUrl: string,
  projectId: string,
  reportDate: string,
  summary: string
) {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `@here **🙋 외주사 대표 직접 확인 요청**`,
        embeds: [{
          title: `${reportDate} 보고 — 외주사 확인 요청`,
          description: summary?.slice(0, 300) || '',
          color: 0xef4444,
          fields: [{
            name: '🔗 보고 확인',
            value: `[웹앱에서 보기](${process.env.NEXT_PUBLIC_APP_URL || ''}/projects/${projectId}/reports)`,
            inline: false,
          }],
          footer: { text: '김PM — 외주사가 직접 확인을 요청했습니다' },
          timestamp: new Date().toISOString(),
        }],
      }),
    })
  } catch { /* 알림 실패는 무시 */ }
}

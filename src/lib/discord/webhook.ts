// Discord Webhook Integration
// =====================================================
// 최종 2채널 구조
//
//  📊 daily (일일보고 채널) — 오전 9시 고정, 정보성
//     - notifyDailyReport    : 외주사 보고 링크만 전송 (전문 X)
//     - sendFounderBrief     : AI 요약 + 리스크/blocker 포함 브리프
//     - notifyVendorReportReminder : 보고 독려
//
//  🔴 mustcheck (Must-Check 채널) — 발생 즉시, @here 멘션
//     대표가 외주사와 직접 협의해야 하는 모든 항목
//     - notifyQuestion       : 외주사 질문 (일정영향 무관 전부)
//     - notifyChangeRequest  : 외주사 변경 요청
//     - notifySpecReview     : 기능 정의서 수정 제안
//     - notifyCompletion     : 기능 완료 신청 (확인/승인 필요)
//     - notifyWeeklyPlan     : 주간 계획 공유 (동의 필요)
// =====================================================

export interface DiscordWebhooks {
  /** 📊 일일보고 채널 (Founder Brief + AI 리스크, 오전 9시) */
  daily?: string | null
  /** 🔴 Must-Check 채널 (외주사 협의 전 항목, 즉시 @here) */
  mustcheck?: string | null
  // ── 구버전 호환 필드 (deprecated) ──
  /** @deprecated mustcheck로 통합됨 */
  decision?: string | null
  /** @deprecated daily로 통합됨 */
  risk?: string | null
}

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string }
  timestamp?: string
}

interface DiscordMessage {
  content?: string
  embeds?: DiscordEmbed[]
  username?: string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'

const COLORS = {
  green:  0x22c55e,
  yellow: 0xeab308,
  red:    0xef4444,
  blue:   0x3b82f6,
  purple: 0x8b5cf6,
  gray:   0x6b7280,
  orange: 0xf97316,
}

async function sendWebhook(webhookUrl: string, message: DiscordMessage): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    return res.ok
  } catch (err) {
    console.error('Discord webhook error:', err)
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 📊 DAILY 채널 — 외주사 보고 수신 (링크만, 전문 X)
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyDailyReport(
  webhookUrl: string,
  projectId: string,
  reportId: string,
  vendorName: string,
  alignmentSignal: string,   // 정상 | 주의 | 점검_권장
  blocker: string | null,
  reportDate: string
): Promise<boolean> {
  const signalColor =
    alignmentSignal === '정상'     ? COLORS.green  :
    alignmentSignal === '주의'     ? COLORS.yellow :
    COLORS.red

  const signalEmoji =
    alignmentSignal === '정상'     ? '✅' :
    alignmentSignal === '주의'     ? '⚠️' :
    '🔴'

  // 전문은 링크로만 — Founder Brief가 재해석본을 보내므로 중복 불필요
  const message: DiscordMessage = {
    embeds: [{
      title: `📋 ${reportDate} 일일 보고 접수 — ${vendorName}`,
      color: signalColor,
      fields: [
        {
          name: '정합성 신호',
          value: `${signalEmoji} ${alignmentSignal}`,
          inline: true,
        },
        ...(blocker ? [{
          name: '⚡ Blocker',
          value: blocker.slice(0, 200),
          inline: false,
        }] : []),
        {
          name: '🔗 보고 전문 보기',
          value: `[웹앱에서 확인](${APP_URL}/projects/${projectId}/reports#${reportId})`,
          inline: false,
        },
      ],
      footer: { text: '김PM — 상세 내용은 링크에서 확인하세요' },
      timestamp: new Date().toISOString(),
    }],
  }

  return sendWebhook(webhookUrl, message)
}

// ─────────────────────────────────────────────────────────────────────────────
// 📊 DAILY 채널 — Founder Daily Brief (AI 요약 + 리스크/blocker 통합)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendFounderBrief(
  webhookUrl: string,
  projectId: string,
  briefId: string,
  projectName: string,
  reportSummary: string,         // AI 요약본
  keySignals: { type: string; title: string; description: string }[],
  mustCheckCount: number,        // 오늘 Must-Check 누적 건수
  decisionCount: number,
  briefDate: string,
  risks: { title: string; level: string }[],    // AI 감지 리스크 목록
  repeatBlocker: string | null                  // 반복 blocker 내용
): Promise<boolean> {
  const hasCritical = keySignals.some(s => s.type === 'critical')
  const hasRisk     = risks.length > 0 || !!repeatBlocker
  const overallColor =
    hasCritical ? COLORS.red    :
    hasRisk     ? COLORS.yellow :
    COLORS.green

  const signalFields = keySignals.map(s => ({
    name: `${s.type === 'positive' ? '✅' : s.type === 'warning' ? '⚠️' : '🔴'} ${s.title}`,
    value: s.description,
    inline: false,
  }))

  // 리스크 필드 (있을 때만)
  const riskField = hasRisk ? [{
    name: '🔍 AI 감지 리스크',
    value: [
      ...risks.map(r => `${r.level === '위험' ? '🔴' : '🟡'} ${r.title}`),
      ...(repeatBlocker ? [`🔁 반복 Blocker: ${repeatBlocker.slice(0, 80)}`] : []),
    ].join('\n'),
    inline: false,
  }] : []

  const message: DiscordMessage = {
    embeds: [{
      title: `📊 ${briefDate} Founder Daily Brief — ${projectName}`,
      description: `> ${reportSummary}`,
      color: overallColor,
      fields: [
        ...signalFields,
        ...riskField,
        {
          name: '📌 오늘 Must-Check',
          value: mustCheckCount > 0 ? `${mustCheckCount}건 — 확인 필요` : '없음',
          inline: true,
        },
        {
          name: '🔗 웹앱 바로가기',
          value: `[대시보드](${APP_URL}/projects/${projectId}/dashboard) · [Must-Check](${APP_URL}/projects/${projectId}/must-check)`,
          inline: false,
        },
      ],
      footer: { text: '김PM — AI 외주 개발 관리' },
      timestamp: new Date().toISOString(),
    }],
  }

  return sendWebhook(webhookUrl, message)
}

// ─────────────────────────────────────────────────────────────────────────────
// 📊 DAILY 채널 — 보고 독려
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyVendorReportReminder(
  webhookUrl: string,
  vendorAccessUrl: string,
  date: string
): Promise<boolean> {
  const message: DiscordMessage = {
    embeds: [{
      title: `📝 ${date} 일일 보고 안내`,
      description: '오늘 작업 내용을 보고해 주시면 감사하겠습니다.',
      color: COLORS.blue,
      fields: [{
        name: '🔗 보고하기 (약 30초)',
        value: `[외주사 포털 바로가기](${vendorAccessUrl}/report)`,
        inline: false,
      }],
      footer: { text: '김PM — AI 외주 개발 관리' },
      timestamp: new Date().toISOString(),
    }],
  }
  return sendWebhook(webhookUrl, message)
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔴 MUST-CHECK 채널 — 외주사 질문 (일정영향 무관, 전부 @here)
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyQuestion(
  webhookUrl: string,
  projectId: string,
  question: string,
  scheduleImpact?: string | null,
  featureName?: string | null
): Promise<boolean> {
  const hasImpact = scheduleImpact && scheduleImpact !== '없음' && scheduleImpact !== ''

  const message: DiscordMessage = {
    // @here — 모든 질문은 협의 필요 항목이므로 즉시 알림
    content: hasImpact
      ? `@here **🔴 [일정영향 ${scheduleImpact}] 외주사 질문 — 즉시 답변 필요**`
      : `@here **❓ 외주사 질문 — 답변이 필요합니다**`,
    embeds: [{
      title: '외주사 협의 요청',
      description: question.slice(0, 500),
      color: hasImpact ? COLORS.red : COLORS.purple,
      fields: [
        ...(featureName ? [{ name: '관련 기능', value: featureName, inline: true }] : []),
        ...(hasImpact   ? [{ name: '⏱️ 일정 영향', value: scheduleImpact!, inline: true }] : []),
        {
          name: '🔗 답변하기',
          value: `[의사결정 페이지](${APP_URL}/projects/${projectId}/decisions)`,
          inline: false,
        },
      ],
      footer: { text: '김PM — 답변 전까지 외주사가 기다립니다' },
      timestamp: new Date().toISOString(),
    }],
  }
  return sendWebhook(webhookUrl, message)
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔴 MUST-CHECK 채널 — 변경 요청 (승인 전 착수 불가, @here)
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyChangeRequest(
  webhookUrl: string,
  projectId: string,
  title: string,
  content: string,
  reason: string,
  scheduleImpact?: string | null
): Promise<boolean> {
  const hasImpact = scheduleImpact && scheduleImpact !== '없음' && scheduleImpact !== ''

  const message: DiscordMessage = {
    content: `@here **🔀 외주사 변경 요청 — 승인 전 착수 불가**`,
    embeds: [{
      title: `변경 요청: ${title}`,
      description: content.slice(0, 500),
      color: hasImpact ? COLORS.orange : COLORS.blue,
      fields: [
        { name: '변경 사유', value: reason.slice(0, 200), inline: false },
        ...(hasImpact ? [{ name: '⏱️ 일정 영향', value: scheduleImpact!, inline: true }] : []),
        {
          name: '🔗 검토 및 승인',
          value: `[변경 요청 목록](${APP_URL}/projects/${projectId}/change-requests)`,
          inline: false,
        },
      ],
      footer: { text: '김PM — 승인 전 작업 시작 시 비용·일정 분쟁 발생 가능' },
      timestamp: new Date().toISOString(),
    }],
  }
  return sendWebhook(webhookUrl, message)
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔴 MUST-CHECK 채널 — 기능 정의서 수정 제안 (@here)
// ─────────────────────────────────────────────────────────────────────────────
export async function notifySpecReview(
  webhookUrl: string,
  projectId: string,
  featureName: string,
  review: string
): Promise<boolean> {
  const message: DiscordMessage = {
    content: `@here **✏️ 기능 정의서 수정 제안 — 검토 후 승인 필요**`,
    embeds: [{
      title: `정의서 수정 제안: ${featureName}`,
      description: review.slice(0, 500),
      color: COLORS.orange,
      fields: [{
        name: '🔗 정의서 확인',
        value: `[기능 목록](${APP_URL}/projects/${projectId}/features)`,
        inline: false,
      }],
      footer: { text: '김PM — 수정 검토 후 최종 승인해주세요' },
      timestamp: new Date().toISOString(),
    }],
  }
  return sendWebhook(webhookUrl, message)
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔴 MUST-CHECK 채널 — 기능 완료 신청 (확인/검수 필요, @here)
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyCompletion(
  webhookUrl: string,
  projectId: string,
  featureName: string,
  vendorName: string,
  completionNote: string
): Promise<boolean> {
  const message: DiscordMessage = {
    content: `@here **🎉 기능 완료 신청 — 검수 필요**`,
    embeds: [{
      title: `완료 신청: ${featureName}`,
      description: completionNote.slice(0, 300),
      color: COLORS.green,
      fields: [
        { name: '완료 팀', value: vendorName, inline: true },
        {
          name: '🔗 검수하기',
          value: `[기능 목록](${APP_URL}/projects/${projectId}/features)`,
          inline: false,
        },
      ],
      footer: { text: '김PM — 검수 후 승인 또는 반려해주세요' },
      timestamp: new Date().toISOString(),
    }],
  }
  return sendWebhook(webhookUrl, message)
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔴 MUST-CHECK 채널 — 주간 계획 공유 (동의 필요, @here)
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyWeeklyPlan(
  webhookUrl: string,
  projectId: string,
  planId: string,
  vendorAccessUrl: string,
  weekStart: string,
  weekEnd: string,
  goals: string[]
): Promise<boolean> {
  const message: DiscordMessage = {
    content: `@here **📅 주간 계획 공유 — 동의 필요**`,
    embeds: [{
      title: `${weekStart} ~ ${weekEnd} 주간 계획`,
      description: '이번 주 작업 계획을 확인하고 동의해주세요.',
      color: COLORS.blue,
      fields: [
        {
          name: '이번 주 목표',
          value: goals.map(g => `• ${g}`).join('\n') || '목표 없음',
          inline: false,
        },
        {
          name: '🔗 동의하기',
          value: `[외주사 포털에서 확인](${vendorAccessUrl}/weekly-plan/${planId})`,
          inline: false,
        },
      ],
      footer: { text: '김PM — 동의 전까지 착수 대기' },
      timestamp: new Date().toISOString(),
    }],
  }
  return sendWebhook(webhookUrl, message)
}

// ─────────────────────────────────────────────────────────────────────────────
// (내부용) notifyMustCheck — 구버전 호환 래퍼, 신규 코드에서는 위 함수들 사용
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyMustCheck(
  webhookUrl: string,
  projectId: string,
  title: string,
  triggerType: string,
  description: string
): Promise<boolean> {
  const message: DiscordMessage = {
    content: `@here **🔴 Must-Check — ${title}**`,
    embeds: [{
      title,
      description,
      color: COLORS.red,
      fields: [
        { name: '트리거', value: triggerType.replace(/_/g, ' '), inline: true },
        {
          name: '🔗 확인하기',
          value: `[Must-Check 페이지](${APP_URL}/projects/${projectId}/must-check)`,
          inline: false,
        },
      ],
      footer: { text: '김PM — 대표 직접 확인 필요' },
      timestamp: new Date().toISOString(),
    }],
  }
  return sendWebhook(webhookUrl, message)
}

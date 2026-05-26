// Discord Webhook Integration
// =====================================================
// 2채널 구조 (2025년 재설계)
//
//  📊 daily (일일보고 채널) — 오전 9시 고정
//     - notifyDailyReport    : 외주사 일일 보고 수신 시
//     - sendFounderBrief     : AI 일일 요약 + 리스크 분석 (오전 9시 cron)
//     - notifyRisk           : AI 리스크 감지
//     - notifyVendorReportReminder : 보고 독려
//
//  ⚖️ decision (의사결정 채널) — 발생 즉시
//     - notifyChangeRequest  : 외주사 변경 요청
//     - notifyQuestion       : 외주사 질문/협의
//     - notifyCompletion     : 기능 완료 신청
//     - notifyWeeklyPlan     : 주간 계획 공유
//     - notifyMustCheck      : Must-Check 등록
// =====================================================

export interface DiscordWebhooks {
  /** 일일보고 채널 (일일보고 + AI 리스크 분석, 오전 9시 고정) */
  daily?: string | null
  /** 의사결정 채널 (변경 요청 + 질문, 발생 즉시) */
  decision?: string | null
  // ── 구버전 호환 (deprecated) ──
  /** @deprecated discord_webhook_daily로 통합됨 */
  mustcheck?: string | null
  /** @deprecated discord_webhook_daily로 통합됨 */
  risk?: string | null
}

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string }
  timestamp?: string
  url?: string
}

interface DiscordMessage {
  content?: string
  embeds?: DiscordEmbed[]
  username?: string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'

// Color codes
const COLORS = {
  green: 0x22c55e,
  yellow: 0xeab308,
  red: 0xef4444,
  blue: 0x3b82f6,
  purple: 0x8b5cf6,
  gray: 0x6b7280,
  orange: 0xf97316,
}

async function sendWebhook(webhookUrl: string, message: DiscordMessage): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    return response.ok
  } catch (error) {
    console.error('Discord webhook error:', error)
    return false
  }
}

// =====================================================
// 📊 DAILY 채널 — 일일보고 수신 알림
// =====================================================
export async function notifyDailyReport(
  webhookUrl: string,
  projectId: string,
  reportId: string,
  vendorName: string,
  summary: string,
  alignmentSignal: string,
  blocker: string | null,
  reportDate: string
): Promise<boolean> {
  const signalColor = alignmentSignal === '정상' ? COLORS.green
    : alignmentSignal === '주의' ? COLORS.yellow
    : COLORS.red

  const signalEmoji = alignmentSignal === '정상' ? '✅'
    : alignmentSignal === '주의' ? '⚠️'
    : '🔴'

  const message: DiscordMessage = {
    embeds: [{
      title: `📋 ${reportDate} 일일 보고 — ${vendorName}`,
      description: summary,
      color: signalColor,
      fields: [
        {
          name: '정합성 신호',
          value: `${signalEmoji} ${alignmentSignal}`,
          inline: true,
        },
        ...(blocker ? [{
          name: '⚡ Blocker',
          value: blocker,
          inline: false,
        }] : []),
        {
          name: '🔗 보고 상세보기',
          value: `[웹앱에서 AI 판단 카드 확인](${APP_URL}/projects/${projectId}/reports#${reportId})`,
          inline: false,
        },
      ],
      footer: { text: '김PM — AI 외주 개발 관리' },
      timestamp: new Date().toISOString(),
    }],
  }

  return sendWebhook(webhookUrl, message)
}

// =====================================================
// 📊 DAILY 채널 — Founder Daily Brief (AI 요약 + 리스크 분석)
// =====================================================
export async function sendFounderBrief(
  webhookUrl: string,
  projectId: string,
  briefId: string,
  projectName: string,
  reportSummary: string,
  keySignals: { type: string; title: string; description: string }[],
  mustCheckCount: number,
  decisionCount: number,
  briefDate: string
): Promise<boolean> {
  const criticalSignals = keySignals.filter(s => s.type === 'critical')
  const overallColor = criticalSignals.length > 0 ? COLORS.red
    : keySignals.some(s => s.type === 'warning') ? COLORS.yellow
    : COLORS.green

  const signalFields = keySignals.map(s => ({
    name: `${s.type === 'positive' ? '✅' : s.type === 'warning' ? '⚠️' : '🔴'} ${s.title}`,
    value: s.description,
    inline: false,
  }))

  const message: DiscordMessage = {
    content: mustCheckCount > 0 || decisionCount > 0 ? '**🔔 오늘의 Founder Daily Brief**' : undefined,
    embeds: [{
      title: `📊 ${briefDate} Founder Daily Brief — ${projectName}`,
      description: `**외주사 보고:** ${reportSummary}`,
      color: overallColor,
      fields: [
        ...signalFields,
        {
          name: '📌 Must-Check',
          value: mustCheckCount > 0 ? `${mustCheckCount}건 확인 필요` : '없음',
          inline: true,
        },
        {
          name: '⚖️ 의사결정 대기',
          value: decisionCount > 0 ? `${decisionCount}건 대기 중` : '없음',
          inline: true,
        },
        {
          name: '🔗 웹앱에서 확인',
          value: `[대시보드 바로가기](${APP_URL}/projects/${projectId}/dashboard) | [Must-Check](${APP_URL}/projects/${projectId}/must-check)`,
          inline: false,
        },
      ],
      footer: { text: '김PM — AI 외주 개발 관리' },
      timestamp: new Date().toISOString(),
    }],
  }

  return sendWebhook(webhookUrl, message)
}

// =====================================================
// 📊 DAILY 채널 — AI 리스크 감지
// =====================================================
export async function notifyRisk(
  webhookUrl: string,
  projectId: string,
  riskTitle: string,
  riskLevel: string,
  riskType: string,
  description: string
): Promise<boolean> {
  const levelColor = riskLevel === '낮음' ? COLORS.gray
    : riskLevel === '주의' ? COLORS.yellow
    : riskLevel === '위험' ? COLORS.red
    : COLORS.purple

  const levelEmoji = riskLevel === '낮음' ? '🟢'
    : riskLevel === '주의' ? '🟡'
    : riskLevel === '위험' ? '🔴'
    : '🟣'

  const message: DiscordMessage = {
    embeds: [{
      title: `${levelEmoji} AI 리스크 감지 — ${riskTitle}`,
      description,
      color: levelColor,
      fields: [
        { name: '위험도', value: riskLevel, inline: true },
        { name: '유형', value: riskType.replace(/_/g, ' '), inline: true },
        {
          name: '🔗 리스크 대시보드',
          value: `[확인하기](${APP_URL}/projects/${projectId}/risks)`,
          inline: false,
        },
      ],
      footer: { text: '김PM — AI 외주 개발 관리' },
      timestamp: new Date().toISOString(),
    }],
  }

  return sendWebhook(webhookUrl, message)
}

// =====================================================
// 📊 DAILY 채널 — 보고 독려
// =====================================================
export async function notifyVendorReportReminder(
  webhookUrl: string,
  vendorAccessUrl: string,
  date: string
): Promise<boolean> {
  const message: DiscordMessage = {
    embeds: [{
      title: `📝 ${date} 일일 보고 안내`,
      description: '오늘 작업 내용을 보고해 주시면 감사하겠습니다. 짧은 한 줄 요약만으로도 충분합니다.',
      color: COLORS.blue,
      fields: [
        {
          name: '🔗 보고하기 (약 30초)',
          value: `[외주사 포털 바로가기](${vendorAccessUrl}/report)`,
          inline: false,
        },
      ],
      footer: { text: '김PM — AI 외주 개발 관리' },
      timestamp: new Date().toISOString(),
    }],
  }

  return sendWebhook(webhookUrl, message)
}

// =====================================================
// ⚖️ DECISION 채널 — 변경 요청 (즉시)
// =====================================================
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
    content: '**⚡ 외주사 변경 요청 — 검토 필요**',
    embeds: [{
      title: `🔀 변경 요청: ${title}`,
      description: content,
      color: hasImpact ? COLORS.orange : COLORS.blue,
      fields: [
        { name: '변경 사유', value: reason, inline: false },
        ...(hasImpact ? [{ name: '⏱️ 일정 영향', value: scheduleImpact!, inline: true }] : []),
        {
          name: '🔗 변경 요청 검토',
          value: `[변경 요청 목록 확인](${APP_URL}/projects/${projectId}/change-requests)`,
          inline: false,
        },
      ],
      footer: { text: '김PM — 승인 전 착수 금지' },
      timestamp: new Date().toISOString(),
    }],
  }

  return sendWebhook(webhookUrl, message)
}

// =====================================================
// ⚖️ DECISION 채널 — 질문/협의 요청 (즉시)
// =====================================================
export async function notifyQuestion(
  webhookUrl: string,
  projectId: string,
  question: string,
  scheduleImpact?: string | null
): Promise<boolean> {
  const hasImpact = scheduleImpact && scheduleImpact !== '없음' && scheduleImpact !== ''
  const message: DiscordMessage = {
    content: hasImpact ? '**🔴 긴급 질문 — 일정 영향 있음**' : '**💬 외주사 질문 등록**',
    embeds: [{
      title: '❓ 외주사 협의 요청',
      description: question,
      color: hasImpact ? COLORS.red : COLORS.purple,
      fields: [
        ...(hasImpact ? [{ name: '⏱️ 일정 영향', value: scheduleImpact!, inline: true }] : []),
        {
          name: '🔗 질문 답변하기',
          value: `[의사결정 페이지](${APP_URL}/projects/${projectId}/decisions)`,
          inline: false,
        },
      ],
      footer: { text: '김PM — 빠른 답변이 일정에 도움이 됩니다' },
      timestamp: new Date().toISOString(),
    }],
  }

  return sendWebhook(webhookUrl, message)
}

// =====================================================
// ⚖️ DECISION 채널 — 기능 완료 신청
// =====================================================
export async function notifyCompletion(
  webhookUrl: string,
  featureName: string,
  vendorName: string,
  message: string
): Promise<boolean> {
  const discordMessage: DiscordMessage = {
    embeds: [{
      title: `🎉 기능 완료 — ${featureName}`,
      description: message,
      color: COLORS.green,
      fields: [
        { name: '완료한 팀', value: vendorName, inline: true },
      ],
      footer: { text: '김PM — AI 외주 개발 관리' },
      timestamp: new Date().toISOString(),
    }],
  }

  return sendWebhook(webhookUrl, discordMessage)
}

// =====================================================
// ⚖️ DECISION 채널 — 주간 계획 공유
// =====================================================
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
    embeds: [{
      title: `📅 ${weekStart} ~ ${weekEnd} 주간 계획 공유`,
      description: '이번 주 작업 계획이 준비되었습니다. 아래 링크에서 확인 후 동의해 주시면 감사하겠습니다.',
      color: COLORS.blue,
      fields: [
        {
          name: '이번 주 목표',
          value: goals.map(g => `• ${g}`).join('\n') || '목표 없음',
          inline: false,
        },
        {
          name: '🔗 주간 계획 확인 및 동의',
          value: `[외주사 포털에서 확인하기](${vendorAccessUrl}/weekly-plan/${planId})`,
          inline: false,
        },
      ],
      footer: { text: '김PM — 검토 후 동의 부탁드립니다' },
      timestamp: new Date().toISOString(),
    }],
  }

  return sendWebhook(webhookUrl, message)
}

// =====================================================
// ⚖️ DECISION 채널 — Must-Check 등록
// =====================================================
export async function notifyMustCheck(
  webhookUrl: string,
  projectId: string,
  title: string,
  triggerType: string,
  description: string
): Promise<boolean> {
  const message: DiscordMessage = {
    content: '**🔔 Must-Check 항목이 등록되었습니다**',
    embeds: [{
      title: `🟣 Must-Check — ${title}`,
      description,
      color: COLORS.purple,
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

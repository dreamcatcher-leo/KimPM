// Discord Webhook Integration

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
// 외주사 일일 보고 알림
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
// Founder Daily Brief 발송
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
// 리스크 알림
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
      title: `${levelEmoji} 리스크 감지 — ${riskTitle}`,
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
// 주간 계획 공유
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
// 완료 축하 알림
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
// Must-Check 알림
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

// =====================================================
// 외주사에게 보고 독려 (정중한 톤)
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

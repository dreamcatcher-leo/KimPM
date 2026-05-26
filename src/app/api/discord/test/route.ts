import { NextRequest, NextResponse } from 'next/server'

// Discord webhook 직접 호출을 브라우저에서 하면 CORS 오류 발생
// 이 서버 라우트를 경유하면 CORS 없이 안전하게 테스트 가능

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { webhookUrl, channelLabel, projectName } = body

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Webhook URL이 없습니다.' }, { status: 400 })
    }

    // URL 형식 검증
    if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
        !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
      return NextResponse.json({ error: '올바른 Discord Webhook URL이 아닙니다.' }, { status: 400 })
    }

    const label = channelLabel || '테스트'
    const name = projectName || '프로젝트'

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `✅ 김PM — ${label} 채널 연결 테스트`,
          description: `**${name}** 프로젝트의 **${label}** 알림 채널이 성공적으로 연결되었습니다.\n\n이 채널로 앞으로 관련 알림이 전송됩니다.`,
          color: 0x22c55e,
          fields: [
            { name: '채널 유형', value: label, inline: true },
            { name: '프로젝트', value: name, inline: true },
          ],
          footer: { text: '김PM — AI 외주 개발 관리' },
          timestamp: new Date().toISOString(),
        }],
      }),
    })

    if (res.ok) {
      return NextResponse.json({ success: true })
    } else {
      const errText = await res.text()
      return NextResponse.json(
        { error: `Discord 전송 실패 (${res.status}): ${errText}` },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Discord test webhook error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

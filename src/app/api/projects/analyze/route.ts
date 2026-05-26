import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai/client'

// =====================================================
// POST: 대표 요구사항 AI 분석 → 기능 목록 & 우선순위 생성
// =====================================================
export async function POST(request: NextRequest) {
  let body: Record<string, string> = {}
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    body = await request.json()
    const {
      one_line,        // 한 줄 설명
      must_have,       // 꼭 필요한 기능
      nice_to_have,    // 있으면 좋은 기능
      out_of_scope,    // 제외 범위
      priority_basis,  // 우선순위 기준
      references,      // 참고 서비스
      core_problem,    // 핵심 문제
      constraints,     // 조건/제약
      project_name,    // 프로젝트명
      project_goal,    // 프로젝트 목표
    } = body

    // 입력값 검증
    if (!one_line && !must_have && !core_problem) {
      return NextResponse.json({ error: '최소 입력값이 필요합니다 (서비스 설명 또는 핵심 기능)', errorType: 'validation' }, { status: 400 })
    }

    const hasApiKey = !!(process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY.trim() !== '' &&
      process.env.OPENAI_API_KEY !== '여기에_OpenAI_API키_붙여넣기' &&
      process.env.OPENAI_API_KEY !== 'placeholder')

    if (hasApiKey) {
      // ─────────────────────────────────────────────────────────────────
      // STEP 1: 입력된 기능 항목을 줄 단위로 추출 (누락 방지용 기준선)
      // ─────────────────────────────────────────────────────────────────
      const mustHaveLines = (must_have || '')
        .split('\n')
        .map(l => l.replace(/^[-*•·]\s*/, '').trim())
        .filter(l => l.length > 0)

      const niceToHaveLines = (nice_to_have || '')
        .split('\n')
        .map(l => l.replace(/^[-*•·]\s*/, '').trim())
        .filter(l => l.length > 0)

      const totalInputCount = mustHaveLines.length + niceToHaveLines.length

      const prompt = `당신은 외주 개발 PM 전문가입니다. 대표가 러프하게 작성한 기능 목록을 분석하여 개발 가능한 수준으로 구체화해주세요.

## 핵심 원칙 (반드시 준수)

1. **절대 생략 금지**: 대표가 줄바꿈으로 구분하여 입력한 기능은 단 하나도 빠트리지 마세요.
   - 대표의 입력은 이미 충분히 러프합니다. 러프한 항목을 또 생략하면 실제 개발 범위와 격차가 커집니다.
   - 유사해 보이는 기능도 절대 병합하지 마세요. 각각 별도 feature로 출력하세요.
   - 입력된 기능 수: 필수 ${mustHaveLines.length}개 + 추가 ${niceToHaveLines.length}개 = 총 ${totalInputCount}개
   - 출력 feature 수는 반드시 ${totalInputCount}개 이상이어야 합니다.

2. **기능 고도화**: 각 기능을 개발팀이 바로 이해할 수 있는 수준으로 구체화하세요.
   - 대표가 짧게 쓴 기능명의 의도를 파악하고, 실제 포함되어야 할 세부 동작을 description에 기술하세요.
   - category는 "신규_개발", "기존_보완", "신규_개발_기존_보완" 중 맥락에 맞게 선택하세요.

3. **우선순위 기준**:
   - P0: MVP 출시 필수. 없으면 서비스 자체 불가능. 대표가 "1순위" 명시한 것.
   - P1: 출시 후 초기 운영에 필요. 초기 사용자 확보에 중요.
   - P2: 있으면 좋지만 후순위로 미룰 수 있음.
   - **우선순위를 낮추는 것은 허용**, 기능 자체를 삭제하는 것은 불가.

## 입력 정보

프로젝트명: ${project_name || '미입력'}
프로젝트 목표: ${project_goal || '미입력'}
서비스 한 줄 설명: ${one_line || '미입력'}
핵심 문제: ${core_problem || '미입력'}
우선순위 기준 (대표 입력): ${priority_basis || '없음'}
참고 서비스: ${references || '없음'}
제약 조건: ${constraints || '없음'}
제외 범위: ${out_of_scope || '없음'}

## 꼭 필요한 기능 목록 (줄바꿈 = 별개 기능, 총 ${mustHaveLines.length}개)
${mustHaveLines.map((l, i) => `${i + 1}. ${l}`).join('\n') || '(없음)'}

## 있으면 좋은 기능 목록 (총 ${niceToHaveLines.length}개)
${niceToHaveLines.map((l, i) => `${i + 1}. ${l}`).join('\n') || '(없음)'}

## 응답 형식 (반드시 JSON)

{
  "summary": "AI가 이해한 프로젝트 핵심 2-3문장",
  "core_value": "핵심 가치 제안 1문장",
  "features": [
    {
      "order_key": "P0-1",
      "name": "기능명 — 대표가 입력한 원문을 기반으로, 명확하게",
      "priority_group": "P0",
      "category": "신규_개발 | 기존_보완 | 신규_개발_기존_보완",
      "description": "이 기능이 실제로 무엇을 해야 하는지 구체적으로 3-5문장. 포함되어야 할 세부 동작, 대상 사용자, 처리 흐름을 기술. 대표가 짧게 쓴 의도를 최대한 구체화.",
      "expected_effect": "기대 효과 1-2문장",
      "priority_reason": "이 우선순위인 이유 — 출시필수 / 운영효율 / 초기사용자확보 / 후순위 중 하나 포함. 대표가 우선순위 기준을 명시했으면 반드시 반영.",
      "risk_note": "개발 시 주요 리스크 또는 대표 확인 필요 사항. 기획이 더 필요한 부분 명시. 없으면 null"
    }
  ],
  "risks": ["프로젝트 전체 리스크 1", "리스크 2"],
  "founder_checks": ["대표 확인이 필요한 사항 1", "사항 2"],
  "priority_guide": "이번 분석에서 P0/P1/P2를 나눈 기준 1-2문장"
}

## 검증 체크리스트 (응답 전 자가점검)
- [ ] 필수 기능 ${mustHaveLines.length}개가 모두 features에 포함되어 있는가?
- [ ] 추가 기능 ${niceToHaveLines.length}개가 모두 features에 포함되어 있는가?
- [ ] 유사 기능을 임의로 병합하지 않았는가?
- [ ] 우선순위 기준(priority_basis)을 반영하여 P0/P1/P2를 배분했는가?
- [ ] 각 description이 개발팀이 바로 이해할 수 있는 수준으로 구체적인가?`

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '당신은 외주 개발 PM 전문가입니다. 대표가 입력한 기능 목록을 단 하나도 누락하지 않고, 각각을 개발 가능한 수준으로 구체화합니다. 기능 병합은 절대 하지 않습니다.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: 6000,  // 기능이 많아질 수 있으므로 넉넉하게
      })

      const result = JSON.parse(completion.choices[0].message.content || '{}')

      // ─────────────────────────────────────────────────────────────────
      // 누락 감지 후보정: AI가 기능을 빠트렸으면 Fallback 항목으로 보충
      // ─────────────────────────────────────────────────────────────────
      const outputCount = result.features?.length || 0
      if (outputCount < totalInputCount) {
        console.warn(`[analyze] AI 출력 기능 수(${outputCount}) < 입력 기능 수(${totalInputCount}). Fallback 보충.`)
        const fallback = generateFallbackAnalysis(body)
        // AI 결과에 없는 기능만 추가
        const existingNames = new Set((result.features || []).map((f: { name: string }) => f.name))
        const missing = fallback.features.filter(f => !existingNames.has(f.name))
        result.features = [...(result.features || []), ...missing]
        result._patched = true
      }

      return NextResponse.json({ ...result, isFallback: false })
    } else {
      // Fallback: API 키 없을 때 입력값 기반 구조화
      return NextResponse.json(generateFallbackAnalysis(body))
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('Analyze error:', errMsg)
    return NextResponse.json({ ...generateFallbackAnalysis(body), isFallback: true, error: errMsg })
  }
}

// =====================================================
// Fallback 분석 (OpenAI 없이 — 입력 전체를 1:1 보존)
// =====================================================
function generateFallbackAnalysis(body: Record<string, string>) {
  const { one_line, must_have, nice_to_have, project_name } = body
  type FeatureItem = { order_key: string; name: string; priority_group: string; category: string; description: string; expected_effect: string; priority_reason: string; risk_note: string | null; selected: boolean }
  const features: FeatureItem[] = []
  let p0Count = 0
  let p1Count = 0

  // must_have: 줄 단위 전체 보존 (slice 제한 제거)
  if (must_have) {
    const lines = must_have.split('\n').map(l => l.replace(/^[-*•·]\s*/, '').trim()).filter(l => l)
    lines.forEach((line) => {
      p0Count++
      features.push({
        order_key: `P0-${p0Count}`,
        name: line.substring(0, 60),
        priority_group: 'P0',
        category: '신규_개발',
        description: `${line} — 대표가 필수로 명시한 기능입니다. 상세 범위는 기능 정의서 작성 단계에서 구체화됩니다.`,
        expected_effect: '서비스 핵심 가치 제공 및 초기 사용자 경험 보장',
        priority_reason: '출시필수 — 대표가 꼭 필요하다고 명시한 기능',
        risk_note: '상세 범위 정의 후 외주사 공수 산정 필요',
        selected: true,
      })
    })
  }

  // nice_to_have: 줄 단위 전체 보존 (slice 제한 제거)
  if (nice_to_have) {
    const lines = nice_to_have.split('\n').map(l => l.replace(/^[-*•·]\s*/, '').trim()).filter(l => l)
    lines.forEach((line) => {
      p1Count++
      features.push({
        order_key: `P1-${p1Count}`,
        name: line.substring(0, 60),
        priority_group: 'P1',
        category: '신규_개발',
        description: `${line} — 초기 운영 효율 또는 사용자 경험 향상에 기여하는 기능입니다.`,
        expected_effect: '운영 효율화 및 사용자 만족도 향상',
        priority_reason: '운영효율 — 출시 후 빠르게 필요한 기능',
        risk_note: null,
        selected: true,
      })
    })
  }

  // 기능이 없으면 기본 플레이스홀더
  if (features.length === 0) {
    features.push(
      { order_key: 'P0-1', name: '핵심 기능 1', priority_group: 'P0', category: '신규_개발', description: '요구사항을 입력하면 AI가 기능을 자동 제안합니다.', expected_effect: '서비스 핵심 가치 제공', priority_reason: '출시필수', risk_note: '상세 정의 필요', selected: true },
      { order_key: 'P0-2', name: '핵심 기능 2', priority_group: 'P0', category: '신규_개발', description: '요구사항 분석 후 세부 기능을 추가해주세요.', expected_effect: '사용자 경험 보장', priority_reason: '출시필수', risk_note: null, selected: true },
      { order_key: 'P1-1', name: '부가 기능 1', priority_group: 'P1', category: '신규_개발', description: '1차 출시 후 추가할 기능입니다.', expected_effect: '운영 효율화', priority_reason: '운영효율', risk_note: null, selected: true },
    )
  }

  return {
    summary: `"${project_name || '새 프로젝트'}" — ${one_line || '요구사항을 입력하면 AI가 프로젝트를 분석합니다.'}`,
    core_value: one_line || '핵심 가치 제안을 입력해주세요',
    features,
    risks: ['상세 기능 범위 정의 후 외주 공수 재산정 필요', '우선순위는 대표 확인 후 조정 가능'],
    founder_checks: ['각 기능의 상세 범위 검토', '외주 일정 및 예산과의 정합성 확인'],
    priority_guide: 'P0: 출시 필수 / P1: 초기 운영 필요 / P2: 후순위',
    isFallback: true,
  }
}

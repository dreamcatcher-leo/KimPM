import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = 'prj_V3cwLTBAhB7ba2ZHcc4MdP9U1Fyn'

// Vercel 환경변수 목록 조회
async function getVercelEnvs() {
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  )
  const data = await res.json()
  return data.envs || []
}

// Vercel 환경변수 업데이트
async function upsertVercelEnv(key: string, value: string) {
  const envs = await getVercelEnvs()

  // 기존 항목 찾기 (production + preview 두 개)
  const existing = envs.filter((e: { key: string }) => e.key === key)

  if (existing.length > 0) {
    // 기존 항목들 모두 업데이트
    const results = await Promise.all(
      existing.map((e: { id: string }) =>
        fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${e.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value }),
        })
      )
    )
    return results.every(r => r.ok)
  } else {
    // 신규 생성
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          value,
          type: 'encrypted',
          target: ['production', 'preview'],
        }),
      }
    )
    return res.ok
  }
}

// Vercel 재배포 트리거
async function triggerRedeploy() {
  // 최신 배포 가져오기
  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=1`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  )
  const data = await res.json()
  const latest = data.deployments?.[0]
  if (!latest) return false

  // 재배포
  const redeployRes = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'kimpm',
      deploymentId: latest.uid,
      target: 'production',
    }),
  })
  return redeployRes.ok
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (로그인된 사용자만)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!VERCEL_TOKEN) {
      return NextResponse.json({ error: 'VERCEL_TOKEN이 설정되지 않았습니다' }, { status: 500 })
    }

    const { key, value } = await request.json()

    // 허용된 키만 업데이트 가능
    const allowedKeys = ['OPENAI_API_KEY', 'OPENAI_MODEL']
    if (!allowedKeys.includes(key)) {
      return NextResponse.json({ error: '허용되지 않은 환경변수입니다' }, { status: 400 })
    }

    if (!value || value.trim() === '') {
      return NextResponse.json({ error: '값이 비어있습니다' }, { status: 400 })
    }

    // Vercel 환경변수 업데이트
    const success = await upsertVercelEnv(key, value.trim())
    if (!success) {
      return NextResponse.json({ error: 'Vercel 환경변수 업데이트 실패' }, { status: 500 })
    }

    // 재배포 트리거
    await triggerRedeploy()

    return NextResponse.json({
      success: true,
      message: `${key} 업데이트 완료. Vercel 재배포가 시작됩니다 (약 1-2분 소요).`,
    })
  } catch (error) {
    console.error('env-update error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!VERCEL_TOKEN) {
      return NextResponse.json({ error: 'VERCEL_TOKEN 없음' }, { status: 500 })
    }

    const envs = await getVercelEnvs()
    const allowedKeys = ['OPENAI_API_KEY', 'OPENAI_MODEL']
    const filtered = envs
      .filter((e: { key: string }) => allowedKeys.includes(e.key))
      .map((e: { key: string; updatedAt?: number; type: string }) => ({
        key: e.key,
        updatedAt: e.updatedAt,
        type: e.type,
      }))

    return NextResponse.json({ envs: filtered })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

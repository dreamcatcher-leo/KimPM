import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      seed_data, ai_features, start_mode, ai_analysis,
      // discord 2채널 필드 — DB 컬럼 존재 여부에 따라 별도 처리
      discord_webhook_daily,
      discord_webhook_mustcheck,
      // 구 단일 웹훅 (하위 호환)
      discord_webhook_url,
      ...coreProjectData
    } = body

    const admin = createAdminClient()

    // ── 1단계: 핵심 프로젝트 데이터로 먼저 INSERT ──
    const { data: project, error } = await admin
      .from('projects')
      .insert({
        ...coreProjectData,
        discord_webhook_url: discord_webhook_url || null,
        founder_id: user.id,
        contract_amount: coreProjectData.contract_amount ? parseInt(coreProjectData.contract_amount) : null,
      })
      .select()
      .single()

    if (error) throw error

    // ── 2단계: discord_webhook_daily / mustcheck 컬럼 UPDATE (컬럼 없으면 무시) ──
    if (project && (discord_webhook_daily || discord_webhook_mustcheck)) {
      try {
        await admin
          .from('projects')
          .update({
            ...(discord_webhook_daily ? { discord_webhook_daily } : {}),
            ...(discord_webhook_mustcheck ? { discord_webhook_mustcheck } : {}),
          })
          .eq('id', project.id)
      } catch {
        // discord_webhook_daily/mustcheck 컬럼이 아직 DB에 없으면 무시
        // → settings 페이지에서 나중에 저장 가능
        console.warn('[projects/POST] discord webhook 컬럼 미존재 — 컬럼 추가 마이그레이션 필요')
      }
    }

    // AI 분석 기능 목록 저장
    if (ai_features && Array.isArray(ai_features) && ai_features.length > 0 && project) {
      const featuresWithProject = ai_features.map((f: Record<string, unknown>) => ({
        order_key: f.order_key,
        name: f.name,
        category: f.category || '신규_개발',
        description: String(f.description || ''),
        expected_effect: String(f.expected_effect || ''),
        priority_group: f.priority_group || 'P0',
        project_id: project.id,
        status: 'planning',
        is_seed: false,
      }))
      await admin.from('features').insert(featuresWithProject)
    }

    // seed_data, start_mode, ai_analysis는 더 이상 서버 처리 불필요
    void seed_data; void start_mode; void ai_analysis

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('founder_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ projects })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

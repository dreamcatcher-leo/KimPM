import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { seed_data, ai_features, start_mode, ai_analysis, ...projectData } = body

    const admin = createAdminClient()

    const { data: project, error } = await admin
      .from('projects')
      .insert({
        ...projectData,
        founder_id: user.id,
        contract_amount: projectData.contract_amount ? parseInt(projectData.contract_amount) : null,
      })
      .select()
      .single()

    if (error) throw error

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

    // seed_data 옵션은 더 이상 사용하지 않음 (비포펫 고정 데이터 제거)
    void seed_data

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

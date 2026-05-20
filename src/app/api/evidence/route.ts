import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const { report_id, project_id, evidence_items } = await request.json()

    if (!evidence_items || evidence_items.length === 0) {
      return NextResponse.json({ success: true })
    }

    const items = evidence_items.map((item: {
      type: string
      content: string
      url: string
      title: string
    }) => ({
      report_id,
      project_id,
      evidence_type: item.type,
      content: item.content || null,
      url: item.url || null,
      title: item.title || null,
    }))

    const { error } = await admin.from('evidence_items').insert(items)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

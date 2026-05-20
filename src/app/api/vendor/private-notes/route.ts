import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()

    const { data: link } = await admin
      .from('access_links')
      .select('id, is_active')
      .eq('id', body.access_link_id)
      .eq('is_active', true)
      .single()

    if (!link) return NextResponse.json({ error: 'Invalid access' }, { status: 403 })

    const { data: note, error } = await admin
      .from('vendor_private_notes')
      .insert({
        project_id: body.project_id,
        access_link_id: body.access_link_id,
        note_date: body.note_date,
        content: body.content,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ note })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

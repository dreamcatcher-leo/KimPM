import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('founder_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const admin = createAdminClient()
    const token = nanoid(32)

    const { data: link, error } = await admin
      .from('access_links')
      .insert({
        project_id: id,
        token,
        vendor_name: project.vendor_name,
        vendor_email: project.vendor_contact_email,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const url = `${appUrl}/vendor/${token}`

    return NextResponse.json({ link, url })
  } catch (error) {
    console.error('Error creating vendor link:', error)
    return NextResponse.json({ error: 'Failed to create vendor link' }, { status: 500 })
  }
}

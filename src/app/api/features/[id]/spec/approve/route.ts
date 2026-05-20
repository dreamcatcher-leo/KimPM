import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Get the draft spec
    const { data: spec } = await admin
      .from('specs')
      .select('*')
      .eq('feature_id', id)
      .eq('status', 'draft')
      .single()

    if (!spec) return NextResponse.json({ error: 'No draft spec found' }, { status: 404 })

    // Approve spec
    await admin.from('specs').update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    }).eq('id', spec.id)

    // Update feature status
    await admin.from('features').update({ status: 'spec_approved' }).eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error approving spec:', error)
    return NextResponse.json({ error: 'Failed to approve spec' }, { status: 500 })
  }
}

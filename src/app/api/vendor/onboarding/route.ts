import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// POST: vendor 온보딩 - 테스트 계정 연결 + access_link에 vendor_user_id 저장
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const { token, email, password, vendor_name, contact_name } = await request.json()

    if (!token || !email || !password) {
      return NextResponse.json({ error: '필수 입력값이 없습니다' }, { status: 400 })
    }

    // 1. 토큰으로 access_link 조회
    const { data: link, error: linkError } = await admin
      .from('access_links')
      .select('*, projects(*)')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (linkError || !link) {
      return NextResponse.json({ error: '유효하지 않은 링크입니다' }, { status: 404 })
    }

    // 이미 온보딩 완료된 링크인지 확인
    if (link.onboarding_completed && link.vendor_user_id) {
      return NextResponse.json({
        error: '이미 계정이 연결된 링크입니다. 로그인해 주세요.',
        alreadyLinked: true,
      }, { status: 409 })
    }

    // 2. 이메일로 기존 유저 존재 여부 확인
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    let userId: string

    if (existingUser) {
      // 기존 유저가 있으면 그대로 사용 (테스트 계정 시나리오)
      userId = existingUser.id

      // 비밀번호 업데이트 (테스트 계정이므로 override)
      await admin.auth.admin.updateUserById(userId, { password })

    } else {
      // 신규 유저 생성
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'vendor',
          vendor_name: vendor_name || link.vendor_name,
          contact_name,
        },
      })

      if (createError || !newUser?.user) {
        console.error('유저 생성 실패:', createError)
        return NextResponse.json({ error: `계정 생성 실패: ${createError?.message}` }, { status: 500 })
      }
      userId = newUser.user.id
    }

    // 3. profiles 테이블에 vendor role 설정
    const { error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: userId,
        role: 'vendor',
        full_name: contact_name || vendor_name || link.vendor_name || '외주사',
        email,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('profile upsert 실패:', profileError)
      // profiles 실패해도 계속 진행 (치명적이지 않음)
    }

    // 4. access_links에 vendor_user_id + onboarding_completed 업데이트
    const { error: updateError } = await admin
      .from('access_links')
      .update({
        vendor_user_id: userId,
        onboarding_completed: true,
        vendor_name: vendor_name || link.vendor_name,
        vendor_email: email,
      })
      .eq('id', link.id)

    if (updateError) {
      console.error('access_links 업데이트 실패:', updateError)
      return NextResponse.json({ error: `링크 연결 실패: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      userId,
      projectName: (link.projects as { name: string })?.name,
      token,
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('onboarding error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

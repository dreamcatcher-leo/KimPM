import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import type { Project, AccessLink } from '@/types'
import VendorNav from './VendorNav'

export default async function VendorLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  // 현재 pathname (middleware에서 주입)
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''

  // onboarding / login 페이지는 별도 레이아웃 (nav 없이, 인증 체크 없이 렌더)
  const isOnboardingPage = pathname.endsWith('/onboarding')
  const isLoginPage = pathname.endsWith('/login')
  const isAuthPage = isOnboardingPage || isLoginPage

  // 1. 토큰 유효성 확인
  const { data: link } = await admin
    .from('access_links')
    .select(`*, projects(*)`)
    .eq('token', token)
    .eq('is_active', true)
    .single() as { data: (AccessLink & { projects: Project }) | null }

  if (!link) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔗</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">유효하지 않은 링크</h1>
          <p className="text-slate-500 text-sm">
            링크가 만료되었거나 유효하지 않습니다.<br />
            대표에게 새 링크를 요청해주세요.
          </p>
        </div>
      </div>
    )
  }

  // auth 페이지(onboarding/login)는 인증 검사 없이 그냥 렌더
  if (isAuthPage) {
    return <>{children}</>
  }

  // 2. 온보딩(회원가입) 미완료 → /vendor/{token}/onboarding 으로 redirect
  if (!link.onboarding_completed) {
    redirect(`/vendor/${token}/onboarding`)
  }

  // 3. 온보딩 완료 → 현재 로그인된 사용자가 연결된 vendor_user_id 와 일치하는지 확인
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isLinkedUser = user && link.vendor_user_id && user.id === link.vendor_user_id

  if (!isLinkedUser) {
    // 미로그인이거나 다른 계정으로 로그인 → 외주사 전용 로그인 페이지로
    redirect(`/vendor/${token}/login`)
  }

  const project = link.projects

  return (
    <div className="min-h-screen bg-slate-50">
      <VendorNav token={token} projectName={project.name} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}

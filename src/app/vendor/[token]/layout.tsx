import { createAdminClient } from '@/lib/supabase/admin'
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
          <p className="text-slate-500 text-sm">링크가 만료되었거나 유효하지 않습니다.<br />대표에게 새 링크를 요청해주세요.</p>
        </div>
      </div>
    )
  }

  // 온보딩 완료 여부 체크 → 미완료 시 onboarding 페이지로 redirect
  // (단, 현재 경로가 /onboarding인 경우에는 redirect하지 않음)
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || ''
  const isOnboardingPage = pathname.includes('/onboarding')

  if (!link.onboarding_completed && !isOnboardingPage) {
    redirect(`/vendor/${token}/onboarding`)
  }

  const project = link.projects

  // 온보딩 페이지는 독립 레이아웃 (nav 없음)
  if (isOnboardingPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <VendorNav token={token} projectName={project.name} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Project, AccessLink } from '@/types'

async function VendorNav({ token, projectName }: { token: string; projectName: string }) {
  const navItems = [
    { href: `/vendor/${token}`, label: '홈' },
    { href: `/vendor/${token}/specs`, label: '기능 정의서' },
    { href: `/vendor/${token}/report`, label: '일일 보고' },
    { href: `/vendor/${token}/questions`, label: '질문' },
    { href: `/vendor/${token}/change-request`, label: '변경 요청' },
    { href: `/vendor/${token}/completion`, label: '완료 제출' },
    { href: `/vendor/${token}/evidence`, label: '증빙자료' },
    { href: `/vendor/${token}/private-notes`, label: '비공개 메모' },
  ]

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">DG</div>
            <span className="font-semibold text-slate-800 text-sm">{projectName}</span>
            <span className="text-slate-300 text-xs">| 외주사 포털</span>
          </div>
        </div>
        <div className="flex gap-1 pb-0">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} className="text-sm text-slate-600 hover:text-blue-600 px-3 py-2 rounded-t-md hover:bg-blue-50 transition-colors">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

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

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, BookOpen, Send, MessageSquare, GitBranch, CheckSquare, FileImage, FileText, Menu, X } from 'lucide-react'
import { useState } from 'react'

interface VendorNavProps {
  token: string
  projectName: string
}

export default function VendorNav({ token, projectName }: VendorNavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { href: `/vendor/${token}`, label: '홈', icon: Home, exact: true },
    { href: `/vendor/${token}/specs`, label: '기능 정의서', icon: BookOpen },
    { href: `/vendor/${token}/report`, label: '일일 보고', icon: Send },
    { href: `/vendor/${token}/questions`, label: '질문', icon: MessageSquare },
    { href: `/vendor/${token}/change-request`, label: '범위 변경', icon: GitBranch },
    { href: `/vendor/${token}/completion`, label: '완료 신청', icon: CheckSquare },
    { href: `/vendor/${token}/evidence`, label: '증빙자료', icon: FileImage },
    { href: `/vendor/${token}/private-notes`, label: '비공개 메모', icon: FileText },
  ]

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-4xl mx-auto px-4">
        {/* 상단: 로고 + 프로젝트명 + 모바일 햄버거 */}
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-xs">김</span>
            </div>
            <div>
              <span className="font-semibold text-slate-800 text-sm">{projectName}</span>
              <span className="text-slate-400 text-xs ml-1.5">| 외주사 포털</span>
            </div>
          </div>
          {/* 모바일 햄버거 */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* 데스크톱 탭 메뉴 */}
        <div className="hidden lg:flex gap-0.5 pb-0 overflow-x-auto">
          {navItems.map(item => {
            const active = isActive(item.href, item.exact)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 text-sm px-3 py-2 rounded-t-md transition-colors whitespace-nowrap border-b-2 -mb-px',
                  active
                    ? 'border-blue-600 text-blue-600 font-medium bg-blue-50/50'
                    : 'border-transparent text-slate-600 hover:text-blue-600 hover:bg-blue-50/30'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white">
          <div className="max-w-4xl mx-auto px-4 py-2 grid grid-cols-2 gap-1">
            {navItems.map(item => {
              const active = isActive(item.href, item.exact)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    active
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}

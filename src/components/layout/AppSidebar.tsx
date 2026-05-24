'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ListChecks, Calendar, FileText, AlertTriangle,
  Scale, GitBranch, BarChart3, Settings, ChevronRight, ChevronDown,
  Bell, Plus, ShieldAlert, Layers, MessageSquare, Bot, Plug
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import Image from 'next/image'

interface SidebarProps {
  projectId?: string
  projectName?: string
  pendingMustChecks?: number
  pendingDecisions?: number
  pendingRisks?: number
}

// ─── 하위 결정함 메뉴 ──────────────────────────────────────────────────────────
const decisionSubItems = (projectId: string, mustChecks: number, decisions: number, risks: number) => [
  {
    label: 'Must-Check',
    href: `/projects/${projectId}/must-check`,
    icon: Bell,
    count: mustChecks,
    color: 'text-purple-400',
    countClass: 'bg-purple-900/50 text-purple-300',
  },
  {
    label: '리스크',
    href: `/projects/${projectId}/risks`,
    icon: AlertTriangle,
    count: risks,
    color: 'text-red-400',
    countClass: 'bg-red-900/50 text-red-300',
  },
  {
    label: '의사결정함',
    href: `/projects/${projectId}/decisions`,
    icon: Scale,
    count: decisions,
    color: 'text-orange-400',
    countClass: 'bg-orange-900/50 text-orange-300',
  },
]

// ─── 메인 네비 아이템 ──────────────────────────────────────────────────────────
const navItems = (projectId: string) => [
  {
    label: '대시보드',
    href: `/projects/${projectId}/dashboard`,
    icon: LayoutDashboard,
    section: 'main',
  },
  {
    label: '기능 목록',
    href: `/projects/${projectId}/features`,
    icon: ListChecks,
    section: 'main',
  },
  {
    label: '주간 계획',
    href: `/projects/${projectId}/weekly-plan`,
    icon: Calendar,
    section: 'main',
  },
  {
    label: '일일 보고',
    href: `/projects/${projectId}/reports`,
    icon: FileText,
    section: 'main',
  },
  // 결정함 그룹 (하위 메뉴 포함 — 별도 처리)
  {
    label: '통합 결정함',
    href: `/projects/${projectId}/overview`,
    icon: Layers,
    section: 'decision',
    badge: 'combined' as const,
  },
  {
    label: '변경 요청',
    href: `/projects/${projectId}/change-requests`,
    icon: GitBranch,
    section: 'main',
  },
  {
    label: '주간 리포트',
    href: `/projects/${projectId}/weekly-report`,
    icon: BarChart3,
    section: 'main',
  },
  {
    label: '분쟁 대비 센터',
    href: `/projects/${projectId}/dispute-center`,
    icon: ShieldAlert,
    section: 'main',
  },
  {
    label: '설정',
    href: `/projects/${projectId}/settings`,
    icon: Settings,
    section: 'main',
  },
]

export default function AppSidebar({
  projectId,
  projectName,
  pendingMustChecks = 0,
  pendingDecisions = 0,
  pendingRisks = 0,
}: SidebarProps) {
  const pathname = usePathname()
  const [decisionExpanded, setDecisionExpanded] = useState(true)

  const combinedCount = pendingMustChecks + pendingDecisions + pendingRisks

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="w-64 bg-slate-900 min-h-screen flex flex-col border-r border-slate-800">

      {/* ── 로고 ── */}
      <div className="p-4 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shadow-lg flex-shrink-0">
            <Image
              src="/kimpm-logo.png"
              alt="김PM"
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight group-hover:text-blue-300 transition-colors">김PM</p>
            <p className="text-slate-500 text-xs">AI 외주 개발 관리</p>
          </div>
        </Link>
      </div>

      {/* ── 현재 프로젝트 표시 ── */}
      {projectName && (
        <Link href="/dashboard" className="px-3 py-2.5 border-b border-slate-800 flex items-center gap-2 hover:bg-slate-800/50 transition-colors group">
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-slate-400 text-xs leading-none mb-0.5">현재 프로젝트</p>
            <p className="text-white text-xs font-semibold truncate">{projectName}</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
        </Link>
      )}

      {/* ── 네비게이션 ── */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {projectId ? (
          <>
            {/* 일반 메뉴 (결정함 앞) */}
            {navItems(projectId).filter(i => i.section === 'main').slice(0, 4).map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-sm',
                    active
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  )}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </div>
                </Link>
              )
            })}

            {/* 구분선 */}
            <div className="pt-2 pb-1">
              <p className="text-xs text-slate-600 px-3 font-medium uppercase tracking-wider">결정 & 관리</p>
            </div>

            {/* 통합 결정함 (상위 + 하위 펼침) */}
            <div>
              {/* 통합 결정함 헤더 */}
              <div className="flex items-center">
                <Link href={`/projects/${projectId}/overview`} className="flex-1">
                  <div className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-l-lg transition-all text-sm',
                    isActive(`/projects/${projectId}/overview`)
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}>
                    <Layers className="w-4 h-4 flex-shrink-0 text-blue-400" />
                    <span className="flex-1 font-medium">통합 결정함</span>
                    {combinedCount > 0 && (
                      <Badge className="bg-red-600 text-white text-xs h-4 min-w-4 px-1 border-0">
                        {combinedCount}
                      </Badge>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => setDecisionExpanded(!decisionExpanded)}
                  className="px-2 py-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-r-lg transition-colors"
                >
                  {decisionExpanded
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* 하위 메뉴 */}
              {decisionExpanded && (
                <div className="ml-3 mt-0.5 border-l border-slate-700 space-y-0.5 pl-2">
                  {decisionSubItems(projectId, pendingMustChecks, pendingDecisions, pendingRisks).map(sub => {
                    const SubIcon = sub.icon
                    const active = isActive(sub.href)
                    return (
                      <Link key={sub.href} href={sub.href}>
                        <div className={cn(
                          'flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-xs',
                          active
                            ? 'bg-slate-700 text-white font-medium'
                            : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                        )}>
                          <SubIcon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-white' : sub.color}`} />
                          <span className="flex-1">{sub.label}</span>
                          {sub.count > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${sub.countClass}`}>
                              {sub.count}
                            </span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 나머지 메뉴 */}
            {navItems(projectId).filter(i => i.section === 'main').slice(4).map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-sm',
                    active
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  )}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </div>
                </Link>
              )
            })}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm mb-4">프로젝트를 선택하세요</p>
            <Link href="/projects/new">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 gap-2">
                <Plus className="w-3.5 h-3.5" />
                새 프로젝트
              </Button>
            </Link>
          </div>
        )}
      </nav>

      {/* ── 하단 고정 ── */}
      <div className="p-2 border-t border-slate-800 space-y-0.5">
        {/* 전체 대시보드 */}
        <Link href="/dashboard">
          <div className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm',
            pathname === '/dashboard' && 'bg-slate-800 text-white'
          )}>
            <LayoutDashboard className="w-4 h-4" />
            <span>전체 대시보드</span>
          </div>
        </Link>

        {/* 새 프로젝트 */}
        <Link href="/projects/new">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm">
            <Plus className="w-4 h-4" />
            <span>새 프로젝트</span>
          </div>
        </Link>

        {/* Discord / 알림 연동 */}
        {projectId && (
          <Link href={`/projects/${projectId}/settings#discord`}>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors text-sm">
              <Plug className="w-4 h-4" />
              <span>Discord 연동</span>
            </div>
          </Link>
        )}

        {/* 구분 */}
        <div className="pt-2 border-t border-slate-800/50">
          <p className="text-slate-700 text-xs px-3 pb-1">김PM v2.0</p>
        </div>
      </div>
    </aside>
  )
}

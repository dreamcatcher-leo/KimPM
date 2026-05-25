'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ListChecks, Calendar, FileText, AlertTriangle,
  Scale, GitBranch, BarChart3, Settings, ChevronRight, ChevronDown,
  Bell, Plus, ShieldAlert, Layers, Plug, ChevronsUpDown, Folder,
  FolderOpen, Archive, CheckCircle2, Search, Cpu, X, KeyRound
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import Image from 'next/image'

// ─── 타입 ─────────────────────────────────────────────────────────────────────
export interface ProjectSummary {
  id: string
  name: string
  status: string
  mustChecks?: number
  decisions?: number
  risks?: number
}

interface SidebarProps {
  projectId?: string
  projectName?: string
  pendingMustChecks?: number
  pendingDecisions?: number
  pendingRisks?: number
  /** 전체 프로젝트 리스트 (스위처용) */
  projects?: ProjectSummary[]
  /** 모바일: 사이드바 열림 상태 */
  isOpen?: boolean
  /** 모바일: 닫기 콜백 */
  onClose?: () => void
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
  { label: '대시보드', href: `/projects/${projectId}/dashboard`, icon: LayoutDashboard, section: 'main' },
  { label: '기능 목록', href: `/projects/${projectId}/features`, icon: ListChecks, section: 'main' },
  { label: '주간 계획', href: `/projects/${projectId}/weekly-plan`, icon: Calendar, section: 'main' },
  { label: '일일 보고', href: `/projects/${projectId}/reports`, icon: FileText, section: 'main' },
  { label: '통합 결정함', href: `/projects/${projectId}/overview`, icon: Layers, section: 'decision', badge: 'combined' as const },
  { label: '변경 요청', href: `/projects/${projectId}/change-requests`, icon: GitBranch, section: 'main' },
  { label: '주간 리포트', href: `/projects/${projectId}/weekly-report`, icon: BarChart3, section: 'main' },
  { label: '분쟁 대비 센터', href: `/projects/${projectId}/dispute-center`, icon: ShieldAlert, section: 'main' },
  { label: '작업센터', href: `/projects/${projectId}/jobs`, icon: Cpu, section: 'main' },
  { label: '설정', href: `/projects/${projectId}/settings`, icon: Settings, section: 'main' },
]

// ─── 상태 레이블/색상 ─────────────────────────────────────────────────────────
const statusInfo: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active:    { label: '진행 중', color: 'text-green-400', icon: FolderOpen },
  paused:    { label: '일시중지', color: 'text-yellow-400', icon: Folder },
  completed: { label: '완료', color: 'text-blue-400', icon: CheckCircle2 },
  archived:  { label: '보관', color: 'text-slate-500', icon: Archive },
  on_hold:   { label: '보류', color: 'text-orange-400', icon: Folder },
  cancelled: { label: '취소', color: 'text-red-400', icon: Folder },
}

export default function AppSidebar({
  projectId,
  projectName,
  pendingMustChecks = 0,
  pendingDecisions = 0,
  pendingRisks = 0,
  projects = [],
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [decisionExpanded, setDecisionExpanded] = useState(true)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [projectFilter, setProjectFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const combinedCount = pendingMustChecks + pendingDecisions + pendingRisks

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  // 링크 클릭 시 모바일에서 사이드바 닫기
  const handleNavClick = () => {
    onClose?.()
  }

  // 프로젝트 필터링
  const filteredProjects = projects.filter(p => {
    const matchFilter =
      projectFilter === 'all' ? true :
      projectFilter === 'active' ? (p.status === 'active' || p.status === 'paused' || p.status === 'on_hold') :
      p.status === 'archived' || p.status === 'completed' || p.status === 'cancelled'
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchFilter && matchSearch
  })

  const activeCount = projects.filter(p => p.status === 'active' || p.status === 'paused').length
  const archivedCount = projects.filter(p => p.status === 'archived' || p.status === 'completed').length

  return (
    <>
      {/* ── 모바일 백드롭 오버레이 ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ── 사이드바 본체 ── */}
      <aside
        className="w-64 bg-slate-900 min-h-screen flex flex-col border-r border-slate-800 fixed top-0 left-0 z-40 h-full transition-transform duration-300 ease-in-out lg:relative"
        style={{
          transform: isDesktop ? 'translateX(0)' : isOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* ── 로고 ── */}
        <div className="p-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3 group" onClick={handleNavClick}>
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
            {/* 모바일 닫기 버튼 */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              aria-label="사이드바 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── 프로젝트 스위처 ── */}
        <div className="flex-shrink-0 border-b border-slate-800">
          {/* 스위처 트리거 */}
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-slate-800/60 transition-colors group"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0 text-left">
              {projectName ? (
                <>
                  <p className="text-slate-400 text-xs leading-none mb-0.5">현재 프로젝트</p>
                  <p className="text-white text-xs font-semibold truncate">{projectName}</p>
                </>
              ) : (
                <p className="text-slate-400 text-xs">프로젝트 선택</p>
              )}
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 flex-shrink-0 transition-colors" />
          </button>

          {/* 스위처 드롭다운 */}
          {switcherOpen && (
            <div className="bg-slate-800/50 border-t border-slate-700/50">
              {/* 검색 */}
              <div className="px-3 py-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="프로젝트 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 text-slate-300 text-xs pl-7 pr-2 py-1.5 rounded-md border border-slate-700 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 필터 탭 */}
              <div className="flex px-3 pb-1.5 gap-1">
                {([
                  { key: 'all', label: `전체 ${projects.length}`, },
                  { key: 'active', label: `진행 ${activeCount}` },
                  { key: 'archived', label: `완료 ${archivedCount}` },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setProjectFilter(tab.key)}
                    className={cn(
                      'flex-1 text-xs py-1 rounded transition-colors',
                      projectFilter === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 프로젝트 목록 */}
              <div className="max-h-52 overflow-y-auto pb-1">
                {filteredProjects.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-3">프로젝트 없음</p>
                ) : filteredProjects.map(p => {
                  const info = statusInfo[p.status] || statusInfo.active
                  const StatusIcon = info.icon
                  const isCurrent = p.id === projectId
                  const totalBadge = (p.mustChecks || 0) + (p.decisions || 0) + (p.risks || 0)
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        router.push(`/projects/${p.id}/dashboard`)
                        setSwitcherOpen(false)
                        onClose?.()
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700/60 transition-colors',
                        isCurrent && 'bg-blue-600/20'
                      )}
                    >
                      <StatusIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isCurrent ? 'text-blue-400' : info.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-xs font-medium truncate',
                          isCurrent ? 'text-blue-300' : 'text-slate-300'
                        )}>
                          {p.name}
                        </p>
                        <p className={`text-xs ${info.color}`}>{info.label}</p>
                      </div>
                      {totalBadge > 0 && (
                        <span className="text-xs bg-red-600/80 text-white px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                          {totalBadge}
                        </span>
                      )}
                      {isCurrent && <ChevronRight className="w-3 h-3 text-blue-400 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>

              {/* 새 프로젝트 버튼 */}
              <div className="px-3 pb-3 pt-1 border-t border-slate-700/50 mt-1">
                <Link href="/projects/new" onClick={() => { setSwitcherOpen(false); onClose?.() }}>
                  <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 rounded-md transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    새 프로젝트 만들기
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── 네비게이션 ── */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {projectId ? (
            <>
              {/* 일반 메뉴 (결정함 앞) */}
              {navItems(projectId).filter(i => i.section === 'main').slice(0, 4).map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href} onClick={handleNavClick}>
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
                  <Link href={`/projects/${projectId}/overview`} className="flex-1" onClick={handleNavClick}>
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
                        <Link key={sub.href} href={sub.href} onClick={handleNavClick}>
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
                  <Link key={item.href} href={item.href} onClick={handleNavClick}>
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
            /* 프로젝트 미선택 상태: 프로젝트 리스트 표시 */
            <div className="space-y-1 py-2">
              <p className="text-xs text-slate-600 px-3 pb-1 font-medium uppercase tracking-wider">내 프로젝트</p>
              {projects.length === 0 ? (
                <div className="text-center py-6">
                  <Folder className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-500 text-xs mb-3">프로젝트가 없습니다</p>
                  <Link href="/projects/new" onClick={handleNavClick}>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 gap-2 text-xs h-7">
                      <Plus className="w-3.5 h-3.5" />
                      새 프로젝트
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  {projects.slice(0, 8).map(p => {
                    const info = statusInfo[p.status] || statusInfo.active
                    const StatusIcon = info.icon
                    const totalBadge = (p.mustChecks || 0) + (p.decisions || 0) + (p.risks || 0)
                    return (
                      <Link key={p.id} href={`/projects/${p.id}/dashboard`} onClick={handleNavClick}>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors group">
                          <StatusIcon className={`w-3.5 h-3.5 flex-shrink-0 ${info.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-300 font-medium truncate group-hover:text-white">{p.name}</p>
                            <p className={`text-xs ${info.color}`}>{info.label}</p>
                          </div>
                          {totalBadge > 0 && (
                            <span className="text-xs bg-red-600/80 text-white px-1.5 py-0.5 rounded-full font-bold">
                              {totalBadge}
                            </span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                  {projects.length > 8 && (
                    <p className="text-xs text-slate-600 px-3 py-1">외 {projects.length - 8}개...</p>
                  )}
                </>
              )}
            </div>
          )}
        </nav>

        {/* ── 하단 고정 ── */}
        <div className="p-2 border-t border-slate-800 space-y-0.5 flex-shrink-0">
          {/* 전체 대시보드 */}
          <Link href="/dashboard" onClick={handleNavClick}>
            <div className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm',
              pathname === '/dashboard' && 'bg-slate-800 text-white'
            )}>
              <LayoutDashboard className="w-4 h-4" />
              <span>전체 대시보드</span>
            </div>
          </Link>

          {/* 새 프로젝트 */}
          <Link href="/projects/new" onClick={handleNavClick}>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm">
              <Plus className="w-4 h-4" />
              <span>새 프로젝트</span>
            </div>
          </Link>

          {/* Discord / 알림 연동 */}
          {projectId && (
            <Link href={`/projects/${projectId}/settings#discord`} onClick={handleNavClick}>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors text-sm">
                <Plug className="w-4 h-4" />
                <span className="flex-1">Discord 연동</span>
                <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">알림</span>
              </div>
            </Link>
          )}

          {/* API 키 관리 */}
          <Link href="/admin/env-update" onClick={handleNavClick}>
            <div className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors text-sm',
              pathname === '/admin/env-update' && 'bg-slate-800 text-slate-300'
            )}>
              <KeyRound className="w-4 h-4" />
              <span className="flex-1">API 키 관리</span>
            </div>
          </Link>

          {/* 버전 */}
          <div className="pt-1.5 border-t border-slate-800/50">
            <p className="text-slate-700 text-xs px-3 pb-0.5">김PM v2.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}

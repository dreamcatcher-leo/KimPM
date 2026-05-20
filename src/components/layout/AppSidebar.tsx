'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ListChecks, Calendar, FileText, AlertTriangle,
  CheckSquare, Scale, GitBranch, BarChart3, Settings, ChevronRight,
  Bell, Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface SidebarProps {
  projectId?: string
  projectName?: string
  pendingMustChecks?: number
  pendingDecisions?: number
}

const navItems = (projectId: string) => [
  {
    label: '대시보드',
    href: `/projects/${projectId}/dashboard`,
    icon: LayoutDashboard,
  },
  {
    label: '기능 목록',
    href: `/projects/${projectId}/features`,
    icon: ListChecks,
  },
  {
    label: '주간 계획',
    href: `/projects/${projectId}/weekly-plan`,
    icon: Calendar,
  },
  {
    label: '일일 보고',
    href: `/projects/${projectId}/reports`,
    icon: FileText,
  },
  {
    label: 'Must-Check',
    href: `/projects/${projectId}/must-check`,
    icon: Bell,
    badge: 'mustCheck' as const,
  },
  {
    label: '리스크',
    href: `/projects/${projectId}/risks`,
    icon: AlertTriangle,
  },
  {
    label: '의사결정함',
    href: `/projects/${projectId}/decisions`,
    icon: Scale,
    badge: 'decisions' as const,
  },
  {
    label: '변경 요청',
    href: `/projects/${projectId}/change-requests`,
    icon: GitBranch,
  },
  {
    label: '주간 리포트',
    href: `/projects/${projectId}/weekly-report`,
    icon: BarChart3,
  },
  {
    label: '설정',
    href: `/projects/${projectId}/settings`,
    icon: Settings,
  },
]

export default function AppSidebar({
  projectId,
  projectName,
  pendingMustChecks = 0,
  pendingDecisions = 0,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-slate-900 min-h-screen flex flex-col border-r border-slate-700">
      {/* Logo */}
      <div className="p-4 border-b border-slate-700">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            DG
          </div>
          <div>
            <p className="text-white font-semibold text-sm">DeliveryGuard PM</p>
            <p className="text-slate-500 text-xs">for BeforePet</p>
          </div>
        </Link>
      </div>

      {/* Project Selector */}
      {projectName && (
        <div className="p-3 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs mb-1">현재 프로젝트</p>
              <p className="text-white text-sm font-medium truncate">{projectName}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {projectId ? (
          navItems(projectId).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const badgeCount = item.badge === 'mustCheck' ? pendingMustChecks
              : item.badge === 'decisions' ? pendingDecisions
              : 0

            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {badgeCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 min-w-5 text-xs px-1"
                    >
                      {badgeCount}
                    </Badge>
                  )}
                </div>
              </Link>
            )
          })
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

      {/* Bottom Links */}
      <div className="p-3 border-t border-slate-700 space-y-1">
        <Link href="/dashboard">
          <div className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors',
            pathname === '/dashboard' && 'bg-slate-800 text-white'
          )}>
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-sm">전체 대시보드</span>
          </div>
        </Link>
        <Link href="/projects/new">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm">새 프로젝트</span>
          </div>
        </Link>
      </div>
    </aside>
  )
}

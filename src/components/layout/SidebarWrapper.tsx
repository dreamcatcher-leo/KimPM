'use client'

import { useState } from 'react'
import AppSidebar from './AppSidebar'
import TopBar from './TopBar'
import type { ProjectSummary } from './AppSidebar'
import type { Profile } from '@/types'

interface SidebarWrapperProps {
  projectId?: string
  projectName?: string
  pendingMustChecks?: number
  pendingDecisions?: number
  pendingRisks?: number
  projects?: ProjectSummary[]
  profile: Profile | null
  children: React.ReactNode
  topBarTitle?: string
}

export default function SidebarWrapper({
  projectId,
  projectName,
  pendingMustChecks = 0,
  pendingDecisions = 0,
  pendingRisks = 0,
  projects = [],
  profile,
  children,
  topBarTitle,
}: SidebarWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar
        projectId={projectId}
        projectName={projectName}
        pendingMustChecks={pendingMustChecks}
        pendingDecisions={pendingDecisions}
        pendingRisks={pendingRisks}
        projects={projects}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {/* 데스크톱에서 사이드바 너비 확보 */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          profile={profile}
          title={topBarTitle}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

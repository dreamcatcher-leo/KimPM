'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Clock, BarChart3, Activity, FileText, Download
} from 'lucide-react'
import type { Project, Feature, Report, WeeklyPlan } from '@/types'

interface CompletionWithFeature {
  id: string
  feature_id: string
  status: string
  summary: string
  created_at: string
  features: { order_key: string; name: string; priority: string } | null
}

interface ChangeRequestWithFeature {
  id: string
  title: string
  status: string
  priority_level: string | null
  created_at: string
  features: { order_key: string; name: string } | null
}

interface Risk {
  id: string
  title: string
  level: string
  is_resolved: boolean
  created_at: string
}

interface WeeklyReportClientProps {
  project: Project | null
  reports: (Report & { daily_assessments?: { alignment_signal?: string }[] })[]
  features: Feature[]
  completions: CompletionWithFeature[]
  weeklyPlans: WeeklyPlan[]
  changeRequests: ChangeRequestWithFeature[]
  risks: Risk[]
}

// 날짜를 주 범위로 변환
function getWeekRange(dateStr: string) {
  const date = new Date(dateStr)
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return {
    start: monday.toISOString().split('T')[0],
    end: friday.toISOString().split('T')[0],
  }
}

// 주차 목록 생성 (최근 4주)
function generateWeeks(reports: Report[]) {
  const weekSet = new Set<string>()
  reports.forEach(r => {
    const { start } = getWeekRange(r.report_date)
    weekSet.add(start)
  })
  return Array.from(weekSet).sort((a, b) => b.localeCompare(a)).slice(0, 4)
}

function WeekSummaryCard({
  weekStart,
  reports,
  completions,
  changeRequests,
  weeklyPlan,
}: {
  weekStart: string
  reports: (Report & { daily_assessments?: { alignment_signal?: string }[] })[]
  completions: CompletionWithFeature[]
  changeRequests: ChangeRequestWithFeature[]
  weeklyPlan: WeeklyPlan | undefined
}) {
  const weekEnd = (() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 4)
    return d.toISOString().split('T')[0]
  })()

  const weekReports = reports.filter(r => r.report_date >= weekStart && r.report_date <= weekEnd)
  const weekCompletions = completions.filter(c => c.created_at.slice(0, 10) >= weekStart && c.created_at.slice(0, 10) <= weekEnd)
  const weekCRs = changeRequests.filter(cr => cr.created_at.slice(0, 10) >= weekStart && cr.created_at.slice(0, 10) <= weekEnd)

  const allSignals = weekReports.flatMap(r => r.daily_assessments || [])
  const signalCounts = {
    normal: allSignals.filter(a => a.alignment_signal === 'normal').length,
    caution: allSignals.filter(a => a.alignment_signal === 'caution').length,
    check_required: allSignals.filter(a => a.alignment_signal === 'check_required').length,
  }

  const statusCounts = {
    on_track: weekReports.filter(r => r.overall_status === 'on_track').length,
    at_risk: weekReports.filter(r => r.overall_status === 'at_risk').length,
    blocked: weekReports.filter(r => r.overall_status === 'blocked').length,
  }

  const avgProgress = weekReports.length > 0
    ? Math.round(weekReports.reduce((s, r) => s + (r.progress_rate || 0), 0) / weekReports.length)
    : 0

  const overallHealth = statusCounts.blocked > 0 ? 'blocked' :
    statusCounts.at_risk > 1 || signalCounts.check_required > 0 ? 'at_risk' : 'on_track'

  const healthConfig = {
    on_track: { color: 'bg-green-100 text-green-700 border-green-200', label: '정상', icon: CheckCircle },
    at_risk: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: '주의', icon: AlertTriangle },
    blocked: { color: 'bg-red-100 text-red-700 border-red-200', label: '블록', icon: AlertTriangle },
  }
  const hc = healthConfig[overallHealth]

  const weekLabel = `${weekStart.slice(5).replace('-', '/')} ~ ${weekEnd.slice(5).replace('-', '/')}`

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-600">{weekLabel}</CardTitle>
          <Badge className={`text-xs border ${hc.color}`}>
            <hc.icon className="w-3 h-3 mr-1" />
            {hc.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 핵심 지표 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-900">{weekReports.length}</div>
            <div className="text-xs text-gray-500">보고 건수</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-xl font-bold text-blue-700">{avgProgress}%</div>
            <div className="text-xs text-gray-500">평균 진행률</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-700">{weekCompletions.filter(c => c.status === 'approved').length}</div>
            <div className="text-xs text-gray-500">완료 승인</div>
          </div>
        </div>

        {/* AI 정합성 신호 */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI 정합성 신호</div>
          <div className="flex gap-2">
            <div className="flex-1 text-center py-1.5 bg-green-50 rounded text-xs">
              <span className="font-bold text-green-700">{signalCounts.normal}</span>
              <span className="text-gray-500 ml-1">정상</span>
            </div>
            <div className="flex-1 text-center py-1.5 bg-yellow-50 rounded text-xs">
              <span className="font-bold text-yellow-700">{signalCounts.caution}</span>
              <span className="text-gray-500 ml-1">주의</span>
            </div>
            <div className="flex-1 text-center py-1.5 bg-red-50 rounded text-xs">
              <span className="font-bold text-red-700">{signalCounts.check_required}</span>
              <span className="text-gray-500 ml-1">점검</span>
            </div>
          </div>
        </div>

        {/* 보고 현황 */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">보고 상태</div>
          <div className="flex gap-1.5">
            {statusCounts.on_track > 0 && (
              <Badge className="bg-green-100 text-green-700 text-xs">✅ 정상 {statusCounts.on_track}</Badge>
            )}
            {statusCounts.at_risk > 0 && (
              <Badge className="bg-yellow-100 text-yellow-700 text-xs">⚠️ 주의 {statusCounts.at_risk}</Badge>
            )}
            {statusCounts.blocked > 0 && (
              <Badge className="bg-red-100 text-red-700 text-xs">🚫 블록 {statusCounts.blocked}</Badge>
            )}
            {weekReports.length === 0 && (
              <span className="text-xs text-gray-400">보고 없음</span>
            )}
          </div>
        </div>

        {/* 변경 요청 */}
        {weekCRs.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              변경 요청 {weekCRs.length}건
              {weekCRs.filter(c => c.status === 'approved').length > 0 && ` · 승인 ${weekCRs.filter(c => c.status === 'approved').length}`}
            </span>
          </div>
        )}

        {/* 주간 계획 달성률 */}
        {weeklyPlan && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1">주간 계획</div>
            <div className="text-xs font-medium text-gray-700">
              {weeklyPlan.status === 'approved' ? '✅ 계획 승인됨' : '📋 계획 초안'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function OverallStats({
  features,
  completions,
  reports,
  risks,
  changeRequests,
}: {
  features: Feature[]
  completions: CompletionWithFeature[]
  reports: WeeklyReportClientProps['reports']
  risks: Risk[]
  changeRequests: ChangeRequestWithFeature[]
}) {
  const p0Features = features.filter(f => f.priority === 'P0')
  const p1Features = features.filter(f => f.priority === 'P1')
  const approvedCompletions = completions.filter(c => c.status === 'approved')

  const allSignals = reports.flatMap(r => r.daily_assessments || [])
  const signalCounts = {
    normal: allSignals.filter(a => a.alignment_signal === 'normal').length,
    caution: allSignals.filter(a => a.alignment_signal === 'caution').length,
    check_required: allSignals.filter(a => a.alignment_signal === 'check_required').length,
  }

  const avgProgress = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + (r.progress_rate || 0), 0) / reports.length)
    : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase">기능 완료</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {approvedCompletions.length}<span className="text-sm text-gray-400">/{features.length}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">P0: {p0Features.length}개 · P1: {p1Features.length}개</div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase">평균 진행률</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{avgProgress}%</div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${avgProgress >= 70 ? 'bg-green-500' : avgProgress >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase">AI 신호</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{allSignals.length}</div>
          <div className="text-xs text-gray-500 mt-1">
            점검 {signalCounts.check_required} · 주의 {signalCounts.caution} · 정상 {signalCounts.normal}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase">미해소 리스크</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{risks.filter(r => !r.is_resolved).length}</div>
          <div className="text-xs text-gray-500 mt-1">
            고위험 {risks.filter(r => !r.is_resolved && (r.level === 'high' || r.level === 'critical')).length}건
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function WeeklyReportClient({
  project,
  reports,
  features,
  completions,
  weeklyPlans,
  changeRequests,
  risks,
}: WeeklyReportClientProps) {
  const weeks = useMemo(() => generateWeeks(reports), [reports])

  const getWeeklyPlan = (weekStart: string) =>
    weeklyPlans.find(wp => wp.week_start === weekStart)

  return (
    <div>
      {/* 전체 통계 */}
      <OverallStats
        features={features}
        completions={completions}
        reports={reports}
        risks={risks}
        changeRequests={changeRequests}
      />

      <Tabs defaultValue="weekly">
        <TabsList className="mb-4">
          <TabsTrigger value="weekly">주차별 요약</TabsTrigger>
          <TabsTrigger value="features">기능 현황</TabsTrigger>
          <TabsTrigger value="risks">리스크 추적</TabsTrigger>
        </TabsList>

        {/* 주차별 요약 */}
        <TabsContent value="weekly">
          {weeks.length === 0 ? (
            <Card className="border border-dashed border-gray-200">
              <CardContent className="p-8 text-center">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">최근 4주간 보고 데이터가 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weeks.map(weekStart => (
                <WeekSummaryCard
                  key={weekStart}
                  weekStart={weekStart}
                  reports={reports}
                  completions={completions}
                  changeRequests={changeRequests}
                  weeklyPlan={getWeeklyPlan(weekStart)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* 기능 현황 */}
        <TabsContent value="features">
          <div className="space-y-4">
            {(['P0', 'P1', 'P2', 'P3'] as const).map(priority => {
              const priorityFeatures = features.filter(f => f.priority === priority)
              if (priorityFeatures.length === 0) return null

              return (
                <div key={priority}>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                    <Badge className={
                      priority === 'P0' ? 'bg-red-100 text-red-700' :
                      priority === 'P1' ? 'bg-orange-100 text-orange-700' :
                      priority === 'P2' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }>{priority}</Badge>
                    {priorityFeatures.length}개
                  </h3>
                  <div className="space-y-2">
                    {priorityFeatures.map(f => {
                      const featureCompletions = completions.filter(c => c.feature_id === f.id)
                      const approved = featureCompletions.find(c => c.status === 'approved')
                      const pending = featureCompletions.find(c => c.status === 'pending')

                      return (
                        <Card key={f.id} className="border border-gray-200">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-gray-400 mr-2">{f.order_key}</span>
                              <span className="text-sm font-medium text-gray-800">{f.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {approved ? (
                                <Badge className="bg-green-100 text-green-700 text-xs">✅ 완료</Badge>
                              ) : pending ? (
                                <Badge className="bg-yellow-100 text-yellow-700 text-xs">🔍 검토중</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-500 text-xs">진행중</Badge>
                              )}
                              {f.spec_status === 'approved' && (
                                <Badge className="bg-blue-50 text-blue-600 text-xs border border-blue-200">정의서 ✓</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* 리스크 추적 */}
        <TabsContent value="risks">
          <div className="space-y-3">
            {risks.length === 0 ? (
              <Card className="border border-dashed border-gray-200">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">등록된 리스크가 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              risks.map(risk => (
                <Card key={risk.id} className={`border ${risk.is_resolved ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge className={
                          risk.level === 'critical' ? 'bg-red-100 text-red-700 text-xs' :
                          risk.level === 'high' ? 'bg-orange-100 text-orange-700 text-xs' :
                          risk.level === 'medium' ? 'bg-yellow-100 text-yellow-700 text-xs' :
                          'bg-gray-100 text-gray-600 text-xs'
                        }>
                          {risk.level === 'critical' ? '심각' : risk.level === 'high' ? '높음' : risk.level === 'medium' ? '보통' : '낮음'}
                        </Badge>
                        {risk.is_resolved && <Badge className="bg-green-100 text-green-600 text-xs">해소됨</Badge>}
                      </div>
                      <span className="text-sm text-gray-800">{risk.title}</span>
                    </div>
                    <span className="text-xs text-gray-400">{risk.created_at.slice(0, 10)}</span>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Zap, CheckCircle, Calendar, ChevronDown, ChevronUp,
  Layers, AlertTriangle, RefreshCw, MessageSquare, Clock,
  Target, Package, FileCheck,
} from 'lucide-react'
import type { WeeklyPlan, Feature, WeeklyPlanContent, WeeklyPlanGoal } from '@/types'

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  draft:         { label: 'AI 초안',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',  dot: 'bg-yellow-400' },
  vendor_agreed: { label: '외주사 동의', color: 'bg-blue-100 text-blue-700 border-blue-200',        dot: 'bg-blue-400' },
  approved:      { label: '✅ 승인됨',  color: 'bg-green-100 text-green-700 border-green-200',     dot: 'bg-green-400' },
  completed:     { label: '완료',       color: 'bg-gray-100 text-gray-600 border-gray-200',         dot: 'bg-gray-400' },
}

interface WeeklyPlanClientProps {
  projectId: string
  plans: WeeklyPlan[]
  features: Feature[]
  thisWeekStart: string
  thisWeekEnd: string
  contractStart?: string
  contractEnd?: string
  totalWeeks?: number
}

// ─── PlanContent 렌더러 ────────────────────────────────────────────────────
function PlanContent({ content }: { content: WeeklyPlanContent | null }) {
  if (!content) return <p className="text-sm text-slate-400 py-4 text-center">내용 없음</p>

  const goals: WeeklyPlanGoal[] = content.goals ?? []
  const featurePlans = content.feature_plans ?? []
  const deliverables = content.deliverables ?? []

  return (
    <div className="space-y-5">
      {/* 요약 */}
      {content.summary && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">이번 주 방향</span>
          </div>
          <p className="text-sm text-blue-900 leading-relaxed">{content.summary}</p>
        </div>
      )}

      {/* 기능별 목표 (WeeklyPlanGoal 형식 — {feature, target, risk, deliverable}) */}
      {goals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">기능별 목표</p>
            <span className="text-xs text-slate-400">{goals.length}개</span>
          </div>
          <div className="space-y-2">
            {goals.map((g: WeeklyPlanGoal, i: number) => (
              <div key={i} className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    {g.feature}
                  </span>
                  {g.risk && g.risk !== '없음' && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      {g.risk}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">🎯 {g.target}</p>
                {g.deliverable && (
                  <p className="text-xs text-green-700 flex items-center gap-1.5">
                    <Package className="w-3 h-3 flex-shrink-0" />
                    산출물: {g.deliverable}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 기능별 계획 (FeaturePlan 형식 — feature_name, planned_work, expected_output) */}
      {featurePlans.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">기능별 작업 계획</p>
          </div>
          <div className="space-y-2">
            {featurePlans.map((fp, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-3.5 bg-white">
                <p className="text-sm font-semibold text-slate-900 mb-1.5">{fp.feature_name}</p>
                {fp.planned_work && (
                  <p className="text-xs text-slate-600 mb-1">
                    <span className="font-medium">작업:</span> {fp.planned_work}
                  </p>
                )}
                {fp.expected_output && (
                  <p className="text-xs text-green-700 flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    {fp.expected_output}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 주간 산출물 */}
      {deliverables.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileCheck className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">주간 제출 산출물</p>
          </div>
          <ul className="space-y-1.5">
            {deliverables.map((d, i) => (
              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 참고사항 */}
      {content.notes && (
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-medium text-slate-500">외주사 전달 메시지</p>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{content.notes}</p>
        </div>
      )}

      {/* 아무 내용도 없는 fallback */}
      {goals.length === 0 && featurePlans.length === 0 && deliverables.length === 0 && !content.summary && (
        <div className="text-center py-6">
          <AlertTriangle className="w-8 h-8 text-amber-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">계획 내용을 불러올 수 없습니다</p>
          <p className="text-xs text-slate-300 mt-1">계획을 재생성해 주세요</p>
        </div>
      )}
    </div>
  )
}

// ─── PlanCard ─────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  isThisWeek,
  isExpanded,
  onToggle,
  onApprove,
  isApproving,
}: {
  plan: WeeklyPlan
  isThisWeek: boolean
  isExpanded: boolean
  onToggle: () => void
  onApprove: (id: string) => void
  isApproving: string | null
}) {
  const config = statusConfig[plan.status] || statusConfig.draft
  const hasVendorModified = !!plan.vendor_modified
  const hasFinalPlan = !!plan.final_plan
  const canApprove = plan.status === 'draft' || plan.status === 'vendor_agreed'

  return (
    <Card className={`overflow-hidden transition-shadow ${isThisWeek ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-slate-900 text-sm">
                {plan.week_start} ~ {plan.week_end}
              </p>
              {isThisWeek && (
                <Badge className="bg-blue-100 text-blue-700 text-xs border-blue-200 py-0">이번 주</Badge>
              )}
              <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium ${config.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                {config.label}
              </span>
            </div>
            {hasVendorModified && (
              <p className="text-xs text-purple-600 mt-0.5">외주사 수정안 있음</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canApprove && (
            <Button
              size="sm"
              className="gap-1.5 bg-green-600 hover:bg-green-500 text-xs h-7"
              onClick={(e) => { e.stopPropagation(); onApprove(plan.id) }}
              disabled={isApproving === plan.id}
            >
              <CheckCircle className="w-3 h-3" />
              {isApproving === plan.id ? '승인 중...' : '승인'}
            </Button>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* 본문 */}
      {isExpanded && (
        <CardContent className="pt-0 pb-4 border-t border-slate-100">
          <Tabs defaultValue={hasFinalPlan ? 'final' : hasVendorModified ? 'vendor' : 'ai'}>
            <TabsList className="mb-4 mt-3">
              <TabsTrigger value="ai" className="gap-1.5">
                <Zap className="w-3 h-3" />AI 초안
              </TabsTrigger>
              {hasVendorModified && (
                <TabsTrigger value="vendor" className="gap-1.5">
                  <MessageSquare className="w-3 h-3" />외주사 수정
                </TabsTrigger>
              )}
              {hasFinalPlan && (
                <TabsTrigger value="final" className="gap-1.5">
                  <FileCheck className="w-3 h-3" />최종 계획
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="ai">
              <PlanContent content={plan.ai_draft} />
            </TabsContent>
            {hasVendorModified && (
              <TabsContent value="vendor">
                <PlanContent content={plan.vendor_modified} />
                {plan.vendor_comment && (
                  <div className="mt-4 bg-purple-50 rounded-xl p-3 border border-purple-100">
                    <p className="text-xs font-medium text-purple-700 mb-1">외주사 코멘트</p>
                    <p className="text-sm text-purple-700 leading-relaxed">{plan.vendor_comment}</p>
                  </div>
                )}
              </TabsContent>
            )}
            {hasFinalPlan && (
              <TabsContent value="final">
                <PlanContent content={plan.final_plan} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      )}
    </Card>
  )
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────
export default function WeeklyPlanClient({
  projectId,
  plans,
  features,
  thisWeekStart,
  thisWeekEnd,
  contractStart,
  contractEnd,
  totalWeeks,
}: WeeklyPlanClientProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isBulkGenerating, setIsBulkGenerating] = useState(false)
  const [isApproving, setIsApproving] = useState<string | null>(null)
  const [allPlans, setAllPlans] = useState(plans)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(plans[0]?.id || null)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

  const thisWeekPlan = allPlans.find(p => p.week_start === thisWeekStart)
  const approvedCount = allPlans.filter(p => p.status === 'approved').length

  // ── 단일 주 생성 ────────────────────────────────────────────────────────
  const generatePlan = async (forceRefresh = false) => {
    setIsGenerating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/weekly-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start: thisWeekStart,
          week_end: thisWeekEnd,
          feature_ids: features.map(f => f.id),
          force_refresh: forceRefresh,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.cached) {
        toast.info('이미 생성된 계획이 있습니다. 강제 재생성하려면 "재생성" 버튼을 누르세요')
        setAllPlans(prev => {
          const exists = prev.find(p => p.id === data.plan.id)
          if (exists) return prev
          return [data.plan, ...prev]
        })
      } else {
        setAllPlans(prev => [data.plan, ...prev.filter(p => p.id !== data.plan.id)])
        setExpandedPlan(data.plan.id)
        toast.success('주간 계획 초안이 생성되었습니다')
      }
    } catch (err) {
      toast.error('생성 실패: ' + (err instanceof Error ? err.message : '오류'))
    } finally {
      setIsGenerating(false)
    }
  }

  // ── 전체 기간 일괄 생성 ─────────────────────────────────────────────────
  const bulkGenerate = async (force = false) => {
    setIsBulkGenerating(true)
    setBulkProgress({ done: 0, total: totalWeeks || 0 })
    try {
      const res = await fetch(`/api/projects/${projectId}/weekly-plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'bulk_generate', force }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setBulkProgress({ done: data.generated, total: data.total_weeks })

      // 새로 생성된 계획들 로드
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: refreshed } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('project_id', projectId)
        .order('week_start', { ascending: false })
        .limit(52)
      if (refreshed) setAllPlans(refreshed as WeeklyPlan[])

      toast.success(
        `전체 ${data.total_weeks}주 계획 완료 — 생성 ${data.generated}주, 스킵 ${data.skipped}주${data.errors > 0 ? `, 오류 ${data.errors}주` : ''}`
      )
    } catch (err) {
      toast.error('일괄 생성 실패: ' + (err instanceof Error ? err.message : '오류'))
    } finally {
      setIsBulkGenerating(false)
      setBulkProgress(null)
    }
  }

  // ── 승인 ────────────────────────────────────────────────────────────────
  const approvePlan = async (planId: string) => {
    setIsApproving(planId)
    try {
      const res = await fetch(`/api/projects/${projectId}/weekly-plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'approve', plan_id: planId }),
      })
      if (!res.ok) throw new Error('승인 실패')
      setAllPlans(prev =>
        prev.map(p => p.id === planId
          ? { ...p, status: 'approved', founder_approved_at: new Date().toISOString() }
          : p
        )
      )
      toast.success('주간 계획이 승인되었습니다. 외주사 Discord로 공유됩니다')
    } catch {
      toast.error('승인 실패')
    } finally {
      setIsApproving(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 상단 컨트롤 바 ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* 좌측: 계획 생성 버튼 — 전체 N주 우선, 이번 주는 보조 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 전체 기간 일괄 생성 — 메인 버튼 */}
          {contractStart && contractEnd && (
            <Button
              onClick={() => bulkGenerate(false)}
              disabled={isGenerating || isBulkGenerating}
              className="gap-2 bg-green-600 hover:bg-green-500"
            >
              <Layers className={`w-4 h-4 ${isBulkGenerating ? 'animate-pulse' : ''}`} />
              {isBulkGenerating
                ? bulkProgress
                  ? `생성 중 ${bulkProgress.done}/${bulkProgress.total}주...`
                  : '준비 중...'
                : `전체 ${totalWeeks || '?'}주 계획 생성`
              }
            </Button>
          )}

          {/* 이번 주 단독 생성 — 보조 버튼 */}
          {!thisWeekPlan ? (
            <Button
              onClick={() => generatePlan(false)}
              disabled={isGenerating || isBulkGenerating}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Zap className="w-4 h-4" />
              {isGenerating ? 'AI 생성 중...' : '이번 주만 생성'}
            </Button>
          ) : (
            <Button
              onClick={() => generatePlan(true)}
              disabled={isGenerating || isBulkGenerating}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? '재생성 중...' : '이번 주 재생성'}
            </Button>
          )}
        </div>

        {/* 우측: 통계 */}
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            총 {allPlans.length}주
          </span>
          <span className="flex items-center gap-1.5 text-green-600">
            <CheckCircle className="w-3.5 h-3.5" />
            승인 {approvedCount}주
          </span>
          {allPlans.length > 0 && totalWeeks && (
            <span className="text-xs text-slate-400">
              ({Math.round((allPlans.length / totalWeeks) * 100)}% 생성됨)
            </span>
          )}
        </div>
      </div>

      {/* 일괄 생성 진행 안내 */}
      {isBulkGenerating && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-purple-600 animate-pulse" />
            <span className="text-sm font-medium text-purple-800">전체 기간 주간 계획 생성 중...</span>
          </div>
          {bulkProgress && (
            <div className="space-y-1.5">
              <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-purple-600">{bulkProgress.done} / {bulkProgress.total}주 완료</p>
            </div>
          )}
          <p className="text-xs text-purple-600 mt-2">
            각 주차별로 AI가 순차 생성합니다. 완료까지 1~3분 소요될 수 있습니다
          </p>
        </div>
      )}

      {/* 안내 문구 */}
      <p className="text-xs text-slate-400">
        💡 승인된 계획은 외주사에게 Discord로 자동 공유됩니다. 외주사는 수정안을 제출할 수 있습니다.
      </p>

      {/* ── 계획 목록 ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {allPlans.length > 0 ? (
          allPlans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isThisWeek={plan.week_start === thisWeekStart}
              isExpanded={expandedPlan === plan.id}
              onToggle={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
              onApprove={approvePlan}
              isApproving={isApproving}
            />
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-slate-500 mb-2">주간 계획 없음</h3>
            <p className="text-sm text-slate-400 mb-4">
              AI가 기능 목록을 바탕으로 주간 계획 초안을 생성합니다
            </p>
            {contractStart && contractEnd && (
              <Button
                onClick={() => bulkGenerate(false)}
                variant="outline"
                size="sm"
                className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Layers className="w-4 h-4" />
                전체 기간 한 번에 생성
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

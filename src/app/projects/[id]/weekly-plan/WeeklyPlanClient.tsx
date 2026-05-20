'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Zap, CheckCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import type { WeeklyPlan, Feature, WeeklyPlanContent } from '@/types'

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'AI 초안', color: 'bg-yellow-100 text-yellow-700' },
  vendor_agreed: { label: '외주사 동의', color: 'bg-blue-100 text-blue-700' },
  approved: { label: '✅ 승인됨', color: 'bg-green-100 text-green-700' },
  completed: { label: '완료', color: 'bg-gray-100 text-gray-600' },
}

interface WeeklyPlanClientProps {
  projectId: string
  plans: WeeklyPlan[]
  features: Feature[]
  thisWeekStart: string
  thisWeekEnd: string
}

export default function WeeklyPlanClient({ projectId, plans, features, thisWeekStart, thisWeekEnd }: WeeklyPlanClientProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApproving, setIsApproving] = useState<string | null>(null)
  const [allPlans, setAllPlans] = useState(plans)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(plans[0]?.id || null)

  const thisWeekPlan = allPlans.find(p => p.week_start === thisWeekStart)

  const generatePlan = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/weekly-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start: thisWeekStart,
          week_end: thisWeekEnd,
          feature_ids: features.map(f => f.id),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAllPlans(prev => [data.plan, ...prev.filter(p => p.id !== data.plan.id)])
      setExpandedPlan(data.plan.id)
      toast.success('주간 계획 초안이 생성되었습니다')
    } catch (err) {
      toast.error('생성 실패: ' + (err instanceof Error ? err.message : '오류'))
    } finally {
      setIsGenerating(false)
    }
  }

  const approvePlan = async (planId: string) => {
    setIsApproving(planId)
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { error } = await supabase
        .from('weekly_plans')
        .update({
          status: 'approved',
          final_plan: allPlans.find(p => p.id === planId)?.vendor_modified
            || allPlans.find(p => p.id === planId)?.ai_draft,
          founder_approved_at: new Date().toISOString(),
        })
        .eq('id', planId)
      if (error) throw error
      setAllPlans(prev => prev.map(p => p.id === planId ? { ...p, status: 'approved' } : p))
      toast.success('주간 계획이 승인되었습니다')
    } catch {
      toast.error('승인 실패')
    } finally {
      setIsApproving(null)
    }
  }

  function PlanContent({ content }: { content: WeeklyPlanContent | null }) {
    if (!content) return <p className="text-sm text-slate-400">내용 없음</p>
    return (
      <div className="space-y-4">
        {content.summary && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-800 font-medium">{content.summary}</p>
          </div>
        )}
        {content.goals && content.goals.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">이번 주 목표</p>
            <ul className="space-y-1">
              {content.goals.map((g, i) => (
                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-blue-500 flex-shrink-0">•</span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}
        {content.feature_plans && content.feature_plans.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">기능별 계획</p>
            <div className="space-y-2">
              {content.feature_plans.map((fp, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-slate-900">{fp.feature_name}</p>
                  <p className="text-xs text-slate-600 mt-1">작업: {fp.planned_work}</p>
                  <p className="text-xs text-green-600 mt-0.5">산출물: {fp.expected_output}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {content.deliverables && content.deliverables.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">주간 산출물</p>
            <ul className="space-y-1">
              {content.deliverables.map((d, i) => (
                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}
        {content.notes && (
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs font-medium text-slate-500 mb-1">참고사항</p>
            <p className="text-sm text-slate-700">{content.notes}</p>
          </div>
        )}
      </div>
    )
  }

  function PlanCard({ plan }: { plan: WeeklyPlan }) {
    const isExpanded = expandedPlan === plan.id
    const config = statusConfig[plan.status] || statusConfig.draft
    const displayContent = plan.final_plan || plan.vendor_modified || plan.ai_draft

    return (
      <Card>
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer"
          onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-500" />
            <div>
              <p className="font-medium text-slate-900 text-sm">
                {plan.week_start} ~ {plan.week_end}
              </p>
              {plan.week_start === thisWeekStart && (
                <Badge variant="outline" className="text-xs mt-0.5">이번 주</Badge>
              )}
            </div>
            <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {plan.status === 'draft' || plan.status === 'vendor_agreed' ? (
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-500 text-xs"
                onClick={(e) => { e.stopPropagation(); approvePlan(plan.id) }}
                disabled={isApproving === plan.id}
              >
                <CheckCircle className="w-3 h-3" />
                {isApproving === plan.id ? '승인 중...' : '승인'}
              </Button>
            ) : null}
            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
        {isExpanded && (
          <CardContent className="pt-0 pb-4">
            <Tabs defaultValue="ai">
              <TabsList className="mb-3">
                <TabsTrigger value="ai">AI 초안</TabsTrigger>
                {plan.vendor_modified && <TabsTrigger value="vendor">외주사 수정</TabsTrigger>}
                {plan.final_plan && <TabsTrigger value="final">최종 계획</TabsTrigger>}
              </TabsList>
              <TabsContent value="ai">
                <PlanContent content={plan.ai_draft} />
              </TabsContent>
              {plan.vendor_modified && (
                <TabsContent value="vendor">
                  <PlanContent content={plan.vendor_modified} />
                  {plan.vendor_comment && (
                    <div className="mt-3 bg-purple-50 rounded-lg p-2">
                      <p className="text-xs font-medium text-purple-700">외주사 코멘트</p>
                      <p className="text-sm text-purple-600 mt-0.5">{plan.vendor_comment}</p>
                    </div>
                  )}
                </TabsContent>
              )}
              {plan.final_plan && (
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

  return (
    <div className="space-y-6">
      {/* This Week Controls */}
      <div className="flex items-center gap-3">
        {!thisWeekPlan ? (
          <Button
            onClick={generatePlan}
            disabled={isGenerating}
            className="gap-2 bg-blue-600 hover:bg-blue-500"
          >
            <Zap className="w-4 h-4" />
            {isGenerating ? 'AI 생성 중... (30초)' : '이번 주 계획 AI 생성'}
          </Button>
        ) : (
          <Button
            onClick={generatePlan}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            {isGenerating ? '재생성 중...' : '계획 재생성'}
          </Button>
        )}
        <p className="text-sm text-slate-500">
          승인된 계획은 외주사에게 Discord로 자동 공유됩니다
        </p>
      </div>

      {/* Plans List */}
      <div className="space-y-3">
        {allPlans.length > 0 ? (
          allPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)
        ) : (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">주간 계획 없음</h3>
            <p className="text-slate-400 text-sm">AI가 기능 목록을 바탕으로 이번 주 계획 초안을 생성합니다</p>
          </div>
        )}
      </div>
    </div>
  )
}

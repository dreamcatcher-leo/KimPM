'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Clock, Scale } from 'lucide-react'
import type { Decision, DecisionStatus } from '@/types'

const statusConfig: Record<DecisionStatus, { label: string; color: string }> = {
  pending: { label: '대기 중', color: 'bg-orange-100 text-orange-700' },
  approved: { label: '승인', color: 'bg-green-100 text-green-700' },
  rejected: { label: '반려', color: 'bg-red-100 text-red-700' },
  deferred: { label: '보류', color: 'bg-gray-100 text-gray-600' },
}

export default function DecisionsClient({ projectId, initialDecisions }: { projectId: string; initialDecisions: Decision[] }) {
  const [decisions, setDecisions] = useState(initialDecisions)
  const [processing, setProcessing] = useState<string | null>(null)
  const [decisionText, setDecisionText] = useState<Record<string, string>>({})

  const pending = decisions.filter(d => d.status === 'pending')
  const decided = decisions.filter(d => d.status !== 'pending')

  const decide = async (decisionId: string, status: DecisionStatus) => {
    setProcessing(decisionId)
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { error } = await supabase
        .from('decisions')
        .update({
          status,
          founder_decision: decisionText[decisionId] || null,
          decided_at: new Date().toISOString(),
        })
        .eq('id', decisionId)
      if (error) throw error
      setDecisions(prev => prev.map(d =>
        d.id === decisionId ? { ...d, status, founder_decision: decisionText[decisionId] } : d
      ))
      toast.success(`${statusConfig[status].label} 처리되었습니다`)
    } catch {
      toast.error('처리 실패')
    } finally {
      setProcessing(null)
    }
  }

  function DecisionCard({ decision }: { decision: Decision }) {
    const config = statusConfig[decision.status]
    const isPending = decision.status === 'pending'
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Scale className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={`text-xs py-0 h-5 ${config.color}`}>{config.label}</Badge>
                {decision.decision_type && (
                  <Badge variant="outline" className="text-xs py-0 h-5">
                    {decision.decision_type.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
              <p className="font-semibold text-slate-900">{decision.title}</p>
              {decision.description && (
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{decision.description}</p>
              )}
              {decision.ai_recommendation && (
                <div className="mt-2 bg-blue-50 rounded-lg p-2">
                  <p className="text-xs font-medium text-blue-700 mb-0.5">🤖 AI 권고</p>
                  <p className="text-xs text-blue-600">{decision.ai_recommendation}</p>
                </div>
              )}
              {decision.founder_decision && !isPending && (
                <div className="mt-2 bg-green-50 rounded-lg p-2">
                  <p className="text-xs font-medium text-green-700 mb-0.5">대표 결정</p>
                  <p className="text-xs text-green-600">{decision.founder_decision}</p>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">
                <Clock className="w-3 h-3 inline mr-1" />
                {new Date(decision.created_at).toLocaleDateString('ko-KR')}
              </p>

              {isPending && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="결정 사유 또는 코멘트 (선택사항)"
                    rows={2}
                    className="text-sm"
                    value={decisionText[decision.id] || ''}
                    onChange={e => setDecisionText(prev => ({ ...prev, [decision.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5 bg-green-600 hover:bg-green-500"
                      onClick={() => decide(decision.id, 'approved')}
                      disabled={processing === decision.id}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => decide(decision.id, 'rejected')}
                      disabled={processing === decision.id}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      반려
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => decide(decision.id, 'deferred')}
                      disabled={processing === decision.id}
                    >
                      보류
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="pending">
      <TabsList className="mb-4">
        <TabsTrigger value="pending">
          대기 중
          {pending.length > 0 && <span className="ml-1.5 text-orange-600 font-bold">({pending.length})</span>}
        </TabsTrigger>
        <TabsTrigger value="decided">결정 완료 ({decided.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending">
        {pending.length > 0 ? (
          <div className="space-y-3">
            {pending.map(d => <DecisionCard key={d.id} decision={d} />)}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
            <p className="text-slate-600">결정 대기 항목이 없습니다</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="decided">
        <div className="space-y-3">
          {decided.map(d => <DecisionCard key={d.id} decision={d} />)}
        </div>
      </TabsContent>
    </Tabs>
  )
}

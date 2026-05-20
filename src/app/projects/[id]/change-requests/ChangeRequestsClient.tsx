'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  CheckCircle, XCircle, Clock, AlertTriangle,
  Calendar, DollarSign, GitBranch, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react'
import type { ChangeRequest } from '@/types'

type ChangeRequestWithFeature = ChangeRequest & {
  features: { order_key: string; name: string; priority: string } | null
}

const statusConfig = {
  pending: { label: '검토 대기', color: 'bg-orange-100 text-orange-700', icon: Clock },
  approved: { label: '승인', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: '반려', color: 'bg-red-100 text-red-700', icon: XCircle },
  negotiating: { label: '협의 중', color: 'bg-blue-100 text-blue-700', icon: GitBranch },
}

const impactBadge = (impact: string | null | undefined, label: string) => {
  if (!impact) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
      {label}: {impact}
    </span>
  )
}

function ChangeRequestCard({
  cr,
  onUpdate,
}: {
  cr: ChangeRequestWithFeature
  onUpdate: (id: string, status: string, founderComment: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [founderComment, setFounderComment] = useState(cr.founder_comment || '')
  const [showCommentBox, setShowCommentBox] = useState(false)

  const handleDecide = async (status: 'approved' | 'rejected' | 'negotiating') => {
    setProcessing(true)
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { error } = await supabase
        .from('change_requests')
        .update({
          status,
          founder_comment: founderComment || null,
          decided_at: new Date().toISOString(),
        })
        .eq('id', cr.id)

      if (error) throw error

      onUpdate(cr.id, status, founderComment)
      toast.success(
        status === 'approved' ? '변경 요청을 승인했습니다.' :
        status === 'rejected' ? '변경 요청을 반려했습니다.' :
        '협의 중으로 전환했습니다.'
      )
    } catch {
      toast.error('처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const config = statusConfig[cr.status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = config.icon

  return (
    <Card className="border border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`text-xs font-medium ${config.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
              {cr.features && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {cr.features.order_key} {cr.features.name}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">{cr.title}</h3>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* 요약 정보 */}
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{cr.content}</p>

        {/* 영향도 배지 */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {cr.schedule_impact && (
            <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
              <Calendar className="w-3 h-3" />
              일정: {cr.schedule_impact}
            </span>
          )}
          {cr.cost_impact && (
            <span className="inline-flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">
              <DollarSign className="w-3 h-3" />
              비용: {cr.cost_impact}
            </span>
          )}
          {cr.priority_level && (
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
              cr.priority_level === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
              cr.priority_level === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
              'bg-gray-50 text-gray-600 border-gray-200'
            }`}>
              <AlertTriangle className="w-3 h-3" />
              {cr.priority_level === 'critical' ? '긴급' : cr.priority_level === 'high' ? '높음' : '보통'}
            </span>
          )}
        </div>

        {/* 상세 내용 (펼침) */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">변경 이유</h4>
              <p className="text-sm text-gray-700">{cr.reason}</p>
            </div>

            {cr.alternative && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">대안 제안</h4>
                <p className="text-sm text-gray-700">{cr.alternative}</p>
              </div>
            )}

            {cr.ai_recommendation && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI 권고
                </h4>
                <p className="text-sm text-purple-800 whitespace-pre-wrap">{cr.ai_recommendation}</p>
              </div>
            )}

            {cr.founder_comment && cr.status !== 'pending' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">대표 코멘트</h4>
                <p className="text-sm text-blue-800">{cr.founder_comment}</p>
              </div>
            )}
          </div>
        )}

        {/* 액션 버튼 (pending 상태만) */}
        {cr.status === 'pending' && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {showCommentBox ? (
              <div className="space-y-2">
                <Textarea
                  value={founderComment}
                  onChange={(e) => setFounderComment(e.target.value)}
                  placeholder="결정 이유나 조건을 입력하세요 (선택)"
                  className="text-sm h-20 resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    onClick={() => handleDecide('approved')}
                    disabled={processing}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 flex-1"
                    onClick={() => handleDecide('negotiating')}
                    disabled={processing}
                  >
                    <GitBranch className="w-3.5 h-3.5 mr-1" />
                    협의
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50 flex-1"
                    onClick={() => handleDecide('rejected')}
                    disabled={processing}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    반려
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-gray-400 w-full"
                  onClick={() => setShowCommentBox(false)}
                >
                  취소
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-sm"
                onClick={() => setShowCommentBox(true)}
              >
                검토하기
              </Button>
            )}
          </div>
        )}

        {/* 날짜 */}
        <p className="text-xs text-gray-400 mt-2">
          {new Date(cr.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </CardContent>
    </Card>
  )
}

export default function ChangeRequestsClient({
  projectId,
  initialChangeRequests,
}: {
  projectId: string
  initialChangeRequests: ChangeRequestWithFeature[]
}) {
  const [changeRequests, setChangeRequests] = useState(initialChangeRequests)

  const handleUpdate = (id: string, status: string, founderComment: string) => {
    setChangeRequests(prev =>
      prev.map(cr =>
        cr.id === id
          ? { ...cr, status: status as ChangeRequest['status'], founder_comment: founderComment, decided_at: new Date().toISOString() }
          : cr
      )
    )
  }

  const pending = changeRequests.filter(cr => cr.status === 'pending')
  const decided = changeRequests.filter(cr => cr.status !== 'pending')

  const criticalPending = pending.filter(cr => cr.priority_level === 'critical')

  return (
    <div>
      {/* 긴급 배너 */}
      {criticalPending.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700 font-medium">
            긴급 변경 요청 {criticalPending.length}건 — 즉시 검토가 필요합니다.
          </span>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: '전체', value: changeRequests.length, color: 'text-gray-900' },
          { label: '검토 대기', value: pending.length, color: 'text-orange-600' },
          { label: '승인', value: changeRequests.filter(c => c.status === 'approved').length, color: 'text-green-600' },
          { label: '반려', value: changeRequests.filter(c => c.status === 'rejected').length, color: 'text-red-600' },
        ].map(stat => (
          <Card key={stat.label} className="border border-gray-200">
            <CardContent className="p-3 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-1">
            검토 대기
            {pending.length > 0 && (
              <Badge className="bg-orange-100 text-orange-700 text-xs ml-1">{pending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="decided">
            처리 완료
            {decided.length > 0 && (
              <span className="ml-1 text-xs text-gray-400">({decided.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pending.length === 0 ? (
            <Card className="border border-dashed border-gray-200">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">검토 대기 중인 변경 요청이 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pending
                .sort((a, b) => {
                  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
                  return (priorityOrder[a.priority_level as keyof typeof priorityOrder] ?? 3) -
                         (priorityOrder[b.priority_level as keyof typeof priorityOrder] ?? 3)
                })
                .map(cr => (
                  <ChangeRequestCard key={cr.id} cr={cr} onUpdate={handleUpdate} />
                ))
              }
            </div>
          )}
        </TabsContent>

        <TabsContent value="decided">
          {decided.length === 0 ? (
            <Card className="border border-dashed border-gray-200">
              <CardContent className="p-8 text-center">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">처리된 변경 요청이 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {decided.map(cr => (
                <ChangeRequestCard key={cr.id} cr={cr} onUpdate={handleUpdate} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

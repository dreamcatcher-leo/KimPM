'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Send, Eye, CheckCircle, Clock, FileText,
  ChevronDown, ChevronUp, ExternalLink, Package,
} from 'lucide-react'

interface SpecDeliveryItem {
  feature: {
    id: string
    name: string
    order_key: string
    status: string
  }
  spec: {
    id: string
    version: number
    status: string
    approved_at: string | null
    sent_at: string | null
    viewed_at: string | null
  } | null
  delivery_status: 'viewed' | 'sent' | 'approved_not_sent' | 'draft' | 'no_spec'
}

interface Props {
  projectId: string
  vendorToken?: string
}

const deliveryBadge: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  viewed:           { label: '열람 완료', color: 'bg-blue-100 text-blue-700 border-blue-200',    icon: <Eye className="w-3 h-3" /> },
  sent:             { label: '전달됨',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Send className="w-3 h-3" /> },
  approved_not_sent:{ label: '미전달',    color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Package className="w-3 h-3" /> },
  draft:            { label: '초안',      color: 'bg-slate-100 text-slate-500 border-slate-200',   icon: <Clock className="w-3 h-3" /> },
  no_spec:          { label: '없음',      color: 'bg-slate-100 text-slate-400 border-slate-200',   icon: <FileText className="w-3 h-3" /> },
}

export default function SpecDeliveryPanel({ projectId, vendorToken }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [items, setItems] = useState<SpecDeliveryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [isBulkSending, setIsBulkSending] = useState(false)

  const loadItems = async () => {
    if (loaded) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/specs`)
      const data = await res.json()
      if (res.ok) setItems(data.specs || [])
      setLoaded(true)
    } catch {
      toast.error('목록 로드 실패')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = () => {
    const next = !isExpanded
    setIsExpanded(next)
    if (next && !loaded) loadItems()
  }

  const sendSpec = async (specId: string) => {
    setSending(specId)
    try {
      const res = await fetch(`/api/projects/${projectId}/specs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'send', spec_id: specId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(prev =>
        prev.map(item =>
          item.spec?.id === specId
            ? {
                ...item,
                spec: { ...item.spec, sent_at: data.sent_at },
                delivery_status: 'sent',
              }
            : item
        )
      )
      toast.success('전달 처리 완료')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '전달 실패')
    } finally {
      setSending(null)
    }
  }

  const sendAll = async () => {
    setIsBulkSending(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/specs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'send_all' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // 전달 상태 일괄 업데이트
      setItems(prev =>
        prev.map(item =>
          item.spec && item.delivery_status === 'approved_not_sent'
            ? { ...item, spec: { ...item.spec, sent_at: data.sent_at }, delivery_status: 'sent' as const }
            : item
        )
      )
      toast.success(`${data.sent}개 정의서 전달 처리 완료`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '일괄 전달 실패')
    } finally {
      setIsBulkSending(false)
    }
  }

  // 요약 통계 (로드 전엔 숨김)
  const approvedCount = items.filter(i => i.spec?.status === 'approved').length
  const sentCount = items.filter(i => i.delivery_status === 'sent' || i.delivery_status === 'viewed').length
  const viewedCount = items.filter(i => i.delivery_status === 'viewed').length
  const pendingSendCount = items.filter(i => i.delivery_status === 'approved_not_sent').length

  return (
    <Card className="border-slate-200">
      {/* 접기/펼치기 헤더 */}
      <CardHeader
        className="pb-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-t-xl"
        onClick={toggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600" />
            <CardTitle className="text-base">기능정의서 전달 현황</CardTitle>
            {loaded && pendingSendCount > 0 && (
              <Badge className="bg-orange-100 text-orange-700 text-xs border-orange-200">
                미전달 {pendingSendCount}건
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {loaded && (
              <div className="flex items-center gap-3 text-xs text-slate-400 mr-2">
                <span><CheckCircle className="w-3 h-3 inline mr-1 text-green-500" />승인 {approvedCount}</span>
                <span><Send className="w-3 h-3 inline mr-1 text-yellow-500" />전달 {sentCount}</span>
                <span><Eye className="w-3 h-3 inline mr-1 text-blue-500" />열람 {viewedCount}</span>
              </div>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* 액션 바 */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-slate-500">
              💡 전달 처리 후 외주사가 링크를 열람하면 "열람 완료"로 자동 업데이트됩니다
            </p>
            <div className="flex items-center gap-2">
              {pendingSendCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={sendAll}
                  disabled={isBulkSending}
                >
                  <Send className="w-3 h-3" />
                  {isBulkSending ? '전달 중...' : `미전달 ${pendingSendCount}건 일괄 전달`}
                </Button>
              )}
              {vendorToken && (
                <Link href={`/vendor/${vendorToken}/specs`} target="_blank">
                  <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-slate-500">
                    <ExternalLink className="w-3 h-3" />
                    외주사 화면 미리보기
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* 목록 */}
          {loading ? (
            <div className="text-center py-8">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-400">로딩 중...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">기능이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const badge = deliveryBadge[item.delivery_status]
                const canSend = item.delivery_status === 'approved_not_sent'

                return (
                  <div
                    key={item.feature.id}
                    className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-mono text-slate-400 w-12 flex-shrink-0">{item.feature.order_key}</span>
                      <span className="text-sm text-slate-800 truncate">{item.feature.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${badge.color}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                      {item.spec && (
                        <Link href={`/projects/${projectId}/features/${item.feature.id}/spec`}>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-slate-400 hover:text-slate-600">
                            정의서
                          </Button>
                        </Link>
                      )}
                      {canSend && item.spec && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs gap-1 border-orange-200 text-orange-700 hover:bg-orange-50"
                          onClick={() => sendSpec(item.spec!.id)}
                          disabled={sending === item.spec.id}
                        >
                          <Send className="w-3 h-3" />
                          {sending === item.spec.id ? '...' : '전달'}
                        </Button>
                      )}
                      {item.delivery_status === 'viewed' && item.spec?.viewed_at && (
                        <span className="text-xs text-slate-300">
                          {new Date(item.spec.viewed_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

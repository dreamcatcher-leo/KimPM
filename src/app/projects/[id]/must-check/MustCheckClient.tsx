'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Bell, CheckCircle, Clock } from 'lucide-react'
import type { MustCheckItem } from '@/types'

const triggerLabels: Record<string, string> = {
  '정책_범위_비용_변경': '정책/범위/비용 변경',
  '반복_blocker': '반복 Blocker',
  '완료_후보_검수': '완료 후보 검수',
  '점검_권장_신호': 'AI 점검 권장',
  '외주사_확인_요청': '외주사 확인 요청',
  'Weekly_Plan_미달성_누적': '주간 계획 미달성',
}

const triggerColors: Record<string, string> = {
  '정책_범위_비용_변경': 'bg-orange-100 text-orange-700',
  '반복_blocker': 'bg-red-100 text-red-700',
  '완료_후보_검수': 'bg-blue-100 text-blue-700',
  '점검_권장_신호': 'bg-red-100 text-red-700',
  '외주사_확인_요청': 'bg-purple-100 text-purple-700',
  'Weekly_Plan_미달성_누적': 'bg-yellow-100 text-yellow-700',
}

interface MustCheckClientProps {
  projectId: string
  initialItems: MustCheckItem[]
}

export default function MustCheckClient({ projectId, initialItems }: MustCheckClientProps) {
  const [items, setItems] = useState(initialItems)
  const [resolving, setResolving] = useState<string | null>(null)

  const pending = items.filter(i => !i.is_resolved)
  const resolved = items.filter(i => i.is_resolved)

  const resolveItem = async (itemId: string) => {
    setResolving(itemId)
    try {
      const res = await fetch(`/api/must-check/${itemId}/resolve`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setItems(prev => prev.map(i =>
        i.id === itemId ? { ...i, is_resolved: true, resolved_at: new Date().toISOString() } : i
      ))
      toast.success('확인 완료로 처리되었습니다')
    } catch {
      toast.error('처리 실패')
    } finally {
      setResolving(null)
    }
  }

  function ItemCard({ item }: { item: MustCheckItem }) {
    return (
      <Card className={`${!item.is_resolved ? 'border-purple-200' : 'opacity-60'}`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              item.is_resolved ? 'bg-green-100' : 'bg-purple-100'
            }`}>
              {item.is_resolved ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Bell className="w-4 h-4 text-purple-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-slate-900 text-sm">{item.title}</p>
                <Badge className={`text-xs py-0 h-5 ${triggerColors[item.trigger_type] || 'bg-gray-100 text-gray-600'}`}>
                  {triggerLabels[item.trigger_type] || item.trigger_type}
                </Badge>
              </div>
              {item.description && (
                <p className="text-sm text-slate-600 whitespace-pre-wrap mb-2">{item.description}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {new Date(item.created_at).toLocaleDateString('ko-KR')}
                </p>
                {!item.is_resolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => resolveItem(item.id)}
                    disabled={resolving === item.id}
                  >
                    <CheckCircle className="w-3 h-3" />
                    {resolving === item.id ? '처리 중...' : '확인 완료'}
                  </Button>
                )}
                {item.is_resolved && (
                  <p className="text-xs text-green-600">
                    ✅ {item.resolved_at ? new Date(item.resolved_at).toLocaleDateString('ko-KR') : '완료'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="pending">
      <TabsList className="mb-4">
        <TabsTrigger value="pending" className="gap-2">
          미확인
          {pending.length > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1">
              {pending.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="resolved">완료 ({resolved.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending">
        {pending.length > 0 ? (
          <div className="space-y-3">
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-purple-800 font-medium">
                🔔 {pending.length}건의 항목이 대표 직접 확인을 기다리고 있습니다
              </p>
              <p className="text-xs text-purple-600 mt-0.5">
                AI 판단과 별도로, 이 항목들은 대표가 직접 검토해야 합니다.
              </p>
            </div>
            {pending.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">모든 Must-Check 항목이 완료되었습니다</p>
            <p className="text-slate-400 text-sm mt-1">새로운 항목이 감지되면 자동으로 등록됩니다</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="resolved">
        {resolved.length > 0 ? (
          <div className="space-y-3">
            {resolved.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">완료된 항목이 없습니다</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

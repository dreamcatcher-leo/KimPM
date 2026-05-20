'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react'
import type { Risk, RiskLevel, RiskType } from '@/types'

const levelConfig: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  '낮음': { label: '낮음', color: 'text-gray-600', bg: 'bg-gray-100' },
  '주의': { label: '주의', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  '위험': { label: '위험', color: 'text-red-700', bg: 'bg-red-100' },
  'Must_Check_필요': { label: 'Must-Check', color: 'text-purple-700', bg: 'bg-purple-100' },
}

const typeLabels: Record<RiskType, string> = {
  '보고_누락': '보고 누락',
  '증빙_없는_완료_후보': '증빙 없는 완료',
  'Weekly_Plan_미정합': '주간계획 미정합',
  '미답변_질문': '미답변 질문',
  '반복_blocker': '반복 Blocker',
  '범위_변경_위험': '범위 변경 위험',
  '기획_이탈_가능성': '기획 이탈',
  '검수_지연': '검수 지연',
}

export default function RisksClient({ projectId, initialRisks }: { projectId: string; initialRisks: Risk[] }) {
  const [risks, setRisks] = useState(initialRisks)
  const [resolving, setResolving] = useState<string | null>(null)

  const open = risks.filter(r => !r.is_resolved)
  const resolved = risks.filter(r => r.is_resolved)

  // Group by level for summary
  const byLevel = {
    'Must_Check_필요': open.filter(r => r.level === 'Must_Check_필요').length,
    '위험': open.filter(r => r.level === '위험').length,
    '주의': open.filter(r => r.level === '주의').length,
    '낮음': open.filter(r => r.level === '낮음').length,
  }

  const resolveRisk = async (riskId: string) => {
    setResolving(riskId)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase
        .from('risks')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', riskId)
      if (error) throw error
      setRisks(prev => prev.map(r => r.id === riskId ? { ...r, is_resolved: true } : r))
      toast.success('리스크가 해소되었습니다')
    } catch {
      toast.error('처리 실패')
    } finally {
      setResolving(null)
    }
  }

  function RiskCard({ risk }: { risk: Risk }) {
    const level = levelConfig[risk.level] || levelConfig['낮음']
    return (
      <Card className={`${!risk.is_resolved ? 'border-slate-200' : 'opacity-60'}`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${level.bg}`}>
              {risk.is_resolved ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <ShieldAlert className={`w-4 h-4 ${level.color}`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={`text-xs py-0 h-5 ${level.bg} ${level.color}`}>
                  {level.label}
                </Badge>
                <Badge variant="outline" className="text-xs py-0 h-5">
                  {typeLabels[risk.risk_type] || risk.risk_type}
                </Badge>
              </div>
              <p className="font-medium text-slate-900 text-sm">{risk.title}</p>
              {risk.description && (
                <p className="text-sm text-slate-600 mt-1">{risk.description}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-400">
                  {new Date(risk.created_at).toLocaleDateString('ko-KR')}
                </p>
                {!risk.is_resolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => resolveRisk(risk.id)}
                    disabled={resolving === risk.id}
                  >
                    <CheckCircle className="w-3 h-3" />
                    {resolving === risk.id ? '처리 중...' : '해소됨'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(byLevel).map(([level, count]) => {
          const config = levelConfig[level as RiskLevel]
          return (
            <div key={level} className={`rounded-lg p-3 ${config.bg} text-center`}>
              <p className="text-xs text-slate-600 mb-1">{config.label}</p>
              <p className={`text-2xl font-bold ${config.color}`}>{count}</p>
            </div>
          )
        })}
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">
            오픈 ({open.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">해소됨 ({resolved.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          {open.length > 0 ? (
            <div className="space-y-3 mt-3">
              {['Must_Check_필요', '위험', '주의', '낮음'].map(level =>
                open.filter(r => r.level === level).map(risk => (
                  <RiskCard key={risk.id} risk={risk} />
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">오픈 리스크가 없습니다</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved">
          <div className="space-y-3 mt-3">
            {resolved.map(risk => <RiskCard key={risk.id} risk={risk} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, FileText, ChevronRight, CheckCircle, Clock, Zap, RotateCcw, Layers } from 'lucide-react'
import type { Feature } from '@/types'

const categoryLabels: Record<string, string> = {
  '신규_개발': '신규',
  '기존_보완': '보완',
  '신규_개발_기존_보완': '신규+보완',
  '정책_반영': '정책',
  '어드민_기능': '어드민',
  '후순위_보류': '후순위',
}

const statusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: '정의서 필요', color: 'bg-gray-100 text-gray-600' },
  spec_draft: { label: '초안 생성됨', color: 'bg-yellow-100 text-yellow-700' },
  spec_approved: { label: '정의서 승인', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: '개발 중', color: 'bg-purple-100 text-purple-700' },
  completed_candidate: { label: '완료 후보', color: 'bg-orange-100 text-orange-700' },
  approved: { label: '완료 승인', color: 'bg-green-100 text-green-700' },
  on_hold: { label: '보류', color: 'bg-red-100 text-red-600' },
}

type GenStatus = 'idle' | 'generating' | 'done' | 'error'

interface FeaturesClientProps {
  projectId: string
  initialFeatures: Feature[]
}

export default function FeaturesClient({ projectId, initialFeatures }: FeaturesClientProps) {
  const [features, setFeatures] = useState(initialFeatures)
  const [genStatus, setGenStatus] = useState<Record<string, GenStatus>>({})
  const [isBulkGenerating, setIsBulkGenerating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })

  const grouped = features.reduce((acc, feature) => {
    const group = feature.priority_group
    if (!acc[group]) acc[group] = []
    acc[group].push(feature)
    return acc
  }, {} as Record<string, Feature[]>)

  const groups = ['P0', 'P1', 'P2', 'P3'].filter(g => grouped[g]?.length > 0)
  const planningCount = features.filter(f => f.status === 'planning').length

  // 개별 정의서 생성
  const generateSpec = async (featureId: string, featureName: string) => {
    setGenStatus(prev => ({ ...prev, [featureId]: 'generating' }))
    try {
      const res = await fetch(`/api/features/${featureId}/spec`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, status: 'spec_draft' } : f))
      setGenStatus(prev => ({ ...prev, [featureId]: 'done' }))
      if (data.isFallback) toast.info(`${featureName} — 기본 템플릿으로 생성됨`)
      else toast.success(`${featureName} 정의서 생성 완료`)
    } catch (err) {
      setGenStatus(prev => ({ ...prev, [featureId]: 'error' }))
      toast.error(err instanceof Error ? err.message : '생성 실패')
    }
  }

  // 전체 일괄 생성
  const bulkGenerate = async () => {
    const targets = features.filter(f => f.status === 'planning')
    if (targets.length === 0) { toast.info('생성할 정의서가 없습니다'); return }
    setIsBulkGenerating(true)
    setBulkProgress({ done: 0, total: targets.length })
    let errorCount = 0
    for (const f of targets) {
      setGenStatus(prev => ({ ...prev, [f.id]: 'generating' }))
      try {
        const res = await fetch(`/api/features/${f.id}/spec`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setFeatures(prev => prev.map(feat => feat.id === f.id ? { ...feat, status: 'spec_draft' } : feat))
        setGenStatus(prev => ({ ...prev, [f.id]: 'done' }))
      } catch {
        setGenStatus(prev => ({ ...prev, [f.id]: 'error' }))
        errorCount++
      }
      setBulkProgress(prev => ({ ...prev, done: prev.done + 1 }))
      await new Promise(r => setTimeout(r, 500))
    }
    setIsBulkGenerating(false)
    if (errorCount === 0) toast.success(`전체 ${targets.length}개 정의서 초안 생성 완료!`)
    else toast.warning(`${targets.length - errorCount}개 성공, ${errorCount}개 실패`)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">기능 목록</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            총 {features.length}개
            {planningCount > 0 && <span className="text-amber-600 ml-1">· 정의서 필요 {planningCount}개</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {planningCount > 0 && (
            <Button
              onClick={bulkGenerate}
              disabled={isBulkGenerating}
              variant="outline"
              size="sm"
              className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Layers className="w-3.5 h-3.5" />
              {isBulkGenerating
                ? `생성 중 ${bulkProgress.done}/${bulkProgress.total}`
                : `전체 정의서 일괄 생성 (${planningCount}개)`}
            </Button>
          )}
          <Link href={`/projects/${projectId}/features/new`}>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-500 h-8 text-sm">
              <Plus className="w-4 h-4" /> 기능 추가
            </Button>
          </Link>
        </div>
      </div>

      {/* 일괄 생성 진행 바 */}
      {isBulkGenerating && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex justify-between text-xs text-blue-700 mb-1">
            <span>전체 기능 정의서 생성 중...</span>
            <span>{bulkProgress.done} / {bulkProgress.total}</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-6">
        {groups.map(group => (
          <div key={group}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`px-2.5 py-0.5 rounded-full text-sm font-bold ${
                group === 'P0' ? 'bg-red-100 text-red-700' :
                group === 'P1' ? 'bg-orange-100 text-orange-700' :
                group === 'P2' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>{group}</div>
              <span className="text-sm text-slate-500">{grouped[group].length}개</span>
            </div>

            <div className="space-y-2">
              {grouped[group].map(feature => {
                const status = statusConfig[feature.status] || statusConfig.planning
                const gs = genStatus[feature.id]
                return (
                  <Card key={feature.id} className="hover:shadow-sm transition-shadow group">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400 w-12 flex-shrink-0">{feature.order_key}</span>
                        <Link href={`/projects/${projectId}/features/${feature.id}/spec`} className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                            {feature.name}
                          </p>
                          {feature.description && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">{feature.description}</p>
                          )}
                        </Link>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className="text-xs py-0 h-5">
                            {categoryLabels[feature.category] || feature.category}
                          </Badge>

                          {/* 생성 상태 표시 */}
                          {gs === 'generating' ? (
                            <span className="text-xs text-blue-600 animate-pulse w-16">생성 중...</span>
                          ) : gs === 'done' ? (
                            <span className="text-xs text-green-600 flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3" /> 생성됨
                            </span>
                          ) : gs === 'error' ? (
                            <button
                              onClick={() => generateSpec(feature.id, feature.name)}
                              className="text-xs text-red-600 flex items-center gap-0.5 hover:underline"
                            >
                              <RotateCcw className="w-3 h-3" /> 재시도
                            </button>
                          ) : (
                            <Badge className={`text-xs py-0 h-5 ${status.color}`}>{status.label}</Badge>
                          )}

                          {/* 정의서 없을 때 빠른 생성 버튼 */}
                          {!gs && feature.status === 'planning' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-5 text-xs px-1.5 gap-1 border-blue-300 text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.preventDefault(); generateSpec(feature.id, feature.name) }}
                              disabled={isBulkGenerating}
                            >
                              <Zap className="w-2.5 h-2.5" />
                            </Button>
                          )}

                          {feature.status === 'approved' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {feature.status === 'planning' && !gs && <Clock className="w-4 h-4 text-gray-400" />}
                          <Link href={`/projects/${projectId}/features/${feature.id}/spec`}>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}

        {features.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">기능이 없습니다</h3>
            <p className="text-slate-400 text-sm mb-4">기능을 추가하거나 프로젝트 생성 시 AI 기능 분석을 사용해보세요</p>
            <Link href={`/projects/${projectId}/features/new`}>
              <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
                <Plus className="w-4 h-4" /> 첫 기능 추가
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

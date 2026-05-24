'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Plus, FileText, ChevronRight, CheckCircle, Clock, Zap,
  RotateCcw, Layers, LayoutGrid, List, GripVertical, ArrowRight
} from 'lucide-react'
import type { Feature, PriorityGroup } from '@/types'

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const categoryLabels: Record<string, string> = {
  '신규_개발': '신규',
  '기존_보완': '보완',
  '신규_개발_기존_보완': '신규+보완',
  '정책_반영': '정책',
  '어드민_기능': '어드민',
  '후순위_보류': '후순위',
}

const statusConfig: Record<string, { label: string; color: string }> = {
  planning:           { label: '정의서 필요', color: 'bg-gray-100 text-gray-600' },
  spec_draft:         { label: '초안 생성됨', color: 'bg-yellow-100 text-yellow-700' },
  spec_approved:      { label: '정의서 승인', color: 'bg-blue-100 text-blue-700' },
  in_progress:        { label: '개발 중',    color: 'bg-purple-100 text-purple-700' },
  completed_candidate: { label: '완료 후보', color: 'bg-orange-100 text-orange-700' },
  approved:           { label: '완료 승인',  color: 'bg-green-100 text-green-700' },
  on_hold:            { label: '보류',       color: 'bg-red-100 text-red-600' },
}

const PRIORITY_GROUPS: PriorityGroup[] = ['P0', 'P1', 'P2', 'P3']

const priorityConfig: Record<PriorityGroup, {
  label: string; desc: string
  headerClass: string; borderClass: string; bgClass: string; dotClass: string
}> = {
  P0: {
    label: 'P0 — 핵심 필수',
    desc: '없으면 서비스 불가',
    headerClass: 'bg-red-600 text-white',
    borderClass: 'border-red-200',
    bgClass: 'bg-red-50',
    dotClass: 'bg-red-500',
  },
  P1: {
    label: 'P1 — 중요',
    desc: '없으면 주요 기능 누락',
    headerClass: 'bg-orange-500 text-white',
    borderClass: 'border-orange-200',
    bgClass: 'bg-orange-50',
    dotClass: 'bg-orange-400',
  },
  P2: {
    label: 'P2 — 보통',
    desc: '있으면 더 좋음',
    headerClass: 'bg-yellow-500 text-white',
    borderClass: 'border-yellow-200',
    bgClass: 'bg-yellow-50',
    dotClass: 'bg-yellow-400',
  },
  P3: {
    label: 'P3 — 낮음',
    desc: '후순위 처리 가능',
    headerClass: 'bg-gray-400 text-white',
    borderClass: 'border-gray-200',
    bgClass: 'bg-gray-50',
    dotClass: 'bg-gray-400',
  },
}

type GenStatus = 'idle' | 'generating' | 'done' | 'error'
type ViewMode = 'list' | 'board'

// ─── Props ────────────────────────────────────────────────────────────────────

interface FeaturesClientProps {
  projectId: string
  initialFeatures: Feature[]
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FeaturesClient({ projectId, initialFeatures }: FeaturesClientProps) {
  const [features, setFeatures] = useState(initialFeatures)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [genStatus, setGenStatus] = useState<Record<string, GenStatus>>({})
  const [isBulkGenerating, setIsBulkGenerating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })

  const grouped = features.reduce((acc, feature) => {
    const group = feature.priority_group
    if (!acc[group]) acc[group] = []
    acc[group].push(feature)
    return acc
  }, {} as Record<string, Feature[]>)

  const listGroups = PRIORITY_GROUPS.filter(g => grouped[g]?.length > 0)
  const planningCount = features.filter(f => f.status === 'planning').length

  // 우선순위 변경 (보드 drag & drop 결과)
  const changePriority = async (featureId: string, newGroup: PriorityGroup, featureName: string) => {
    const feature = features.find(f => f.id === featureId)
    if (!feature || feature.priority_group === newGroup) return

    const prevGroup = feature.priority_group

    // 낙관적 업데이트
    setFeatures(prev => prev.map(f =>
      f.id === featureId ? { ...f, priority_group: newGroup, priority: newGroup } : f
    ))

    try {
      const res = await fetch(`/api/features/${featureId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority_group: newGroup }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${featureName}: ${prevGroup} → ${newGroup}`, {
        description: '우선순위 변경 이력이 저장되었습니다',
        duration: 3000,
      })
    } catch {
      // 롤백
      setFeatures(prev => prev.map(f =>
        f.id === featureId ? { ...f, priority_group: prevGroup, priority: prevGroup } : f
      ))
      toast.error('우선순위 변경 실패')
    }
  }

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
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">기능 목록</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            총 {features.length}개
            {planningCount > 0 && <span className="text-amber-600 ml-1">· 정의서 필요 {planningCount}개</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 뷰 전환 */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                viewMode === 'list'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              리스트
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                viewMode === 'board'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              보드
            </button>
          </div>

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
                : `정의서 일괄 생성 (${planningCount}개)`}
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

      {/* 보드 뷰 안내 */}
      {viewMode === 'board' && (
        <div className="mb-4 flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
          <GripVertical className="w-3.5 h-3.5 flex-shrink-0" />
          <span>카드를 드래그하여 우선순위 그룹 간 이동하세요. 변경 이력이 의사결정함에 자동 저장됩니다.</span>
        </div>
      )}

      {/* 리스트 뷰 */}
      {viewMode === 'list' && (
        <ListView
          features={features}
          grouped={grouped}
          listGroups={listGroups}
          projectId={projectId}
          genStatus={genStatus}
          isBulkGenerating={isBulkGenerating}
          generateSpec={generateSpec}
        />
      )}

      {/* 보드 뷰 */}
      {viewMode === 'board' && (
        <BoardView
          features={features}
          grouped={grouped}
          projectId={projectId}
          genStatus={genStatus}
          onChangePriority={changePriority}
        />
      )}

      {/* 빈 상태 */}
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
  )
}

// ─── 리스트 뷰 ────────────────────────────────────────────────────────────────

function ListView({
  features, grouped, listGroups, projectId, genStatus, isBulkGenerating, generateSpec
}: {
  features: Feature[]
  grouped: Record<string, Feature[]>
  listGroups: string[]
  projectId: string
  genStatus: Record<string, GenStatus>
  isBulkGenerating: boolean
  generateSpec: (id: string, name: string) => void
}) {
  return (
    <div className="space-y-6">
      {listGroups.map(group => {
        const cfg = priorityConfig[group as PriorityGroup]
        return (
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
        )
      })}

      {features.length > 0 && listGroups.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">기능이 있지만 우선순위 그룹이 없습니다</div>
      )}
    </div>
  )
}

// ─── 보드 뷰 ──────────────────────────────────────────────────────────────────

function BoardView({
  features, grouped, projectId, genStatus, onChangePriority
}: {
  features: Feature[]
  grouped: Record<string, Feature[]>
  projectId: string
  genStatus: Record<string, GenStatus>
  onChangePriority: (featureId: string, group: PriorityGroup, featureName: string) => void
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverGroup, setDragOverGroup] = useState<PriorityGroup | null>(null)
  const dragFeatureRef = useRef<Feature | null>(null)

  const handleDragStart = (e: React.DragEvent, feature: Feature) => {
    setDraggingId(feature.id)
    dragFeatureRef.current = feature
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', feature.id)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverGroup(null)
    dragFeatureRef.current = null
  }

  const handleDragOver = (e: React.DragEvent, group: PriorityGroup) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverGroup(group)
  }

  const handleDrop = (e: React.DragEvent, targetGroup: PriorityGroup) => {
    e.preventDefault()
    const feature = dragFeatureRef.current
    if (!feature) return
    if (feature.priority_group !== targetGroup) {
      onChangePriority(feature.id, targetGroup, feature.name)
    }
    setDraggingId(null)
    setDragOverGroup(null)
    dragFeatureRef.current = null
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // 자식 요소로 이동할 때는 무시
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDragOverGroup(null)
  }

  return (
    <div className="grid grid-cols-4 gap-3 items-start">
      {PRIORITY_GROUPS.map(group => {
        const cfg = priorityConfig[group]
        const items = grouped[group] || []
        const isOver = dragOverGroup === group
        const draggingFeature = draggingId ? features.find(f => f.id === draggingId) : null
        const isDraggingFromThisGroup = draggingFeature?.priority_group === group

        return (
          <div
            key={group}
            onDragOver={(e) => handleDragOver(e, group)}
            onDrop={(e) => handleDrop(e, group)}
            onDragLeave={handleDragLeave}
            className={`rounded-xl border-2 transition-all min-h-[200px] ${
              isOver && !isDraggingFromThisGroup
                ? `${cfg.borderClass} ${cfg.bgClass} shadow-md scale-[1.01]`
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            {/* 컬럼 헤더 */}
            <div className={`rounded-t-xl px-3 py-2.5 ${cfg.headerClass}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">{cfg.label}</div>
                  <div className="text-xs opacity-80">{cfg.desc}</div>
                </div>
                <span className="text-lg font-bold opacity-90">{items.length}</span>
              </div>
            </div>

            {/* 드롭 존 표시 */}
            {isOver && !isDraggingFromThisGroup && (
              <div className={`mx-2 mt-2 rounded-lg border-2 border-dashed ${cfg.borderClass} ${cfg.bgClass} p-3 text-center`}>
                <ArrowRight className="w-4 h-4 mx-auto mb-1 opacity-60" style={{ color: cfg.dotClass.replace('bg-', '') }} />
                <p className="text-xs font-medium opacity-70">{group}으로 이동</p>
              </div>
            )}

            {/* 카드 목록 */}
            <div className="p-2 space-y-2">
              {items.map(feature => (
                <BoardCard
                  key={feature.id}
                  feature={feature}
                  projectId={projectId}
                  isDragging={draggingId === feature.id}
                  genStatus={genStatus[feature.id]}
                  onDragStart={(e) => handleDragStart(e, feature)}
                  onDragEnd={handleDragEnd}
                />
              ))}

              {/* 빈 컬럼 플레이스홀더 */}
              {items.length === 0 && !isOver && (
                <div className="py-6 text-center">
                  <div className={`w-6 h-6 rounded-full ${cfg.dotClass} opacity-20 mx-auto mb-2`} />
                  <p className="text-xs text-slate-400">기능 없음</p>
                  <p className="text-xs text-slate-300 mt-0.5">여기에 드래그</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── 보드 카드 ────────────────────────────────────────────────────────────────

function BoardCard({
  feature, projectId, isDragging, genStatus, onDragStart, onDragEnd
}: {
  feature: Feature
  projectId: string
  isDragging: boolean
  genStatus?: GenStatus
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}) {
  const status = statusConfig[feature.status] || statusConfig.planning

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-xl border border-slate-200 shadow-sm transition-all select-none ${
        isDragging
          ? 'opacity-40 scale-95 shadow-none border-dashed'
          : 'cursor-grab hover:shadow-md hover:border-blue-300 active:cursor-grabbing'
      }`}
    >
      <div className="p-3">
        {/* 드래그 핸들 + 기능명 */}
        <div className="flex items-start gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5 hover:text-slate-500" />
          <div className="flex-1 min-w-0">
            <Link
              href={`/projects/${projectId}/features/${feature.id}/spec`}
              onClick={e => isDragging && e.preventDefault()}
              className="block"
            >
              <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2 hover:text-blue-700 transition-colors">
                {feature.name}
              </p>
            </Link>
          </div>
        </div>

        {/* 설명 */}
        {feature.description && (
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 pl-5">{feature.description}</p>
        )}

        {/* 하단 배지들 */}
        <div className="flex items-center gap-1.5 mt-2.5 pl-5 flex-wrap">
          <Badge variant="outline" className="text-xs py-0 h-4.5 px-1.5 border-slate-200 text-slate-500">
            {categoryLabels[feature.category] || feature.category}
          </Badge>

          {genStatus === 'generating' ? (
            <span className="text-xs text-blue-500 animate-pulse">생성 중...</span>
          ) : (
            <Badge className={`text-xs py-0 h-4.5 px-1.5 ${status.color}`}>
              {status.label}
            </Badge>
          )}

          {feature.status === 'approved' && (
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          )}
        </div>

        {/* order_key */}
        <div className="mt-1.5 pl-5">
          <span className="text-xs font-mono text-slate-300">{feature.order_key}</span>
        </div>
      </div>
    </div>
  )
}

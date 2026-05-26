'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Plus, FileText, ChevronDown, CheckCircle, Clock, Zap,
  RotateCcw, Layers, LayoutGrid, List, GripVertical,
  ArrowRight, ExternalLink, AlertCircle
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

const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  planning:            { label: '기획서 미작성',   dot: 'bg-gray-300',   text: 'text-gray-500' },
  spec_draft:          { label: 'AI 초안 완성',    dot: 'bg-yellow-400', text: 'text-yellow-700' },
  spec_approved:       { label: '기획서 확정',     dot: 'bg-blue-400',   text: 'text-blue-700' },
  in_progress:         { label: '개발 중',         dot: 'bg-purple-500', text: 'text-purple-700' },
  completed_candidate: { label: '완료 검수 대기',  dot: 'bg-orange-400', text: 'text-orange-700' },
  approved:            { label: '개발 완료',       dot: 'bg-green-500',  text: 'text-green-700' },
  on_hold:             { label: '보류',            dot: 'bg-red-400',    text: 'text-red-600' },
}

const PRIORITY_GROUPS: PriorityGroup[] = ['P0', 'P1', 'P2', 'P3']

const priorityConfig: Record<PriorityGroup, {
  label: string; desc: string; short: string
  chip: string; bar: string; headerClass: string
  borderClass: string; bgClass: string; dotClass: string
}> = {
  P0: {
    label: 'P0 — 핵심 필수', desc: '없으면 서비스 불가', short: 'P0',
    chip: 'bg-red-100 text-red-700 border-red-200',
    bar: 'bg-red-500',
    headerClass: 'bg-red-600 text-white',
    borderClass: 'border-red-200', bgClass: 'bg-red-50', dotClass: 'bg-red-500',
  },
  P1: {
    label: 'P1 — 중요', desc: '없으면 주요 기능 누락', short: 'P1',
    chip: 'bg-orange-100 text-orange-700 border-orange-200',
    bar: 'bg-orange-400',
    headerClass: 'bg-orange-500 text-white',
    borderClass: 'border-orange-200', bgClass: 'bg-orange-50', dotClass: 'bg-orange-400',
  },
  P2: {
    label: 'P2 — 보통', desc: '있으면 더 좋음', short: 'P2',
    chip: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    bar: 'bg-yellow-400',
    headerClass: 'bg-yellow-500 text-white',
    borderClass: 'border-yellow-200', bgClass: 'bg-yellow-50', dotClass: 'bg-yellow-400',
  },
  P3: {
    label: 'P3 — 낮음', desc: '후순위 처리 가능', short: 'P3',
    chip: 'bg-gray-100 text-gray-600 border-gray-200',
    bar: 'bg-gray-400',
    headerClass: 'bg-gray-400 text-white',
    borderClass: 'border-gray-200', bgClass: 'bg-gray-50', dotClass: 'bg-gray-400',
  },
}

type GenStatus = 'idle' | 'generating' | 'done' | 'error'
type ViewMode = 'list' | 'board'

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
  const completedCount = features.filter(f => f.status === 'approved').length

  const changePriority = async (featureId: string, newGroup: PriorityGroup, featureName: string) => {
    const feature = features.find(f => f.id === featureId)
    if (!feature || feature.priority_group === newGroup) return
    const prevGroup = feature.priority_group
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
      toast.success(`${featureName}: ${prevGroup} → ${newGroup}`)
    } catch {
      setFeatures(prev => prev.map(f =>
        f.id === featureId ? { ...f, priority_group: prevGroup, priority: prevGroup } : f
      ))
      toast.error('우선순위 변경 실패')
    }
  }

  const generateSpec = async (featureId: string, featureName: string) => {
    setGenStatus(prev => ({ ...prev, [featureId]: 'generating' }))
    try {
      const res = await fetch(`/api/features/${featureId}/spec`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, status: 'spec_draft' } : f))
      setGenStatus(prev => ({ ...prev, [featureId]: 'done' }))
      toast.success(`${featureName} AI 기획서 초안 생성 완료`)
    } catch (err) {
      setGenStatus(prev => ({ ...prev, [featureId]: 'error' }))
      toast.error(err instanceof Error ? err.message : '생성 실패')
    }
  }

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
    if (errorCount === 0) toast.success(`전체 ${targets.length}개 AI 기획서 초안 생성 완료!`)
    else toast.warning(`${targets.length - errorCount}개 완료, ${errorCount}개 실패`)
  }

  return (
    <div className="p-6">
      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">기능 목록</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-slate-500">총 {features.length}개</span>
            <span className="text-sm text-green-600 font-medium">완료 {completedCount}개</span>
            {planningCount > 0 && (
              <span className="text-sm text-amber-600">미작성 {planningCount}개</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 뷰 전환 */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <List className="w-3.5 h-3.5" /> 리스트
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                viewMode === 'board' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> 보드
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
                : `AI 기획서 일괄 생성 (${planningCount}개)`}
            </Button>
          )}
          <Link href={`/projects/${projectId}/features/new`}>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-500 h-8 text-sm">
              <Plus className="w-4 h-4" /> 기능 추가
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 일괄 생성 진행 바 ─────────────────────────────────────────────── */}
      {isBulkGenerating && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="flex justify-between text-xs text-blue-700 mb-1.5">
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 animate-pulse" />AI 기획서 초안 생성 중...</span>
            <span className="font-medium">{bulkProgress.done} / {bulkProgress.total}</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* ── 리스트 뷰 ─────────────────────────────────────────────────────── */}
      {viewMode === 'list' && features.length > 0 && (
        <ListView
          features={features}
          grouped={grouped}
          listGroups={listGroups}
          projectId={projectId}
          genStatus={genStatus}
          isBulkGenerating={isBulkGenerating}
          generateSpec={generateSpec}
          onChangePriority={changePriority}
        />
      )}

      {/* ── 보드 뷰 ───────────────────────────────────────────────────────── */}
      {viewMode === 'board' && (
        <>
          <div className="mb-4 flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <GripVertical className="w-3.5 h-3.5 flex-shrink-0" />
            <span>카드를 드래그하여 우선순위 그룹 간 이동하세요.</span>
          </div>
          <BoardView
            features={features}
            grouped={grouped}
            projectId={projectId}
            genStatus={genStatus}
            onChangePriority={changePriority}
          />
        </>
      )}

      {/* ── 빈 상태 ───────────────────────────────────────────────────────── */}
      {features.length === 0 && (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">기능이 없습니다</h3>
          <p className="text-slate-400 text-sm mb-4">기능을 추가해주세요</p>
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
  features, grouped, listGroups, projectId,
  genStatus, isBulkGenerating, generateSpec, onChangePriority
}: {
  features: Feature[]
  grouped: Record<string, Feature[]>
  listGroups: string[]
  projectId: string
  genStatus: Record<string, GenStatus>
  isBulkGenerating: boolean
  generateSpec: (id: string, name: string) => void
  onChangePriority: (id: string, group: PriorityGroup, name: string) => void
}) {
  // 그룹별 펼침 상태 (기본 전체 열림)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(PRIORITY_GROUPS.map(g => [g, true]))
  )

  const toggleGroup = (g: string) =>
    setOpenGroups(prev => ({ ...prev, [g]: !prev[g] }))

  return (
    <div className="space-y-3">
      {listGroups.map(group => {
        const cfg = priorityConfig[group as PriorityGroup]
        const items = grouped[group]
        const isOpen = openGroups[group]
        const doneCount = items.filter(f => f.status === 'approved').length

        return (
          <div key={group} className="rounded-xl border border-slate-200 overflow-hidden">
            {/* 그룹 헤더 */}
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              {/* 우선순위 뱃지 */}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${cfg.chip}`}>
                {group}
              </span>
              <div className="flex-1">
                <span className="text-sm font-semibold text-slate-700">{cfg.label.split(' — ')[1]}</span>
                <span className="text-xs text-slate-400 ml-2">{cfg.desc}</span>
              </div>
              {/* 진행 요약 */}
              <div className="flex items-center gap-3 mr-2">
                <div className="flex items-center gap-1.5">
                  {/* 미니 프로그레스 바 */}
                  <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cfg.bar}`}
                      style={{ width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{doneCount}/{items.length}</span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* 기능 목록 */}
            {isOpen && (
              <div className="divide-y divide-slate-100">
                {items.map((feature, idx) => (
                  <FeatureRow
                    key={feature.id}
                    feature={feature}
                    idx={idx}
                    projectId={projectId}
                    genStatus={genStatus[feature.id]}
                    isBulkGenerating={isBulkGenerating}
                    generateSpec={generateSpec}
                    onChangePriority={onChangePriority}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── 기능 행 (토글 + 인라인 우선순위 변경) ────────────────────────────────────

function FeatureRow({
  feature, idx, projectId, genStatus, isBulkGenerating, generateSpec, onChangePriority
}: {
  feature: Feature
  idx: number
  projectId: string
  genStatus?: GenStatus
  isBulkGenerating: boolean
  generateSpec: (id: string, name: string) => void
  onChangePriority: (id: string, group: PriorityGroup, name: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const status = statusConfig[feature.status] || statusConfig.planning
  const priorityCfg = priorityConfig[feature.priority_group as PriorityGroup]

  return (
    <div className={`bg-white transition-colors ${expanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'}`}>
      {/* ── 메인 행 ── */}
      <div className="flex items-center gap-3 px-4 py-3">

        {/* 인덱스 번호 */}
        <span className="text-xs text-slate-300 font-mono w-5 text-center flex-shrink-0">
          {idx + 1}
        </span>

        {/* 우선순위 버튼 (클릭 시 드롭다운) */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowPriorityMenu(v => !v)}
            className={`text-xs font-bold px-1.5 py-0.5 rounded border transition-all hover:opacity-80 ${priorityCfg.chip}`}
            title="우선순위 변경"
          >
            {feature.priority_group}
          </button>
          {showPriorityMenu && (
            <>
              {/* 외부 클릭 닫기 */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowPriorityMenu(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-36">
                <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-100">우선순위 변경</div>
                {PRIORITY_GROUPS.map(g => {
                  const cfg = priorityConfig[g]
                  const isCurrent = feature.priority_group === g
                  return (
                    <button
                      key={g}
                      onClick={() => {
                        setShowPriorityMenu(false)
                        if (!isCurrent) onChangePriority(feature.id, g, feature.name)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${
                        isCurrent ? 'bg-slate-50 font-semibold' : ''
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                      <span className={isCurrent ? cfg.chip.split(' ')[1] : 'text-slate-600'}>
                        {cfg.label}
                      </span>
                      {isCurrent && <span className="ml-auto text-slate-400">✓</span>}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* 기능명 (클릭 시 토글) */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-sm font-medium text-slate-800 truncate">{feature.name}</p>
        </button>

        {/* 우측 상태 + 액션 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 상태 dot + 텍스트 */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            <span className={`text-xs ${status.text}`}>{status.label}</span>
          </div>

          {/* AI 생성 상태 */}
          {genStatus === 'generating' && (
            <span className="text-xs text-blue-500 animate-pulse hidden sm:block">생성 중...</span>
          )}
          {genStatus === 'error' && (
            <button
              onClick={() => generateSpec(feature.id, feature.name)}
              className="text-xs text-red-500 flex items-center gap-0.5 hover:underline"
            >
              <RotateCcw className="w-3 h-3" />재시도
            </button>
          )}

          {/* AI 기획서 생성 버튼 (미작성 상태만) */}
          {!genStatus && feature.status === 'planning' && (
            <button
              onClick={() => generateSpec(feature.id, feature.name)}
              disabled={isBulkGenerating}
              className="hidden group-hover:flex items-center gap-1 text-xs text-blue-600 px-2 py-0.5 rounded-md border border-blue-200 hover:bg-blue-50 transition-colors"
              title="AI 기획서 초안 생성"
            >
              <Zap className="w-3 h-3" />AI
            </button>
          )}

          {/* 상세 보기 링크 */}
          <Link
            href={`/projects/${projectId}/features/${feature.id}/spec`}
            className="p-1 rounded-md text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
            title="기획서 보기"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {/* 토글 화살표 */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 펼쳐진 상세 정보 ── */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-8 rounded-xl bg-white border border-slate-100 shadow-sm p-4 space-y-3">
            {/* 설명 */}
            {feature.description ? (
              <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">설명이 없습니다</p>
            )}

            {/* 메타 정보 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <MetaItem label="카테고리" value={categoryLabels[feature.category] || feature.category} />
              <MetaItem label="우선순위" value={feature.priority_group} />
              <MetaItem label="상태">
                <span className={`flex items-center gap-1.5 text-xs ${status.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              </MetaItem>
              {feature.order_key && (
                <MetaItem label="순서 키" value={feature.order_key} mono />
              )}
            </div>

            {/* AI 초안 생성 버튼 (미작성 상태) */}
            {feature.status === 'planning' && !genStatus && (
              <div className="pt-1 flex items-center gap-2">
                <button
                  onClick={() => generateSpec(feature.id, feature.name)}
                  disabled={isBulkGenerating}
                  className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  AI 기획서 초안 생성
                </button>
                <span className="text-xs text-slate-400">기획서가 아직 작성되지 않았습니다</span>
              </div>
            )}
            {genStatus === 'generating' && (
              <div className="flex items-center gap-2 text-xs text-blue-600 pt-1">
                <Zap className="w-3.5 h-3.5 animate-pulse" />AI 기획서 초안 생성 중...
              </div>
            )}
            {genStatus === 'done' && (
              <div className="flex items-center gap-2 text-xs text-green-600 pt-1">
                <CheckCircle className="w-3.5 h-3.5" />기획서 초안이 생성되었습니다
              </div>
            )}

            {/* 기획서 보기 버튼 */}
            <div className="pt-1">
              <Link
                href={`/projects/${projectId}/features/${feature.id}/spec`}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                기획서 상세 보기 <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 메타 아이템 ──────────────────────────────────────────────────────────────

function MetaItem({
  label, value, mono, children
}: {
  label: string
  value?: string
  mono?: boolean
  children?: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      {children ?? (
        <p className={`text-xs text-slate-700 font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
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
  }
  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverGroup(null)
    dragFeatureRef.current = null
  }
  const handleDragOver = (e: React.DragEvent, group: PriorityGroup) => {
    e.preventDefault()
    setDragOverGroup(group)
  }
  const handleDrop = (e: React.DragEvent, targetGroup: PriorityGroup) => {
    e.preventDefault()
    const feature = dragFeatureRef.current
    if (!feature) return
    if (feature.priority_group !== targetGroup) onChangePriority(feature.id, targetGroup, feature.name)
    setDraggingId(null)
    setDragOverGroup(null)
    dragFeatureRef.current = null
  }
  const handleDragLeave = (e: React.DragEvent) => {
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
            <div className={`rounded-t-xl px-3 py-2.5 ${cfg.headerClass}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">{cfg.label}</div>
                  <div className="text-xs opacity-80">{cfg.desc}</div>
                </div>
                <span className="text-lg font-bold opacity-90">{items.length}</span>
              </div>
            </div>
            {isOver && !isDraggingFromThisGroup && (
              <div className={`mx-2 mt-2 rounded-lg border-2 border-dashed ${cfg.borderClass} ${cfg.bgClass} p-3 text-center`}>
                <ArrowRight className="w-4 h-4 mx-auto mb-1 opacity-60" />
                <p className="text-xs font-medium opacity-70">{group}으로 이동</p>
              </div>
            )}
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
        <div className="flex items-start gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <Link
              href={`/projects/${projectId}/features/${feature.id}/spec`}
              onClick={e => isDragging && e.preventDefault()}
            >
              <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2 hover:text-blue-700 transition-colors">
                {feature.name}
              </p>
            </Link>
          </div>
        </div>
        {feature.description && (
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 pl-5">{feature.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-2.5 pl-5 flex-wrap">
          <span className="text-xs text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">
            {categoryLabels[feature.category] || feature.category}
          </span>
          {genStatus === 'generating' ? (
            <span className="text-xs text-blue-500 animate-pulse">생성 중...</span>
          ) : (
            <span className={`flex items-center gap-1 text-xs ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          )}
          {feature.status === 'approved' && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
        </div>
        <div className="mt-1.5 pl-5">
          <span className="text-xs font-mono text-slate-300">{feature.order_key}</span>
        </div>
      </div>
    </div>
  )
}

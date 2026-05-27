'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Calendar, ChevronLeft, ChevronRight, Zap, Plus, Check,
  Clock, AlertCircle, CheckCircle2, Trash2,
} from 'lucide-react'
import type { Feature, Project } from '@/types'

interface TaskSchedule {
  id: string
  feature_id: string
  start_date: string
  end_date: string
  note?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface Props {
  token: string
  project: Project
  features: Feature[]
  schedules: TaskSchedule[]
}

// ─── 날짜 유틸 ────────────────────────────────────────────────────────────────
function parseDate(s: string) { return new Date(s + 'T00:00:00') }
function isSameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }
function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }

// ─── 색상 팔레트 ──────────────────────────────────────────────────────────────
// 기능별로 색을 고정 할당 (index 기반)
const COLORS = [
  { bar: '#ef4444', barLight: '#fecaca', text: '#7f1d1d' }, // red
  { bar: '#f97316', barLight: '#fed7aa', text: '#7c2d12' }, // orange
  { bar: '#eab308', barLight: '#fef08a', text: '#713f12' }, // yellow
  { bar: '#22c55e', barLight: '#bbf7d0', text: '#14532d' }, // green
  { bar: '#3b82f6', barLight: '#bfdbfe', text: '#1e3a5f' }, // blue
  { bar: '#8b5cf6', barLight: '#ddd6fe', text: '#4c1d95' }, // violet
  { bar: '#ec4899', barLight: '#fbcfe8', text: '#831843' }, // pink
  { bar: '#14b8a6', barLight: '#99f6e4', text: '#134e4a' }, // teal
  { bar: '#f59e0b', barLight: '#fde68a', text: '#78350f' }, // amber
  { bar: '#6366f1', barLight: '#c7d2fe', text: '#312e81' }, // indigo
]
const PG_BADGE: Record<string, string> = {
  P0: 'text-red-700 bg-red-50 border-red-200',
  P1: 'text-orange-700 bg-orange-50 border-orange-200',
  P2: 'text-yellow-700 bg-yellow-50 border-yellow-200',
}

// ─── 주(week) 행 계산 ─────────────────────────────────────────────────────────
// cells: 월요일 시작, null=빈칸, Date=날짜
// 반환: [[null|Date x7], ...]
function buildWeekRows(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7 // 월=0 … 일=6
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))
  // 마지막 주 채우기
  while (cells.length % 7 !== 0) cells.push(null)
  const rows: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

// ─── 한 주(7일) 안에서 이벤트 스팬 계산 ──────────────────────────────────────
interface SpanEvent {
  scheduleId: string
  featureId: string
  colStart: number  // 0-based
  colSpan: number
  isStart: boolean
  isEnd: boolean
  label: string
  colorIdx: number
  status: 'pending' | 'approved' | 'rejected'
}

function getSpanEvents(
  weekDays: (Date | null)[],
  schedules: TaskSchedule[],
  featureColorMap: Map<string, number>,
  features: Feature[]
): SpanEvent[][] {
  // 최대 레이어 수 (동시에 몇 개까지 표시)
  const MAX_ROWS = 3
  // row별로 점유 여부 추적
  const occupied: boolean[][] = Array.from({ length: MAX_ROWS }, () => Array(7).fill(false))
  const result: SpanEvent[][] = Array.from({ length: MAX_ROWS }, () => [])

  // 이 주에 걸치는 일정 추출 (시작일 순 정렬)
  const weekStart = weekDays.find(d => d !== null)!
  const weekEnd = weekDays.filter(d => d !== null).slice(-1)[0]!

  const relevant = schedules
    .filter(s => {
      const sd = parseDate(s.start_date), ed = parseDate(s.end_date)
      return sd <= weekEnd && ed >= weekStart
    })
    .sort((a, b) => parseDate(a.start_date).getTime() - parseDate(b.start_date).getTime())

  for (const s of relevant) {
    const sd = parseDate(s.start_date), ed = parseDate(s.end_date)

    // 이 주에서의 시작/끝 열(column) 계산
    let colStart = -1, colEnd = -1
    for (let i = 0; i < 7; i++) {
      const d = weekDays[i]
      if (!d) continue
      if (d >= sd && colStart === -1) colStart = i
      if (d <= ed) colEnd = i
    }
    if (colStart === -1 || colEnd === -1) continue
    const colSpan = colEnd - colStart + 1

    // 빈 레이어 찾기
    let lane = -1
    for (let r = 0; r < MAX_ROWS; r++) {
      let free = true
      for (let c = colStart; c <= colEnd; c++) {
        if (occupied[r][c]) { free = false; break }
      }
      if (free) { lane = r; break }
    }
    if (lane === -1) continue // 넘치면 스킵

    // 점유 표시
    for (let c = colStart; c <= colEnd; c++) occupied[lane][c] = true

    const feature = features.find(f => f.id === s.feature_id)
    result[lane].push({
      scheduleId: s.id,
      featureId: s.feature_id,
      colStart,
      colSpan,
      isStart: sd >= weekStart && isSameDay(sd, weekDays.filter(d => d !== null)[0]!) || isSameDay(sd, weekDays[colStart]!),
      isEnd: isSameDay(ed, weekDays[colEnd]!) && (ed <= weekEnd),
      label: feature?.name || '',
      colorIdx: featureColorMap.get(s.feature_id) ?? 0,
      status: s.status,
    })
  }

  return result
}


export default function VendorCalendarClient({ token, project, features, schedules: initialSchedules }: Props) {
  const [schedules, setSchedules] = useState<TaskSchedule[]>(initialSchedules as TaskSchedule[])
  const [aiLoading, setAiLoading] = useState(false)

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [form, setForm] = useState({ start_date: '', end_date: '', note: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const contractStart = project.contract_start ? parseDate(project.contract_start) : null
  const contractEnd = project.contract_end ? parseDate(project.contract_end) : null

  // 기능별 색상 인덱스 고정
  const featureColorMap = useMemo(() => {
    const map = new Map<string, number>()
    features.forEach((f, i) => map.set(f.id, i % COLORS.length))
    return map
  }, [features])

  // 주 행 계산
  const weekRows = useMemo(() => buildWeekRows(viewYear, viewMonth), [viewYear, viewMonth])

  function isOutsideContract(day: Date) {
    if (!contractStart || !contractEnd) return false
    return day < contractStart || day > contractEnd
  }

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1) }

  const featuresByPG = useMemo(() => {
    const g: Record<string, Feature[]> = { P0: [], P1: [], P2: [] }
    features.forEach(f => { if (g[f.priority_group]) g[f.priority_group].push(f) })
    return g
  }, [features])

  // ─── AI 자동 배치 ───────────────────────────────────────────────────────────
  const handleAiArrange = async () => {
    if (!project.contract_start || !project.contract_end) {
      toast.error('계약 기간이 설정되지 않았습니다.')
      return
    }
    if (features.length === 0) {
      toast.error('배치할 기능이 없습니다.')
      return
    }
    setAiLoading(true)
    try {
      const p0 = features.filter(f => f.priority_group === 'P0')
      const p1 = features.filter(f => f.priority_group === 'P1')
      const p2 = features.filter(f => f.priority_group === 'P2')
      const allFeatures = [...p0, ...p1, ...p2]
      const unscheduled = allFeatures.filter(f => !schedules.some(s => s.feature_id === f.id))

      if (unscheduled.length === 0) {
        toast.info('이미 모든 기능에 일정이 배치되어 있습니다.')
        setAiLoading(false)
        return
      }

      const start = parseDate(project.contract_start)
      const end = parseDate(project.contract_end)
      const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
      const daysPerFeature = Math.min(14, Math.max(3, Math.floor(totalDays / unscheduled.length)))

      const newSchedules: Omit<TaskSchedule, 'id' | 'created_at'>[] = []
      let cursor = new Date(start)

      for (const feature of unscheduled) {
        const s = new Date(cursor)
        const e = addDays(cursor, daysPerFeature - 1)
        const clampedEnd = e > end ? new Date(end) : e
        newSchedules.push({
          feature_id: feature.id,
          start_date: toDateStr(s),
          end_date: toDateStr(clampedEnd),
          note: 'AI 자동 배치',
          status: 'pending',
        })
        cursor = addDays(e, 1)
      }

      const saved: TaskSchedule[] = []
      for (const ns of newSchedules) {
        const res = await fetch('/api/task-schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, project_id: project.id, ...ns }),
        })
        if (res.ok) {
          const d = await res.json()
          if (d.schedule) saved.push(d.schedule as TaskSchedule)
        }
      }

      if (saved.length > 0) {
        setSchedules(prev => [...prev, ...saved])
        toast.success(`${saved.length}개 기능의 일정을 자동 배치했습니다. 대표님 승인 후 확정됩니다.`)
      } else {
        toast.error('일정 저장 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
    } catch {
      toast.error('자동 배치 중 오류가 발생했습니다.')
    } finally {
      setAiLoading(false)
    }
  }

  // ─── 일정 추가 ──────────────────────────────────────────────────────────────
  const handleAddSchedule = async (featureId: string) => {
    if (!form.start_date || !form.end_date) { toast.error('시작일과 종료일을 입력해주세요.'); return }
    if (form.start_date > form.end_date) { toast.error('시작일이 종료일보다 늦을 수 없습니다.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/task-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, project_id: project.id, feature_id: featureId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'API 오류')
      setSchedules(prev => [...prev, data.schedule as TaskSchedule])
      setAddingFor(null)
      setForm({ start_date: '', end_date: '', note: '' })
      toast.success('일정이 추가되었습니다. 대표님 승인 후 확정됩니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 일정 삭제 ──────────────────────────────────────────────────────────────
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return
    setDeleting(scheduleId)
    try {
      const res = await fetch(`/api/task-schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) throw new Error('API 오류')
      setSchedules(prev => prev.filter(s => s.id !== scheduleId))
      toast.success('일정이 삭제되었습니다.')
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(null)
    }
  }

  const pendingCount = schedules.filter(s => s.status === 'pending').length
  const approvedCount = schedules.filter(s => s.status === 'approved').length

  return (
    <div className="space-y-6">

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">개발 일정 계획</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            기능별 작업 일정을 입력하면 대표님 승인 후 확정됩니다.
            {project.contract_start && project.contract_end && (
              <span className="ml-2 text-slate-400">계약기간: {project.contract_start} ~ {project.contract_end}</span>
            )}
          </p>
        </div>
        <Button
          onClick={handleAiArrange}
          disabled={aiLoading}
          className="bg-purple-600 hover:bg-purple-500 text-white gap-2 flex-shrink-0"
        >
          <Zap className="w-4 h-4" />
          {aiLoading ? 'AI 배치 중...' : 'AI 자동 배치'}
        </Button>
      </div>

      {/* 상태 배지 */}
      {schedules.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
              <Clock className="w-3.5 h-3.5" /> 승인 대기 {pendingCount}건
            </div>
          )}
          {approvedCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> 승인 완료 {approvedCount}건
            </div>
          )}
        </div>
      )}

      {/* ── 캘린더 (스패닝 바 방식) ── */}
      <Card className="border border-slate-200 overflow-hidden">
        <CardContent className="p-0">

          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <h3 className="text-base font-semibold text-slate-800">{viewYear}년 {viewMonth + 1}월</h3>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {['월', '화', '수', '목', '금', '토', '일'].map((d, i) => (
              <div key={d} className={`text-center text-xs font-medium py-2 ${i === 6 ? 'text-red-400' : i === 5 ? 'text-blue-400' : 'text-slate-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* 주 행들 */}
          {weekRows.map((weekDays, rowIdx) => {
            const spanRows = getSpanEvents(weekDays, schedules, featureColorMap, features)
            const hasAnySpan = spanRows.some(row => row.length > 0)

            return (
              <div key={rowIdx} className={`border-b border-slate-100 last:border-b-0 ${hasAnySpan ? '' : ''}`}>

                {/* 날짜 숫자 행 */}
                <div className="grid grid-cols-7">
                  {weekDays.map((day, colIdx) => {
                    if (!day) return <div key={colIdx} className="h-8 bg-slate-50/60" />
                    const outside = isOutsideContract(day)
                    const isToday = isSameDay(day, today)
                    return (
                      <div
                        key={colIdx}
                        className={`h-8 flex items-center px-1.5 ${outside ? 'bg-slate-50/80' : 'bg-white'}`}
                      >
                        <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-blue-600 text-white' :
                          outside ? 'text-slate-300' :
                          colIdx === 6 ? 'text-red-400' :
                          colIdx === 5 ? 'text-blue-400' :
                          'text-slate-700'
                        }`}>
                          {day.getDate()}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* 이벤트 스팬 바 영역 — 상대적 위치 기반 */}
                {hasAnySpan && (
                  <div className="relative px-0" style={{ minHeight: `${spanRows.filter(r => r.length > 0).length * 22 + 6}px` }}>
                    {spanRows.map((lane, laneIdx) =>
                      lane.map(ev => {
                        const c = COLORS[ev.colorIdx]
                        const isPending = ev.status === 'pending'
                        // 각 열 너비: 100% / 7
                        const leftPct = (ev.colStart / 7) * 100
                        const widthPct = (ev.colSpan / 7) * 100
                        return (
                          <div
                            key={ev.scheduleId + '-' + laneIdx}
                            title={`${ev.label} (${ev.status === 'pending' ? '승인 대기' : ev.status === 'approved' ? '승인됨' : '반려됨'})`}
                            style={{
                              position: 'absolute',
                              left: `calc(${leftPct}% + 2px)`,
                              width: `calc(${widthPct}% - 4px)`,
                              top: `${laneIdx * 22 + 3}px`,
                              height: '18px',
                              backgroundColor: isPending ? c.barLight : c.bar,
                              borderRadius: `${ev.isStart ? '4px' : '0'} ${ev.isEnd ? '4px' : '0'} ${ev.isEnd ? '4px' : '0'} ${ev.isStart ? '4px' : '0'}`,
                              borderLeft: ev.isStart ? 'none' : `2px solid ${c.bar}`,
                              opacity: isPending ? 0.85 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              overflow: 'hidden',
                              paddingLeft: ev.isStart ? '6px' : '4px',
                              paddingRight: '4px',
                            }}
                          >
                            {/* 시작 셀에만 기능명 표시 */}
                            {ev.isStart && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: isPending ? c.text : '#fff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1,
                              }}>
                                {ev.label}
                              </span>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

              </div>
            )
          })}

          {/* 범례 */}
          <div className="flex items-center gap-x-4 gap-y-1 px-4 py-3 border-t border-slate-100 flex-wrap">
            {features.slice(0, 8).map((f, i) => {
              const c = COLORS[i % COLORS.length]
              const hasSchedule = schedules.some(s => s.feature_id === f.id)
              if (!hasSchedule) return null
              return (
                <div key={f.id} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: c.bar }} />
                  <span className="truncate max-w-[80px]">{f.name}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto">
              <div className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200" />
              <span>계약기간 외</span>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* ── 기능 목록 + 일정 입력 ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">기능별 작업 일정</h2>

        {['P0', 'P1', 'P2'].map(pg => {
          if (!featuresByPG[pg]?.length) return null
          return (
            <div key={pg}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${PG_BADGE[pg]}`}>{pg}</span>
                <span className="text-xs text-slate-400">{featuresByPG[pg].length}개</span>
              </div>
              <div className="space-y-2">
                {featuresByPG[pg].map(feature => {
                  const featureSchedules = schedules.filter(s => s.feature_id === feature.id)
                  const isAddingThis = addingFor === feature.id
                  const colorIdx = featureColorMap.get(feature.id) ?? 0
                  const c = COLORS[colorIdx]

                  return (
                    <Card key={feature.id} className="border border-slate-200">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* 색상 도트 */}
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: c.bar }}
                            />
                            <span className="text-xs font-mono text-slate-400 flex-shrink-0">{feature.order_key}</span>
                            <p className="text-sm font-medium text-slate-900 truncate">{feature.name}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2 gap-1 flex-shrink-0"
                            onClick={() => {
                              if (isAddingThis) { setAddingFor(null) } else {
                                setAddingFor(feature.id)
                                setForm({ start_date: project.contract_start || '', end_date: '', note: '' })
                              }
                            }}
                          >
                            <Plus className="w-3 h-3" />
                            작업일정 추가하기
                          </Button>
                        </div>

                        {/* 기존 일정 목록 */}
                        {featureSchedules.length > 0 && (
                          <div className="space-y-1.5 mb-2">
                            {featureSchedules.map(s => (
                              <div
                                key={s.id}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                                  s.status === 'approved' ? 'bg-green-50 border border-green-100' :
                                  s.status === 'rejected' ? 'bg-red-50 border border-red-100' :
                                  'bg-amber-50 border border-amber-100'
                                }`}
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: s.status === 'approved' ? '#22c55e' : s.status === 'rejected' ? '#ef4444' : c.bar }}
                                />
                                <span className="text-slate-700 font-medium">{s.start_date} ~ {s.end_date}</span>
                                {s.note && <span className="text-slate-400">· {s.note}</span>}
                                <div className="ml-auto flex items-center gap-1.5">
                                  <span className={`font-medium ${
                                    s.status === 'approved' ? 'text-green-600' :
                                    s.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                                  }`}>
                                    {s.status === 'approved' ? '✓ 승인됨' : s.status === 'rejected' ? '✗ 반려됨' : '⏳ 승인 대기'}
                                  </span>
                                  {s.status === 'pending' && (
                                    <button
                                      className="text-slate-300 hover:text-red-400 transition-colors"
                                      disabled={deleting === s.id}
                                      onClick={() => handleDeleteSchedule(s.id)}
                                      title="삭제"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 일정 추가 폼 */}
                        {isAddingThis && (
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-3 mt-2">
                            <p className="text-xs font-semibold text-blue-800">📅 작업 일정 추가</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-slate-600 mb-1 block">시작일</Label>
                                <Input
                                  type="date"
                                  value={form.start_date}
                                  min={project.contract_start || undefined}
                                  max={project.contract_end || undefined}
                                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-slate-600 mb-1 block">종료일</Label>
                                <Input
                                  type="date"
                                  value={form.end_date}
                                  min={form.start_date || project.contract_start || undefined}
                                  max={project.contract_end || undefined}
                                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600 mb-1 block">메모 (선택)</Label>
                              <Input
                                value={form.note}
                                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                                placeholder="예: 백엔드 API 우선, 디자인 검토 필요"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => { setAddingFor(null); setForm({ start_date: '', end_date: '', note: '' }) }}>
                                취소
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white gap-1"
                                disabled={submitting || !form.start_date || !form.end_date}
                                onClick={() => handleAddSchedule(feature.id)}
                              >
                                <Check className="w-3 h-3" />
                                {submitting ? '저장 중...' : '일정 저장'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}

        {features.length === 0 && (
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">등록된 기능이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 안내 */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-500 leading-relaxed">
          <p className="font-semibold text-slate-600 mb-1">일정 입력 안내</p>
          <p>• 기능별로 복수의 작업 일정을 추가할 수 있습니다</p>
          <p>• 입력한 일정은 대표님 승인 후 공식 확정됩니다</p>
          <p>• 승인 대기 중인 일정은 삭제하거나 다시 추가할 수 있습니다</p>
          <p>• AI 자동 배치: P0→P1→P2 순서로 계약 기간 내 균등 배치합니다</p>
        </div>
      </div>

    </div>
  )
}

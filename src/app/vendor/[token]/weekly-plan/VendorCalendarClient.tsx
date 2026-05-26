'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Calendar, ChevronLeft, ChevronRight, Zap, Plus, X, Check,
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

// ─── 날짜 유틸 ─────────────────────────────────────────────────────────────
function parseDate(s: string) { return new Date(s + 'T00:00:00') }
function isSameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }

// 우선순위 색상
const PG_COLORS: Record<string, string> = {
  P0: 'bg-red-500',
  P1: 'bg-orange-400',
  P2: 'bg-yellow-400',
}
const PG_BADGE: Record<string, string> = {
  P0: 'text-red-700 bg-red-50 border-red-200',
  P1: 'text-orange-700 bg-orange-50 border-orange-200',
  P2: 'text-yellow-700 bg-yellow-50 border-yellow-200',
}

// 계약기간 → 주 목록
function getWeekRanges(contractStart: string, contractEnd: string): { start: string; end: string; label: string }[] {
  const start = parseDate(contractStart)
  const end = parseDate(contractEnd)
  const weeks: { start: string; end: string; label: string }[] = []
  let cur = new Date(start)
  // 해당 주 월요일로 정렬
  const dayOffset = (cur.getDay() + 6) % 7
  cur.setDate(cur.getDate() - dayOffset)
  let weekNum = 1
  while (cur <= end) {
    const weekEnd = new Date(cur)
    weekEnd.setDate(cur.getDate() + 6)
    weeks.push({
      start: cur.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0],
      label: `${weekNum}주차 (${cur.getMonth() + 1}/${cur.getDate()} ~ ${weekEnd.getMonth() + 1}/${weekEnd.getDate()})`,
    })
    cur.setDate(cur.getDate() + 7)
    weekNum++
  }
  return weeks
}

export default function VendorCalendarClient({ token, project, features, schedules: initialSchedules }: Props) {
  const [schedules, setSchedules] = useState<TaskSchedule[]>(initialSchedules as TaskSchedule[])
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  // 캘린더 뷰 상태
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // 일정 추가 폼 상태
  const [addingFor, setAddingFor] = useState<string | null>(null) // feature_id
  const [form, setForm] = useState({ start_date: '', end_date: '', note: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const contractStart = project.contract_start ? parseDate(project.contract_start) : null
  const contractEnd = project.contract_end ? parseDate(project.contract_end) : null

  // 달력 날짜 셀 생성
  const cells = useMemo<(Date | null)[]>(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7
    const arr: (Date | null)[] = []
    for (let i = 0; i < startOffset; i++) arr.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) arr.push(new Date(viewYear, viewMonth, d))
    return arr
  }, [viewYear, viewMonth])

  // 날짜가 계약기간 외인지
  function isOutsideContract(day: Date) {
    if (!contractStart || !contractEnd) return false
    return day < contractStart || day > contractEnd
  }

  // 해당 날짜에 걸치는 일정
  function schedulesOnDay(day: Date) {
    return schedules.filter(s => {
      const s2 = parseDate(s.start_date)
      const e2 = parseDate(s.end_date)
      return day >= s2 && day <= e2
    })
  }

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1) }

  // 기능별 그룹
  const featuresByPG = useMemo(() => {
    const g: Record<string, Feature[]> = { P0: [], P1: [], P2: [] }
    features.forEach(f => { if (g[f.priority_group]) g[f.priority_group].push(f) })
    return g
  }, [features])

  // AI 자동 배치
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
      const weeks = getWeekRanges(project.contract_start, project.contract_end)
      const p0 = features.filter(f => f.priority_group === 'P0')
      const p1 = features.filter(f => f.priority_group === 'P1')
      const p2 = features.filter(f => f.priority_group === 'P2')
      const allFeatures = [...p0, ...p1, ...p2]

      const weeksPerFeature = Math.max(1, Math.floor(weeks.length / Math.max(allFeatures.length, 1)))
      const newSchedules: Omit<TaskSchedule, 'id' | 'created_at'>[] = []
      let weekIdx = 0

      for (const feature of allFeatures) {
        // 이미 일정 있으면 스킵
        if (schedules.some(s => s.feature_id === feature.id)) continue
        if (weekIdx >= weeks.length) break
        const w = weeks[weekIdx]
        const endIdx = Math.min(weekIdx + weeksPerFeature - 1, weeks.length - 1)
        newSchedules.push({
          feature_id: feature.id,
          start_date: w.start,
          end_date: weeks[endIdx].end,
          note: 'AI 자동 배치',
          status: 'pending',
        })
        weekIdx += weeksPerFeature
      }

      // API 직렬 저장
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
        toast.info('이미 모든 기능에 일정이 배치되어 있거나 배치할 기능이 없습니다.')
      }
    } catch {
      toast.error('자동 배치 중 오류가 발생했습니다.')
    } finally {
      setAiLoading(false)
    }
  }

  // 일정 추가 제출
  const handleAddSchedule = async (featureId: string) => {
    if (!form.start_date || !form.end_date) {
      toast.error('시작일과 종료일을 입력해주세요.')
      return
    }
    if (form.start_date > form.end_date) {
      toast.error('시작일이 종료일보다 늦을 수 없습니다.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/task-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          project_id: project.id,
          feature_id: featureId,
          start_date: form.start_date,
          end_date: form.end_date,
          note: form.note || undefined,
        }),
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

  // 일정 삭제
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
          disabled={aiLoading || loading}
          className="bg-purple-600 hover:bg-purple-500 text-white gap-2 flex-shrink-0"
        >
          <Zap className="w-4 h-4" />
          {aiLoading ? 'AI 배치 중...' : 'AI 자동 배치'}
        </Button>
      </div>

      {/* 상태 요약 */}
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

      {/* 구글 캘린더 */}
      <Card className="border border-slate-200">
        <CardContent className="p-4">
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <h3 className="text-base font-semibold text-slate-800">
              {viewYear}년 {viewMonth + 1}월
            </h3>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-1">
            {['월', '화', '수', '목', '금', '토', '일'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-lg overflow-hidden">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="bg-white min-h-[80px]" />

              const outside = isOutsideContract(day)
              const todayCell = isSameDay(day, today)
              const daySchedules = schedulesOnDay(day)

              return (
                <div
                  key={i}
                  className={`bg-white min-h-[80px] p-1.5 relative ${
                    outside ? 'bg-slate-50 opacity-50' : 'hover:bg-blue-50/20'
                  }`}
                >
                  <div className={`w-6 h-6 flex items-center justify-center text-xs mb-1 rounded-full font-medium ${
                    todayCell ? 'bg-blue-600 text-white' :
                    outside ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {daySchedules.slice(0, 3).map(s => {
                      const feature = features.find(f => f.id === s.feature_id)
                      const pg = feature?.priority_group || 'P2'
                      const isStart = isSameDay(day, parseDate(s.start_date))
                      const isEnd = isSameDay(day, parseDate(s.end_date))
                      return (
                        <div
                          key={s.id}
                          className={`h-4 text-[10px] flex items-center px-1 text-white truncate ${PG_COLORS[pg] || 'bg-slate-400'} ${
                            isStart ? 'rounded-l-sm' : ''} ${isEnd ? 'rounded-r-sm' : ''} ${
                            s.status === 'pending' ? 'opacity-60' : ''
                          }`}
                          title={`${feature?.name} (${s.status === 'pending' ? '승인대기' : '승인됨'})`}
                        >
                          {isStart ? (feature?.name || '').slice(0, 5) : ''}
                        </div>
                      )
                    })}
                    {daySchedules.length > 3 && (
                      <div className="text-[9px] text-slate-400">+{daySchedules.length - 3}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 범례 */}
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500" /><span>P0</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-orange-400" /><span>P1</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-yellow-400" /><span>P2</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm opacity-50 bg-blue-400" /><span>승인 대기</span></div>
            {contractStart && contractEnd && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-100 border" /><span>계약기간 외</span></div>}
          </div>
        </CardContent>
      </Card>

      {/* 기능 목록 + 일정 입력 */}
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

                  return (
                    <Card key={feature.id} className="border border-slate-200">
                      <CardContent className="py-3 px-4">
                        {/* 기능 헤더 */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
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
                                  s.status === 'approved'
                                    ? 'bg-green-50 border border-green-100'
                                    : s.status === 'rejected'
                                      ? 'bg-red-50 border border-red-100'
                                      : 'bg-amber-50 border border-amber-100'
                                }`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  s.status === 'approved' ? 'bg-green-500' :
                                  s.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                                }`} />
                                <span className="text-slate-700 font-medium">
                                  {s.start_date} ~ {s.end_date}
                                </span>
                                {s.note && <span className="text-slate-400">· {s.note}</span>}
                                <div className="ml-auto flex items-center gap-1.5">
                                  <span className={`text-xs font-medium ${
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
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => { setAddingFor(null); setForm({ start_date: '', end_date: '', note: '' }) }}
                              >
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
          <p>• 기능별로 복수의 작업 일정을 추가할 수 있습니다 (간헐적 작업 지원)</p>
          <p>• 입력한 일정은 대표님 승인 후 공식 확정됩니다</p>
          <p>• 승인 대기 중인 일정은 삭제하거나 다시 추가할 수 있습니다</p>
          <p>• AI 자동 배치: 계약 기간을 기준으로 P0→P1→P2 순서로 균등 배치합니다</p>
        </div>
      </div>
    </div>
  )
}

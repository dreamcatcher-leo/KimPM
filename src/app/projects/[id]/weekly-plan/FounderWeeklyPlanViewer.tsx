'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Calendar, CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight, Check, X,
} from 'lucide-react'
import type { Feature } from '@/types'

interface TaskSchedule {
  id: string
  feature_id: string
  start_date: string
  end_date: string
  note?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface Project {
  id: string
  name: string
  contract_start: string | null
  contract_end: string | null
}

interface Props {
  projectId: string
  project: Project | null
  features: Feature[]
  schedules: TaskSchedule[]
}

// 날짜 유틸
function parseDate(s: string) { return new Date(s + 'T00:00:00') }
function formatDate(d: Date) { return d.toISOString().split('T')[0] }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function isSameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }

// 우선순위 색상
const PG_COLORS: Record<string, string> = {
  P0: 'bg-red-500',
  P1: 'bg-orange-400',
  P2: 'bg-yellow-400',
}
const PG_TEXT: Record<string, string> = {
  P0: 'text-red-700 bg-red-50 border-red-200',
  P1: 'text-orange-700 bg-orange-50 border-orange-200',
  P2: 'text-yellow-700 bg-yellow-50 border-yellow-200',
}

export default function FounderWeeklyPlanViewer({ projectId, project, features, schedules: initialSchedules }: Props) {
  const [schedules, setSchedules] = useState<TaskSchedule[]>(initialSchedules as TaskSchedule[])
  const [approving, setApproving] = useState<string | null>(null)

  // 현재 표시 월
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-based

  const contractStart = project?.contract_start ? parseDate(project.contract_start) : null
  const contractEnd = project?.contract_end ? parseDate(project.contract_end) : null

  // 달력 날짜 생성
  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  // 월요일 시작
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(viewYear, viewMonth, d))

  // 날짜 → 이 날에 걸치는 일정들
  function schedulesOnDay(day: Date): (TaskSchedule & { feature: Feature | undefined })[] {
    return schedules
      .filter(s => {
        const start = parseDate(s.start_date)
        const end = parseDate(s.end_date)
        return day >= start && day <= end
      })
      .map(s => ({ ...s, feature: features.find(f => f.id === s.feature_id) }))
  }

  // 개발기간 외 여부
  function isOutsideContract(day: Date) {
    if (!contractStart || !contractEnd) return false
    return day < contractStart || day > contractEnd
  }
  function isToday(day: Date) { return isSameDay(day, today) }

  // 미승인 일정
  const pendingSchedules = schedules.filter(s => s.status === 'pending')
  const approvedSchedules = schedules.filter(s => s.status === 'approved')

  // 승인 / 거절
  const handleApprove = async (scheduleId: string, action: 'approved' | 'rejected') => {
    setApproving(scheduleId)
    try {
      const res = await fetch(`/api/task-schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, project_id: projectId }),
      })
      if (!res.ok) throw new Error('API 오류')
      setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, status: action } : s))
      toast.success(action === 'approved' ? '일정을 승인했습니다.' : '일정을 반려했습니다.')
    } catch {
      toast.error('처리 중 오류가 발생했습니다.')
    } finally {
      setApproving(null)
    }
  }

  const monthLabel = `${viewYear}년 ${viewMonth + 1}월`
  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1) }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">개발 일정 현황</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          외주사가 입력한 개발 일정을 확인하고 승인합니다.
          {project?.contract_start && project?.contract_end && (
            <span className="ml-2 text-slate-400">계약기간: {project.contract_start} ~ {project.contract_end}</span>
          )}
        </p>
      </div>

      {/* 미승인 일정 알림 */}
      {pendingSchedules.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              외주사가 입력한 일정 {pendingSchedules.length}건의 승인이 필요합니다
            </p>
          </div>
          <div className="space-y-2">
            {pendingSchedules.map(s => {
              const feature = features.find(f => f.id === s.feature_id)
              return (
                <div key={s.id} className="bg-white border border-amber-100 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${PG_TEXT[feature?.priority_group || 'P2'] || ''}`}>
                        {feature?.priority_group || ''}
                      </span>
                      <span className="text-sm font-medium text-slate-900 truncate">{feature?.name || '알 수 없는 기능'}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {s.start_date} ~ {s.end_date}
                      {s.note && <span className="ml-2 text-slate-400">· {s.note}</span>}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      className="h-7 px-3 bg-green-600 hover:bg-green-500 text-white gap-1 text-xs"
                      disabled={approving === s.id}
                      onClick={() => handleApprove(s.id, 'approved')}
                    >
                      <Check className="w-3 h-3" /> 승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 border-red-200 text-red-600 hover:bg-red-50 gap-1 text-xs"
                      disabled={approving === s.id}
                      onClick={() => handleApprove(s.id, 'rejected')}
                    >
                      <X className="w-3 h-3" /> 반려
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 구글 캘린더 스타일 */}
      <Card className="border border-slate-200">
        <CardContent className="p-4">
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <h3 className="text-base font-semibold text-slate-800">{monthLabel}</h3>
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
              const todayCell = isToday(day)
              const daySchedules = schedulesOnDay(day)

              return (
                <div
                  key={i}
                  className={`bg-white min-h-[80px] p-1.5 relative transition-colors ${
                    outside ? 'bg-slate-50 opacity-50' : 'hover:bg-blue-50/30'
                  }`}
                >
                  {/* 날짜 숫자 */}
                  <div className={`w-6 h-6 flex items-center justify-center text-xs mb-1 rounded-full font-medium ${
                    todayCell
                      ? 'bg-blue-600 text-white'
                      : outside
                        ? 'text-slate-300'
                        : 'text-slate-700'
                  }`}>
                    {day.getDate()}
                  </div>

                  {/* 일정 바 */}
                  <div className="space-y-0.5">
                    {daySchedules.slice(0, 3).map(s => {
                      const pg = s.feature?.priority_group || 'P2'
                      const isStart = isSameDay(day, parseDate(s.start_date))
                      const isEnd = isSameDay(day, parseDate(s.end_date))
                      return (
                        <div
                          key={s.id}
                          className={`h-4 text-[10px] flex items-center px-1 text-white truncate font-medium ${PG_COLORS[pg] || 'bg-slate-400'} ${
                            isStart ? 'rounded-l-sm' : ''
                          } ${isEnd ? 'rounded-r-sm' : ''} ${
                            s.status === 'pending' ? 'opacity-60' : ''
                          }`}
                          title={`${s.feature?.name} (${s.start_date}~${s.end_date})`}
                        >
                          {isStart ? (s.feature?.name || '').slice(0, 6) : ''}
                        </div>
                      )
                    })}
                    {daySchedules.length > 3 && (
                      <div className="text-[9px] text-slate-400 pl-0.5">+{daySchedules.length - 3}개</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 범례 */}
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500" /><span>P0 (최우선)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-orange-400" /><span>P1</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-yellow-400" /><span>P2</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-200" /><span>계약기간 외 (딤처리)</span></div>
            {pendingSchedules.length > 0 && (
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm opacity-60 bg-blue-400" /><span>승인 대기 중</span></div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 빈 상태 */}
      {schedules.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-700 mb-1">아직 외주사가 개발 일정을 입력하지 않았습니다</h4>
          <p className="text-sm text-slate-400 leading-relaxed">
            외주사 포털에서 개발 일정을 입력하면 이 곳에 표시됩니다.<br />
            입력된 일정은 대표님의 승인 후 확정됩니다.
          </p>
        </div>
      )}

      {/* 승인된 일정 목록 */}
      {approvedSchedules.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            승인된 일정 {approvedSchedules.length}건
          </h3>
          <div className="space-y-2">
            {approvedSchedules.map(s => {
              const feature = features.find(f => f.id === s.feature_id)
              const pg = feature?.priority_group || 'P2'
              return (
                <div key={s.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${PG_TEXT[pg] || ''}`}>{pg}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{feature?.name || '알 수 없는 기능'}</p>
                    <p className="text-xs text-slate-400">{s.start_date} ~ {s.end_date}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs flex-shrink-0">승인됨</Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 안내 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Clock className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 leading-relaxed">
          <p className="font-semibold mb-1">개발 일정 관리 안내</p>
          <p>외주사가 외주사 포털에서 기능별 작업 일정을 입력하면 위 캘린더에 표시됩니다.</p>
          <p className="mt-1">대표님이 승인하면 공식 일정으로 확정되며 대시보드에 반영됩니다.</p>
        </div>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, ChevronRight, AlertCircle, Sparkles } from 'lucide-react'

export interface TodayTodo {
  id: string
  done: boolean
  urgent: boolean          // 빨간 강조
  label: string            // 짧은 행동 텍스트
  sub: string              // 한 줄 이유
  href: string             // 클릭 시 이동
  badge?: string           // 우측 작은 뱃지 (예: "3건")
}

interface Props {
  todos: TodayTodo[]
  founderName?: string | null
}

export default function TodayTodoPanel({ todos, founderName }: Props) {
  const doneCount = todos.filter(t => t.done).length
  const totalCount = todos.length
  const allDone = doneCount === totalCount
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 100

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* ── 헤더 ── */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-bold text-slate-800">
                {founderName ? `${founderName}님, 오늘 할 일` : '오늘 할 일'}
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              {allDone
                ? '🎉 오늘 할 일을 모두 완료했습니다!'
                : `${totalCount - doneCount}개 남음 · ${doneCount}/${totalCount} 완료`}
            </p>
          </div>

          {/* 원형 진행률 */}
          <div className="relative w-12 h-12 flex-shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke={allDone ? '#22c55e' : pct >= 50 ? '#3b82f6' : '#f59e0b'}
                strokeWidth="3"
                strokeDasharray={`${pct} 100`}
                strokeDashoffset="0"
                strokeLinecap="round"
                pathLength="100"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
              {pct}%
            </span>
          </div>
        </div>

        {/* 선형 진행 바 */}
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allDone ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── 태스크 목록 ── */}
      <ul className="divide-y divide-slate-50">
        {todos.map((todo, i) => (
          <li key={todo.id}>
            <Link
              href={todo.href}
              className={`flex items-center gap-3 px-5 py-3.5 transition-colors group ${
                todo.done
                  ? 'hover:bg-slate-50'
                  : todo.urgent
                  ? 'hover:bg-red-50'
                  : 'hover:bg-blue-50/50'
              }`}
            >
              {/* 체크 아이콘 */}
              <div className="flex-shrink-0">
                {todo.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : todo.urgent ? (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                )}
              </div>

              {/* 순서 번호 */}
              <span className={`text-xs font-mono w-4 flex-shrink-0 ${
                todo.done ? 'text-slate-300' : 'text-slate-400'
              }`}>
                {i + 1}
              </span>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug ${
                  todo.done
                    ? 'line-through text-slate-400'
                    : todo.urgent
                    ? 'text-red-700'
                    : 'text-slate-800'
                }`}>
                  {todo.label}
                </p>
                <p className={`text-xs mt-0.5 truncate ${
                  todo.done ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  {todo.sub}
                </p>
              </div>

              {/* 우측 뱃지 + 화살표 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {todo.badge && !todo.done && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    todo.urgent
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {todo.badge}
                  </span>
                )}
                <ChevronRight className={`w-4 h-4 transition-colors ${
                  todo.done
                    ? 'text-slate-200'
                    : 'text-slate-300 group-hover:text-slate-500'
                }`} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* ── 하단 안내 (모두 완료 시) ── */}
      {allDone && (
        <div className="px-5 py-3 bg-green-50 border-t border-green-100">
          <p className="text-xs text-green-700 font-medium text-center">
            ✅ 오늘의 모든 항목을 완료했습니다. 내일 또 확인해주세요!
          </p>
        </div>
      )}
    </div>
  )
}

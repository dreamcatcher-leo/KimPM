'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Zap, ChevronRight } from 'lucide-react'
import type { FounderDailyBrief } from '@/types'

// DB에 실제 저장된 key_signals 구조: {rank, level, signal, feature}
interface RawSignal {
  rank?: number
  level?: string   // '주의' | '위험' | '정보' | '경고' | '긍정'
  signal?: string  // 신호 텍스트
  feature?: string // 관련 기능명
  // 레거시: {type, title, description} 형태도 허용
  type?: string
  title?: string
  description?: string
}

interface FounderBriefCardProps {
  brief: FounderDailyBrief
  projectId: string
}

// level → 시각 설정 매핑
const levelConfig: Record<string, { emoji: string; class: string }> = {
  '위험':  { emoji: '🔴', class: 'border-l-red-400 bg-red-50' },
  '경고':  { emoji: '🔴', class: 'border-l-red-400 bg-red-50' },
  'critical': { emoji: '🔴', class: 'border-l-red-400 bg-red-50' },
  '주의':  { emoji: '⚠️', class: 'border-l-yellow-400 bg-yellow-50' },
  'warning':  { emoji: '⚠️', class: 'border-l-yellow-400 bg-yellow-50' },
  '정보':  { emoji: 'ℹ️', class: 'border-l-blue-400 bg-blue-50' },
  '긍정':  { emoji: '✅', class: 'border-l-green-400 bg-green-50' },
  'positive': { emoji: '✅', class: 'border-l-green-400 bg-green-50' },
}
const defaultConfig = { emoji: '⚠️', class: 'border-l-yellow-400 bg-yellow-50' }

export default function FounderBriefCard({ brief, projectId }: FounderBriefCardProps) {
  // DB 구조({rank,level,signal,feature})와 레거시 구조({type,title,description}) 모두 처리
  const rawSignals = (brief.key_signals ?? []) as RawSignal[]

  // 예약 브리프인지 확인 (summary가 예약 안내 텍스트)
  const isScheduled = brief.report_summary?.startsWith('(예약 브리프')

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            Founder Daily Brief — {brief.brief_date}
          </CardTitle>
          {brief.sent_at && (
            <Badge variant="outline" className="text-xs">발송됨</Badge>
          )}
          {isScheduled && (
            <Badge variant="outline" className="text-xs text-slate-400 border-slate-300">예약됨</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* 예약 브리프 안내 */}
        {isScheduled ? (
          <p className="text-xs text-slate-400 italic mb-3">
            오늘 밤 자동으로 생성될 예정입니다. 미리 보기 위해 아래 시그널을 참고하세요.
          </p>
        ) : (
          brief.report_summary && (
            <p className="text-sm text-slate-700 mb-3 font-medium">{brief.report_summary}</p>
          )
        )}

        <div className="space-y-2 mb-3">
          {rawSignals.length === 0 && (
            <p className="text-xs text-slate-400">분석 시그널이 없습니다.</p>
          )}
          {rawSignals.map((signal, i) => {
            // DB 구조: level + signal 텍스트 사용
            const levelKey = signal.level || signal.type || ''
            const config = levelConfig[levelKey] || defaultConfig
            const mainText = signal.signal || signal.title || ''
            const subText = signal.feature
              ? `관련 기능: ${signal.feature}`
              : (signal.description || '')
            return (
              <div key={i} className={`border-l-4 ${config.class} pl-3 py-1.5 rounded-r-lg`}>
                <p className="text-xs font-medium text-slate-800">
                  {config.emoji} {mainText}
                </p>
                {subText && <p className="text-xs text-slate-500 mt-0.5">{subText}</p>}
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {(brief.must_check_items as { id: string; title: string }[]).length > 0 && (
            <Link href={`/projects/${projectId}/must-check`}>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center cursor-pointer hover:bg-purple-100 transition-colors">
                <p className="text-xs text-purple-600">Must-Check</p>
                <p className="text-lg font-bold text-purple-700">{brief.must_check_items.length}</p>
              </div>
            </Link>
          )}
          {(brief.decision_items as { id: string; title: string }[]).length > 0 && (
            <Link href={`/projects/${projectId}/decisions`}>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center cursor-pointer hover:bg-orange-100 transition-colors">
                <p className="text-xs text-orange-600">의사결정</p>
                <p className="text-lg font-bold text-orange-700">{brief.decision_items.length}</p>
              </div>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

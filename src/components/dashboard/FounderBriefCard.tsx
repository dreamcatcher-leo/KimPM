'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Zap, ChevronRight } from 'lucide-react'
import type { FounderDailyBrief, BriefSignal } from '@/types'

interface FounderBriefCardProps {
  brief: FounderDailyBrief
  projectId: string
}

const signalConfig = {
  positive: { emoji: '✅', class: 'border-l-green-400 bg-green-50' },
  warning: { emoji: '⚠️', class: 'border-l-yellow-400 bg-yellow-50' },
  critical: { emoji: '🔴', class: 'border-l-red-400 bg-red-50' },
}

export default function FounderBriefCard({ brief, projectId }: FounderBriefCardProps) {
  const signals = brief.key_signals as BriefSignal[]

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
        </div>
      </CardHeader>
      <CardContent>
        {brief.report_summary && (
          <p className="text-sm text-slate-700 mb-3 font-medium">{brief.report_summary}</p>
        )}

        <div className="space-y-2 mb-3">
          {signals.map((signal, i) => {
            const config = signalConfig[signal.type as keyof typeof signalConfig] || signalConfig.warning
            return (
              <div key={i} className={`border-l-4 ${config.class} pl-3 py-1.5 rounded-r-lg`}>
                <p className="text-xs font-medium text-slate-800">
                  {config.emoji} {signal.title}
                </p>
                <p className="text-xs text-slate-600">{signal.description}</p>
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

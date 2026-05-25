'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Zap, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface GenerateBriefButtonProps {
  projectId: string
  hasBrief?: boolean
}

export default function GenerateBriefButton({ projectId, hasBrief = false }: GenerateBriefButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/projects/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '브리프 생성 실패')

      toast.success('Founder Daily Brief가 생성되었습니다', {
        description: '페이지를 새로고침하면 최신 브리프를 확인할 수 있습니다.',
        action: {
          label: '새로고침',
          onClick: () => window.location.reload(),
        },
      })
    } catch (err) {
      toast.error('브리프 생성 실패', {
        description: err instanceof Error ? err.message : '잠시 후 다시 시도해주세요',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={isLoading}
      size="sm"
      variant={hasBrief ? 'outline' : 'default'}
      className={`gap-2 ${hasBrief ? 'text-slate-600' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : hasBrief ? (
        <RefreshCw className="w-3.5 h-3.5" />
      ) : (
        <Zap className="w-3.5 h-3.5" />
      )}
      {isLoading ? '생성 중...' : hasBrief ? '브리프 재생성' : '오늘 브리프 생성'}
    </Button>
  )
}

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Link2, Copy, RefreshCw, ExternalLink } from 'lucide-react'
import type { AccessLink } from '@/types'

interface VendorLinkCardProps {
  projectId: string
  vendorLink: AccessLink | null
  vendorAccessUrl: string | null
}

export default function VendorLinkCard({ projectId, vendorLink, vendorAccessUrl }: VendorLinkCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentLink, setCurrentLink] = useState(vendorLink)
  const [currentUrl, setCurrentUrl] = useState(vendorAccessUrl)

  const generateLink = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/vendor-link`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCurrentLink(data.link)
      setCurrentUrl(data.url)
      toast.success('외주사 링크가 생성되었습니다')
    } catch (err) {
      toast.error('링크 생성 실패')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyUrl = () => {
    if (currentUrl) {
      navigator.clipboard.writeText(currentUrl)
      toast.success('링크가 클립보드에 복사되었습니다')
    }
  }

  return (
    <Card className="border-blue-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-600" />
          외주사 접속 링크
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentLink && currentUrl ? (
          <div className="space-y-2">
            <div className="bg-slate-50 rounded-lg p-2">
              <p className="text-xs text-slate-400 mb-1">외주사 포털 URL</p>
              <p className="text-xs text-slate-700 break-all font-mono">{currentUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyUrl} size="sm" variant="outline" className="flex-1 gap-1.5 text-xs">
                <Copy className="w-3 h-3" />
                복사
              </Button>
              <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <ExternalLink className="w-3 h-3" />
                  열기
                </Button>
              </a>
            </div>
            <Button
              onClick={generateLink}
              size="sm"
              variant="ghost"
              className="w-full gap-1.5 text-xs text-slate-500"
              disabled={isGenerating}
            >
              <RefreshCw className="w-3 h-3" />
              {isGenerating ? '생성 중...' : '새 링크 발급'}
            </Button>
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-xs text-slate-500 mb-3">외주사 접속 링크를 발급해주세요</p>
            <Button
              onClick={generateLink}
              disabled={isGenerating}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 gap-2 w-full"
            >
              <Link2 className="w-3.5 h-3.5" />
              {isGenerating ? '생성 중...' : '링크 발급'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

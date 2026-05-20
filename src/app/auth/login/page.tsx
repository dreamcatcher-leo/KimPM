'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMagicLink, setIsMagicLink] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (isMagicLink) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
        },
      })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('이메일을 확인해주세요. 로그인 링크를 발송했습니다.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error('로그인 실패: ' + error.message)
      } else {
        router.push(redirectTo)
        router.refresh()
      }
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              DG
            </div>
            <span className="text-white text-xl font-semibold">DeliveryGuard PM</span>
          </div>
          <p className="text-slate-400 text-sm">for BeforePet — AI 외주 PM 워크스페이스</p>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">로그인</CardTitle>
            <CardDescription className="text-slate-400">
              대표(Founder) 계정으로 로그인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@beforepet.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              {!isMagicLink && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!isMagicLink}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500"
                disabled={isLoading}
              >
                {isLoading ? '처리 중...' : isMagicLink ? '매직링크 발송' : '로그인'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsMagicLink(!isMagicLink)}
                className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
              >
                {isMagicLink ? '비밀번호로 로그인' : '이메일 링크로 로그인'}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-xs mt-6">
          외주사라면 대표로부터 받은 링크를 통해 접속해주세요
        </p>
      </div>
    </div>
  )
}

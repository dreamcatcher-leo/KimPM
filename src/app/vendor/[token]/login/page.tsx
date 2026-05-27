'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function VendorLoginPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다')
        } else {
          setError(signInError.message)
        }
        setLoading(false)
        return
      }

      // 로그인 성공 → 외주사 홈으로 이동
      router.push(`/vendor/${token}`)
      router.refresh()

    } catch (e) {
      setError(String(e))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* 헤더 */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-8 py-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center text-xs font-bold">PM</div>
            <span className="text-sm text-blue-200">김PM 외주사 포털</span>
          </div>
          <h1 className="text-xl font-bold mt-3">외주사 로그인</h1>
          <p className="text-blue-200 text-sm mt-1">
            이미 계정이 있으신가요?<br />
            이메일과 비밀번호로 로그인해주세요.
          </p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleLogin} className="px-8 py-6 space-y-4">

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* 이메일 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Mail className="w-3.5 h-3.5 inline mr-1" />
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vendor@example.com"
              autoComplete="email"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Lock className="w-3.5 h-3.5 inline mr-1" />
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                autoComplete="current-password"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                {showPassword ? '숨기기' : '보기'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                로그인 중...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                로그인
              </>
            )}
          </button>

          {/* 계정 없음 → 온보딩으로 */}
          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              처음 접속하셨나요?{' '}
              <a
                href={`/vendor/${token}/onboarding`}
                className="text-blue-500 hover:underline font-medium"
              >
                계정 만들기
              </a>
            </p>
          </div>

        </form>
      </div>
    </div>
  )
}

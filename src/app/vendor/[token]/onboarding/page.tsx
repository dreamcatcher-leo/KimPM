'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Building2, User, Lock, Mail, ArrowRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function VendorOnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [step, setStep] = useState<'form' | 'loading' | 'done'>('form')
  const [error, setError] = useState('')

  // 입력값
  const [email, setEmail] = useState('vendor-test@kimpm.dev')
  const [password, setPassword] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [contactName, setContactName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [projectName, setProjectName] = useState('')

  const handleSubmit = async () => {
    if (!email || !password || !vendorName) {
      setError('이메일, 비밀번호, 회사명은 필수입니다')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다')
      return
    }

    setStep('loading')
    setError('')

    try {
      // 1. 온보딩 API 호출 - 계정 생성 + 링크 연결
      const res = await fetch('/api/vendor/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password, vendor_name: vendorName, contact_name: contactName }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.alreadyLinked) {
          // 이미 연결된 계정 → 로그인 시도
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
          if (signInError) {
            setError(`이미 연결된 계정입니다. 기존 비밀번호로 로그인해 주세요.\n오류: ${signInError.message}`)
            setStep('form')
            return
          }
          router.push(`/vendor/${token}`)
          return
        }
        setError(data.error || '오류가 발생했습니다')
        setStep('form')
        return
      }

      setProjectName(data.projectName || '')

      // 2. 생성된 계정으로 자동 로그인
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(`계정 생성은 완료됐지만 로그인 실패: ${signInError.message}`)
        setStep('form')
        return
      }

      setStep('done')

      // 2.5초 후 홈으로 이동
      setTimeout(() => {
        router.push(`/vendor/${token}`)
      }, 2500)

    } catch (e) {
      setError(String(e))
      setStep('form')
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">연결 완료!</h2>
          <p className="text-slate-500 text-sm mb-1">
            {projectName && <><span className="font-semibold text-slate-700">{projectName}</span> 프로젝트와</>} 계정이 연결됐습니다.
          </p>
          <p className="text-slate-400 text-xs">보고 페이지로 이동 중...</p>
          <div className="mt-4 flex justify-center">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">계정 설정 중...</p>
          <p className="text-slate-400 text-sm mt-1">잠시만 기다려 주세요</p>
        </div>
      </div>
    )
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
          <h1 className="text-xl font-bold mt-3">외주사 계정 설정</h1>
          <p className="text-blue-200 text-sm mt-1">
            대표님이 공유한 링크로 접속하셨습니다.<br/>
            계정을 설정하면 이 프로젝트에 바로 연결됩니다.
          </p>
        </div>

        {/* 폼 */}
        <div className="px-8 py-6 space-y-4">

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
            </div>
          )}

          {/* 회사명 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Building2 className="w-3.5 h-3.5 inline mr-1" />
              회사명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={vendorName}
              onChange={e => setVendorName(e.target.value)}
              placeholder="예: 개발사 이름"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 담당자명 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <User className="w-3.5 h-3.5 inline mr-1" />
              담당자명
            </label>
            <input
              type="text"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400 mb-3">로그인 계정 정보</p>

            {/* 이메일 */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Mail className="w-3.5 h-3.5 inline mr-1" />
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vendor@example.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Lock className="w-3.5 h-3.5 inline mr-1" />
                비밀번호 설정 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="6자 이상"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
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
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
          >
            계정 설정 완료
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-slate-400 text-center">
            이미 계정이 있으신가요?{' '}
            <a href="/auth/login" className="text-blue-500 hover:underline">로그인</a>
          </p>
        </div>
      </div>
    </div>
  )
}

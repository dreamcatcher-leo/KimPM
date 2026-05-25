'use client'

import { useState, useEffect } from 'react'
import { Key, CheckCircle2, AlertCircle, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react'

interface EnvInfo {
  key: string
  updatedAt?: number
  type: string
}

export default function EnvUpdatePage() {
  const [openaiKey, setOpenaiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [envList, setEnvList] = useState<EnvInfo[]>([])
  const [loadingEnvs, setLoadingEnvs] = useState(true)

  // 현재 Vercel 환경변수 상태 조회
  useEffect(() => {
    fetch('/api/admin/env-update')
      .then(r => r.json())
      .then(d => {
        setEnvList(d.envs || [])
        setLoadingEnvs(false)
      })
      .catch(() => setLoadingEnvs(false))
  }, [])

  const handleUpdate = async () => {
    if (!openaiKey.trim()) return
    if (!openaiKey.startsWith('sk-')) {
      setResult({ success: false, message: 'OpenAI API 키는 sk- 로 시작해야 합니다' })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/env-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'OPENAI_API_KEY', value: openaiKey.trim() }),
      })
      const data = await res.json()

      if (res.ok) {
        setResult({ success: true, message: data.message })
        setOpenaiKey('')
        // 환경변수 목록 새로고침
        const updatedRes = await fetch('/api/admin/env-update')
        const updatedData = await updatedRes.json()
        setEnvList(updatedData.envs || [])
      } else {
        setResult({ success: false, message: data.error || '업데이트 실패' })
      }
    } catch (e) {
      setResult({ success: false, message: String(e) })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (ts?: number) => {
    if (!ts) return '알 수 없음'
    return new Date(ts).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const openaiEnv = envList.find(e => e.key === 'OPENAI_API_KEY')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">API 키 관리</h1>
            <p className="text-sm text-slate-400">Vercel 환경변수를 안전하게 업데이트합니다</p>
          </div>
        </div>

        {/* 현재 상태 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300">현재 Vercel 환경변수 상태</h2>
            {loadingEnvs && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
          </div>

          {!loadingEnvs && openaiEnv ? (
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div>
                <p className="text-sm font-mono text-yellow-300">OPENAI_API_KEY</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  마지막 업데이트: {formatDate(openaiEnv.updatedAt)}
                </p>
              </div>
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                encrypted
              </span>
            </div>
          ) : !loadingEnvs ? (
            <p className="text-sm text-red-400">⚠️ OPENAI_API_KEY 환경변수가 없습니다</p>
          ) : null}
        </div>

        {/* 입력 폼 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">새 OpenAI API 키 입력</h2>

          <div className="space-y-3">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={openaiKey}
                onChange={e => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 pr-12
                           text-white placeholder-slate-500 font-mono text-sm
                           focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onKeyDown={e => e.key === 'Enter' && handleUpdate()}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-xs text-slate-500">
              💡 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:underline">platform.openai.com/api-keys</a>에서
              새 키를 발급받아 붙여넣으세요
            </p>

            <button
              onClick={handleUpdate}
              disabled={loading || !openaiKey.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500
                         text-white font-semibold py-3 rounded-lg transition-colors
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Vercel 업데이트 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Vercel에 적용 + 재배포
                </>
              )}
            </button>
          </div>

          {/* 결과 메시지 */}
          {result && (
            <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
              result.success
                ? 'bg-green-900/30 border border-green-800'
                : 'bg-red-900/30 border border-red-800'
            }`}>
              {result.success
                ? <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className={`text-sm font-medium ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                  {result.success ? '업데이트 완료!' : '오류 발생'}
                </p>
                <p className="text-xs text-slate-400 mt-1">{result.message}</p>
                {result.success && (
                  <p className="text-xs text-slate-400 mt-2">
                    ⏳ Vercel 재배포가 시작됩니다. 약 1~2분 후 프로덕션에 반영됩니다.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 안내 */}
        <div className="mt-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            🔒 이 페이지는 로그인한 사용자만 접근 가능합니다.<br />
            입력한 키는 Vercel 환경변수에 암호화되어 저장되며,<br />
            이 페이지에는 저장되지 않습니다.
          </p>
        </div>

      </div>
    </div>
  )
}

import { useState, useRef, useCallback, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
import api from '../../services/api'

const ORBS = [
  { ox: -200, oy: -180, size: 380, color: 'rgba(99,102,241,0.22)',  speed: 0.035 },
  { ox:  180, oy:  120, size: 300, color: 'rgba(14,165,233,0.18)',  speed: 0.055 },
  { ox:   30, oy:  200, size: 240, color: 'rgba(139,92,246,0.15)', speed: 0.025 },
  { ox:  220, oy: -220, size: 200, color: 'rgba(6,182,212,0.16)',  speed: 0.045 },
]

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirm]     = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [isLoading, setIsLoading]         = useState(false)
  const [error, setError]                 = useState('')
  const [done, setDone]                   = useState(false)

  const leftPanelRef = useRef<HTMLDivElement>(null)
  const orbRefs      = useRef<(HTMLDivElement | null)[]>([])
  const orbOff       = useRef(ORBS.map(() => ({ x: 0, y: 0 })))
  const mouseOff     = useRef({ x: 0, y: 0 })
  const rafLeft      = useRef<number>(0)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const spotRef       = useRef<HTMLDivElement>(null)
  const spotCur  = useRef({ x: 0, y: 0 })
  const spotTgt  = useRef({ x: 0, y: 0 })
  const rafRight = useRef<number>(0)

  const animateOrbs = useCallback(() => {
    ORBS.forEach((orb, i) => {
      const cur = orbOff.current[i]
      cur.x += (mouseOff.current.x - cur.x) * orb.speed
      cur.y += (mouseOff.current.y - cur.y) * orb.speed
      const el = orbRefs.current[i]
      if (el) el.style.transform = `translate3d(calc(-50% + ${cur.x + orb.ox}px), calc(-50% + ${cur.y + orb.oy}px), 0)`
    })
    rafLeft.current = requestAnimationFrame(animateOrbs)
  }, [])

  const animateSpot = useCallback(() => {
    const cur = spotCur.current
    const tgt = spotTgt.current
    cur.x += (tgt.x - cur.x) * 0.07
    cur.y += (tgt.y - cur.y) * 0.07
    if (spotRef.current) spotRef.current.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`
    rafRight.current = requestAnimationFrame(animateSpot)
  }, [])

  useEffect(() => {
    const lp = leftPanelRef.current
    const rp = rightPanelRef.current
    if (rp) {
      const r = rp.getBoundingClientRect()
      spotCur.current = { x: r.width / 2, y: r.height / 2 }
      spotTgt.current = { x: r.width / 2, y: r.height / 2 }
    }
    const handleLeftMove = (e: MouseEvent) => {
      if (!lp) return
      const rect = lp.getBoundingClientRect()
      mouseOff.current.x = ((e.clientX - rect.left) / rect.width  - 0.5) * 160
      mouseOff.current.y = ((e.clientY - rect.top)  / rect.height - 0.5) * 160
    }
    const handleRightMove = (e: MouseEvent) => {
      if (!rp) return
      const rect = rp.getBoundingClientRect()
      spotTgt.current.x = e.clientX - rect.left
      spotTgt.current.y = e.clientY - rect.top
    }
    lp?.addEventListener('mousemove', handleLeftMove, { passive: true })
    rp?.addEventListener('mousemove', handleRightMove, { passive: true })
    rafLeft.current  = requestAnimationFrame(animateOrbs)
    rafRight.current = requestAnimationFrame(animateSpot)
    return () => {
      lp?.removeEventListener('mousemove', handleLeftMove)
      rp?.removeEventListener('mousemove', handleRightMove)
      cancelAnimationFrame(rafLeft.current)
      cancelAnimationFrame(rafRight.current)
    }
  }, [animateOrbs, animateSpot])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }
    if (newPassword.length < 8) {
      setError(t('auth.passwordTooShort'))
      return
    }
    setIsLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.resetPasswordError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50 overflow-hidden">
      {/* Left panel */}
      <div
        ref={leftPanelRef}
        className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-primary-700 to-blue-900" />
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: '128px' }}
        />
        {ORBS.map((orb, i) => (
          <div key={i} ref={el => { orbRefs.current[i] = el }}
            className="absolute rounded-full blur-3xl pointer-events-none"
            style={{
              width: orb.size, height: orb.size,
              background: orb.color, top: '50%', left: '50%',
              willChange: 'transform',
              transform: `translate3d(calc(-50% + ${orb.ox}px), calc(-50% + ${orb.oy}px), 0)`,
            }}
          />
        ))}
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '30px 30px' }}
        />
        <div className="absolute top-0 left-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]">
            <Sparkles className="w-5 h-5 text-white drop-shadow" />
          </div>
          <div>
            <span className="text-white font-bold text-lg leading-none">{t('sidebar.systemName')}</span>
            <p className="text-indigo-200/70 text-xs mt-0.5">{t('sidebar.learningCenter')}</p>
          </div>
        </div>

        <div className="relative space-y-4">
          <h1 className="text-[42px] font-bold text-white leading-[1.15] tracking-tight">
            {t('auth.resetPasswordHero')}
          </h1>
          <p className="text-indigo-200/80 text-lg leading-relaxed max-w-md">
            {t('auth.resetPasswordHeroSub')}
          </p>
        </div>
        <div className="relative" />
      </div>

      {/* Right panel */}
      <div
        ref={rightPanelRef}
        className="flex-1 flex items-center justify-center p-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[#f8fafc]" />
        <div className="absolute inset-0 opacity-40"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div ref={spotRef} className="pointer-events-none absolute rounded-full"
          style={{
            width: 700, height: 700, top: -350, left: -350,
            willChange: 'transform',
            background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, rgba(99,102,241,0.07) 45%, transparent 70%)',
          }}
        />
        <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-100/60 to-transparent rounded-bl-full" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-100/40 to-transparent rounded-tr-full" />

        <div className="relative w-full max-w-[360px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">{t('sidebar.systemName')}</span>
          </div>

          <div className="bg-white/85 backdrop-blur-2xl rounded-3xl p-8 shadow-[0_24px_64px_rgba(0,0,0,0.09),0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] border border-white/70 ring-1 ring-indigo-100/50">

            {!token ? (
              <div className="text-center space-y-4">
                <p className="text-red-500 text-sm">{t('auth.resetPasswordInvalidLink')}</p>
                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {t('auth.backToLogin')}
                </Link>
              </div>
            ) : done ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="w-14 h-14 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('auth.resetPasswordDoneTitle')}</h2>
                <p className="text-gray-500 text-sm">{t('auth.resetPasswordDoneDesc')}</p>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">{t('auth.resetPassword')}</h2>
                  <p className="text-gray-500 text-sm mt-1">{t('auth.resetPasswordSubtitle')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2.5 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('auth.newPassword')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="input-field pl-10 pr-10"
                        placeholder={t('auth.passwordPlaceholder')}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('auth.confirmPassword')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirm(e.target.value)}
                        className="input-field pl-10"
                        placeholder={t('auth.confirmPasswordPlaceholder')}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full py-3 mt-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>{t('auth.resetPasswordButton')}</span>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
                      <ArrowLeft className="w-3.5 h-3.5" />
                      {t('auth.backToLogin')}
                    </Link>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

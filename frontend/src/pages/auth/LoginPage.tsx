import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../context/authStore'
import { useTranslation } from 'react-i18next'
import { Sparkles, Mail, Lock, ArrowRight, BookOpen, Users, TrendingUp, Bot, Eye, EyeOff } from 'lucide-react'
import api from '../../services/api'
import { authService } from '../../services/authService'

const FEATURES = [
  { icon: Users,      color: 'from-emerald-400 to-teal-500',  labelKey: 'Студенты' },
  { icon: BookOpen,   color: 'from-blue-400 to-primary-500',  labelKey: 'Курсы' },
  { icon: Bot,        color: 'from-violet-400 to-purple-500', labelKey: 'AI-репетитор' },
  { icon: TrendingUp, color: 'from-orange-400 to-amber-500',  labelKey: 'Аналитика' },
]

// Orbs positioned in px relative to panel center — moved via transform3d (GPU only, no reflow)
const ORBS = [
  { ox: -200, oy: -180, size: 380, color: 'rgba(99,102,241,0.22)',  speed: 0.035 },
  { ox:  180, oy:  120, size: 300, color: 'rgba(14,165,233,0.18)',  speed: 0.055 },
  { ox:   30, oy:  200, size: 240, color: 'rgba(139,92,246,0.15)', speed: 0.025 },
  { ox:  220, oy: -220, size: 200, color: 'rgba(6,182,212,0.16)',  speed: 0.045 },
]

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]       = useState('')
  const [step, setStep]         = useState<'login' | 'verify'>('login')
  const [code, setCode]         = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const navigate = useNavigate()
  const { login, isLoading, isAuthenticated } = useAuthStore()
  const { t } = useTranslation()

  const leftPanelRef = useRef<HTMLDivElement>(null)
  const orbRefs      = useRef<(HTMLDivElement | null)[]>([])
  // current interpolated offset from panel center (px)
  const orbOff       = useRef(ORBS.map(() => ({ x: 0, y: 0 })))
  // target offset: mouse position relative to panel center (px)
  const mouseOff     = useRef({ x: 0, y: 0 })
  const rafLeft      = useRef<number>(0)

  const rightPanelRef = useRef<HTMLDivElement>(null)
  const spotRef       = useRef<HTMLDivElement>(null)
  // current/target in px relative to panel
  const spotCur  = useRef({ x: 0, y: 0 })
  const spotTgt  = useRef({ x: 0, y: 0 })
  const rafRight = useRef<number>(0)

  // ── Left panel: orbs via transform3d (no layout reflow) ──
  const animateOrbs = useCallback(() => {
    ORBS.forEach((orb, i) => {
      const cur = orbOff.current[i]
      const dx = mouseOff.current.x - cur.x
      const dy = mouseOff.current.y - cur.y
      cur.x += dx * orb.speed
      cur.y += dy * orb.speed
      const el = orbRefs.current[i]
      if (el) {
        el.style.transform = `translate3d(calc(-50% + ${cur.x + orb.ox}px), calc(-50% + ${cur.y + orb.oy}px), 0)`
      }
    })
    rafLeft.current = requestAnimationFrame(animateOrbs)
  }, [])

  const handleLeftMouseMove = useCallback((e: MouseEvent) => {
    const panel = leftPanelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    // offset from center in px, clamped to ±120px for subtle effect
    mouseOff.current.x = ((e.clientX - rect.left) / rect.width  - 0.5) * 160
    mouseOff.current.y = ((e.clientY - rect.top)  / rect.height - 0.5) * 160
  }, [])

  // ── Right panel: spotlight via transform3d on a fixed-size element ──
  const animateSpot = useCallback(() => {
    const cur = spotCur.current
    const tgt = spotTgt.current
    cur.x += (tgt.x - cur.x) * 0.07
    cur.y += (tgt.y - cur.y) * 0.07
    if (spotRef.current) {
      spotRef.current.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`
    }
    rafRight.current = requestAnimationFrame(animateSpot)
  }, [])

  const handleRightMouseMove = useCallback((e: MouseEvent) => {
    const panel = rightPanelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    spotTgt.current.x = e.clientX - rect.left
    spotTgt.current.y = e.clientY - rect.top
  }, [])

  useEffect(() => {
    const lp = leftPanelRef.current
    const rp = rightPanelRef.current
    // init spot center
    if (rp) {
      const r = rp.getBoundingClientRect()
      spotCur.current = { x: r.width / 2, y: r.height / 2 }
      spotTgt.current = { x: r.width / 2, y: r.height / 2 }
    }
    lp?.addEventListener('mousemove', handleLeftMouseMove, { passive: true })
    rp?.addEventListener('mousemove', handleRightMouseMove, { passive: true })
    rafLeft.current  = requestAnimationFrame(animateOrbs)
    rafRight.current = requestAnimationFrame(animateSpot)
    return () => {
      lp?.removeEventListener('mousemove', handleLeftMouseMove)
      rp?.removeEventListener('mousemove', handleRightMouseMove)
      cancelAnimationFrame(rafLeft.current)
      cancelAnimationFrame(rafRight.current)
    }
  }, [handleLeftMouseMove, handleRightMouseMove, animateOrbs, animateSpot])

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || ''
      if (msg === 'EMAIL_NOT_VERIFIED') {
        // Auto-send a fresh code and switch to verify step
        try { await api.post('/auth/resend-verification', { email }) } catch {}
        setStep('verify')
        setResendCooldown(60)
      } else {
        setError(msg || t('auth.loginError'))
      }
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setVerifyLoading(true)
    try {
      const response = await authService.verifyEmail(email, code)
      useAuthStore.getState().setUser(response.user)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.verificationError'))
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    try {
      await api.post('/auth/resend-verification', { email })
      setResendCooldown(60)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось отправить код')
    } finally {
      setResendLoading(false)
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const heroTags = t('auth.heroTags', { returnObjects: true }) as string[]

  // ── Verify step ──
  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">
              <Mail className="w-7 h-7 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Подтверждение email</h1>
            <p className="text-sm text-gray-500">
              Код отправлен на <span className="font-semibold text-gray-700">{email}</span>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Код подтверждения</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 px-4 border border-gray-200 rounded-xl outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                placeholder="000000"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={verifyLoading || code.length < 6}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all"
            >
              {verifyLoading ? 'Проверка...' : 'Подтвердить и войти →'}
            </button>
          </form>

          <div className="text-center space-y-2">
            <button
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0}
              className="text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400 transition-colors"
            >
              {resendCooldown > 0 ? `Отправить повторно (${resendCooldown}с)` : resendLoading ? 'Отправка...' : 'Отправить код повторно'}
            </button>
            <br />
            <button onClick={() => { setStep('login'); setError(''); setCode('') }} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Назад
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-50 overflow-hidden">

      {/* ── Left panel ── */}
      <div
        ref={leftPanelRef}
        className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden"
      >
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-primary-700 to-blue-900" />

        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: '128px' }}
        />

        {/* Animated orbs — GPU-only via transform3d, anchored to panel center */}
        {ORBS.map((orb, i) => (
          <div
            key={i}
            ref={el => { orbRefs.current[i] = el }}
            className="absolute rounded-full blur-3xl pointer-events-none"
            style={{
              width:  orb.size,
              height: orb.size,
              background: orb.color,
              top: '50%',
              left: '50%',
              willChange: 'transform',
              transform: `translate3d(calc(-50% + ${orb.ox}px), calc(-50% + ${orb.oy}px), 0)`,
            }}
          />
        ))}

        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '30px 30px' }}
        />

        {/* Subtle top-left corner accent */}
        <div className="absolute top-0 left-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-2xl
                          flex items-center justify-center
                          shadow-[0_2px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]">
            <Sparkles className="w-5 h-5 text-white drop-shadow" />
          </div>
          <div>
            <span className="text-white font-bold text-lg leading-none">{t('sidebar.systemName')}</span>
            <p className="text-indigo-200/70 text-xs mt-0.5">{t('sidebar.learningCenter')}</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5
                            bg-white/10 backdrop-blur-sm rounded-full
                            border border-white/20 text-white/80 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online Platform
            </div>
            <h1 className="text-[42px] font-bold text-white leading-[1.15] tracking-tight">
              {t('auth.heroTitle').split('\n').map((line, i) => (
                <span key={i} className="block">
                  {i === 0 ? line : <span className="text-cyan-300">{line}</span>}
                </span>
              ))}
            </h1>
            <p className="text-indigo-200/80 text-lg leading-relaxed max-w-md">
              {t('auth.heroSubtitle')}
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3
                           bg-white/8 hover:bg-white/14
                           backdrop-blur-sm rounded-xl
                           border border-white/10 hover:border-white/25
                           transition-all duration-300 group cursor-default"
              >
                <div className={`w-8 h-8 bg-gradient-to-br ${f.color}
                                 rounded-lg flex items-center justify-center shadow-md
                                 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                  <f.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/80 text-sm font-medium group-hover:text-white transition-colors duration-200">
                  {heroTags[i] ?? f.labelKey}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative" />
      </div>

      {/* ── Right panel ── */}
      <div
        ref={rightPanelRef}
        className="flex-1 flex items-center justify-center p-8 relative overflow-hidden"
      >
        {/* Base */}
        <div className="absolute inset-0 bg-[#f8fafc]" />

        {/* Static subtle grid */}
        <div className="absolute inset-0 opacity-40"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        {/* Spotlight — fixed-size circle moved via transform3d (GPU only, no gradient repaint) */}
        <div
          ref={spotRef}
          className="pointer-events-none absolute rounded-full"
          style={{
            width: 700,
            height: 700,
            top: -350,
            left: -350,
            willChange: 'transform',
            background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, rgba(99,102,241,0.07) 45%, transparent 70%)',
            transform: 'translate3d(0px, 0px, 0)',
          }}
        />

        {/* Corner decorations */}
        <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-100/60 to-transparent rounded-bl-full" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-100/40 to-transparent rounded-tr-full" />

        <div className="relative w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl
                            flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">{t('sidebar.systemName')}</span>
          </div>

          {/* Form card */}
          <div className="bg-white/85 backdrop-blur-2xl
                          rounded-3xl p-8
                          shadow-[0_24px_64px_rgba(0,0,0,0.09),0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
                          border border-white/70 ring-1 ring-indigo-100/50">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">{t('auth.login')}</h2>
              <p className="text-gray-500 text-sm mt-1">{t('auth.loginSubtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 text-red-600
                                px-4 py-3 rounded-xl text-sm border border-red-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  {t('common.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-400 z-10 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('common.password')}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                  >
                    {t('auth.forgotPasswordLink')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 z-10 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pl-10 pr-11"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
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
                  <>
                    <span>{t('auth.loginButton')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500 pt-1">
                {t('auth.haveInvitation')}{' '}
                <Link
                  to="/register"
                  className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                >
                  {t('auth.registerLink')}
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

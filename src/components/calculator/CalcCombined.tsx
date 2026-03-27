'use client'

import * as React from 'react'
import Image from 'next/image'
import confetti from 'canvas-confetti'
import { Shield, Check, Users } from 'lucide-react'
import { Button } from '@/components/ui'
import { StickyButtonContainer } from '@/components/ui/StickyButtonContainer'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { LottieIcon } from '@/components/ui/LottieIcon'
import { Header } from '@/components/layout/Header'
import { formatCurrency, cn } from '@/lib/utils'
import {
  calculateDebtFreeDate,
  calculateReliefTimeline,
} from '@/lib/calculator'
import type { DebtFreeResult, ReliefResult } from '@/lib/calculator'
import relaxAnimation from '../../../public/Relax.json'

interface CalcCombinedProps {
  initialDebt?: number
  initialPayment?: number
  interestRate: number
  onContinue: () => void
  onResultsComputed?: (current: DebtFreeResult, relief: ReliefResult, debt: number, payment: number) => void
}

const DEBT_MIN = 5000
const DEBT_MAX = 100000
const DEBT_STEP = 500
const DEBT_DEFAULT = 15000

const PAYMENT_MIN = 50
const PAYMENT_MAX = 2000
const PAYMENT_STEP = 25
const PAYMENT_DEFAULT = 350

const NAVY = '#1B2A4A'
const GREEN = '#0C7663'
const RED = '#EB4015'
const BLUE = '#007AC8'
const GREY = '#B0B0B0'
const COL_DIVIDER = 'var(--color-divider)'

const VB_W = 480
const VB_H = 240
const PAD = { top: 32, right: 48, bottom: 44, left: 48 }
const INNER_W = VB_W - PAD.left - PAD.right
const INNER_H = VB_H - PAD.top - PAD.bottom

function generateAmortizationCurve(
  principal: number,
  apr: number,
  monthlyPayment: number,
  maxMonths: number,
  reachable: boolean
): string {
  const pts: string[] = []
  const monthlyRate = apr / 100 / 12

  if (!reachable) {
    // Payment doesn't cover interest — balance grows, never reaches zero.
    // Flat line at starting balance level across the full chart width.
    pts.push(`M ${PAD.left.toFixed(1)} ${PAD.top.toFixed(1)}`)
    pts.push(`L ${(PAD.left + INNER_W).toFixed(1)} ${PAD.top.toFixed(1)}`)
    return pts.join(' ')
  }

  // Month-by-month compound interest amortization:
  //   interest = remaining_balance * (APR / 12)
  //   principal_paid = monthly_payment - interest
  //   new_balance = remaining_balance - principal_paid
  const balances: number[] = [principal]
  let b = principal
  for (let m = 0; m < maxMonths && b > 0.01; m++) {
    const interest = b * monthlyRate
    const principalPaid = Math.min(monthlyPayment - interest, b)
    b = Math.max(0, b - principalPaid)
    balances.push(b)
  }

  for (let m = 0; m < balances.length; m++) {
    const x = PAD.left + (m / maxMonths) * INNER_W
    const remaining = balances[m] / principal
    const y = PAD.top + (1 - remaining) * INNER_H
    pts.push(`${m === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return pts.join(' ')
}

function generateReliefCurve(
  principal: number,
  reliefMonths: number,
  maxMonths: number
): string {
  const pts: string[] = []
  const n = 40
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const month = t * reliefMonths
    const x = PAD.left + (month / maxMonths) * INNER_W
    const remaining = 1 - t
    const y = PAD.top + (1 - remaining) * INNER_H
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return pts.join(' ')
}

function generateAreaPath(linePath: string): string {
  const bottomY = PAD.top + INNER_H
  const parts = linePath.split(' ')
  const firstX = parts[1]
  const lastX = parts[parts.length - 2]
  return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
}

export function CalcCombined({
  initialDebt = DEBT_DEFAULT,
  initialPayment = PAYMENT_DEFAULT,
  interestRate,
  onContinue,
  onResultsComputed,
}: CalcCombinedProps) {
  const [debt, setDebt] = React.useState(initialDebt)
  const [payment, setPayment] = React.useState(initialPayment)
  const [mode, setMode] = React.useState<'calculator' | 'loading' | 'results'>('calculator')
  const [stage, setStage] = React.useState(0)
  const [loaderStep, setLoaderStep] = React.useState(0)
  const [loaderProgress, setLoaderProgress] = React.useState(0)

  const currentResult = React.useMemo(
    () => calculateDebtFreeDate(debt, interestRate, payment),
    [debt, interestRate, payment]
  )
  const reliefResult = React.useMemo(
    () => calculateReliefTimeline(debt),
    [debt]
  )

  const debtSliderRef = React.useRef<HTMLInputElement>(null)
  const paymentSliderRef = React.useRef<HTMLInputElement>(null)
  const clipId = React.useId()

  React.useEffect(() => {
    if (debtSliderRef.current) {
      const pct = ((debt - DEBT_MIN) / (DEBT_MAX - DEBT_MIN)) * 100
      debtSliderRef.current.style.setProperty('--progress', `${pct}%`)
    }
  }, [debt])

  React.useEffect(() => {
    if (paymentSliderRef.current) {
      const pct = ((payment - PAYMENT_MIN) / (PAYMENT_MAX - PAYMENT_MIN)) * 100
      paymentSliderRef.current.style.setProperty('--progress', `${pct}%`)
    }
  }, [payment])

  React.useEffect(() => {
    if (mode !== 'results') return
    setStage(0)
    const t1 = setTimeout(() => setStage(1), 1400)
    const t2 = setTimeout(() => setStage(2), 2200)

    const tConfetti = setTimeout(() => {
      const duration = 800
      const end = Date.now() + duration
      const frame = () => {
        confetti({ particleCount: 2, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors: ['#007AC8', '#0C7663', '#FFB934'], gravity: 1.2 })
        confetti({ particleCount: 2, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors: ['#007AC8', '#0C7663', '#FFB934'], gravity: 1.2 })
        if (Date.now() < end) requestAnimationFrame(frame)
      }
      frame()
    }, 400)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(tConfetti) }
  }, [mode])

  const LOADER_STEPS = [
    'Analyzing your payment structure...',
    'Calculating interest accumulation...',
    'Projecting your debt-free timeline...',
    'Building your personalized report...',
  ]

  React.useEffect(() => {
    if (mode !== 'loading') return
    setLoaderStep(0)
    setLoaderProgress(0)

    const stepInterval = setInterval(() => {
      setLoaderStep((prev) => {
        if (prev >= LOADER_STEPS.length) { clearInterval(stepInterval); return prev }
        return prev + 1
      })
    }, 1200)

    const progressInterval = setInterval(() => {
      setLoaderProgress((prev) => {
        if (prev >= 100) { clearInterval(progressInterval); return 100 }
        return prev + 1
      })
    }, 50)

    const done = setTimeout(() => setMode('results'), 5500)

    return () => { clearInterval(stepInterval); clearInterval(progressInterval); clearTimeout(done) }
  }, [mode])

  const handleCalculate = () => {
    onResultsComputed?.(currentResult, reliefResult, debt, payment)
    setMode('loading')
  }

  const chartData = React.useMemo(() => {
    const cappedCurrentMonths = currentResult.reachable ? currentResult.months : 420
    const longestMonths = Math.max(cappedCurrentMonths, reliefResult.months)
    const nowYear = new Date().getFullYear()
    const endYear = nowYear + Math.ceil(longestMonths / 12)
    const totalYearSpan = Math.max(1, endYear - nowYear)
    const yearStep = totalYearSpan <= 4 ? 1 : totalYearSpan <= 8 ? 2 : totalYearSpan <= 15 ? 3 : 5

    const xTicks: { year: number; x: number }[] = []
    for (let y = nowYear; y <= endYear; y += yearStep) {
      const t = (y - nowYear) / totalYearSpan
      xTicks.push({ year: y, x: PAD.left + t * INNER_W })
    }
    if (xTicks[xTicks.length - 1]?.year !== endYear) {
      xTicks.push({ year: endYear, x: PAD.left + INNER_W })
    }

    const currentYears = cappedCurrentMonths / 12
    const reliefYears = reliefResult.months / 12
    const yearsDiff = Math.max(0, currentYears - reliefYears)
    const fasterPayoffLabel = yearsDiff >= 1
      ? `${Math.round(yearsDiff)} ${Math.round(yearsDiff) === 1 ? 'year' : 'yrs'}`
      : `${Math.round(yearsDiff * 12)} mo`
    const totalSavings = currentResult.reachable
      ? currentResult.totalPaid - reliefResult.totalCost
      : debt - reliefResult.totalCost

    return {
      currentD: generateAmortizationCurve(debt, interestRate, payment, longestMonths, currentResult.reachable),
      reliefD: generateReliefCurve(debt, reliefResult.months, longestMonths),
      reliefEndX: PAD.left + (reliefResult.months / longestMonths) * INNER_W,
      currentEndX: PAD.left + (cappedCurrentMonths / longestMonths) * INNER_W,
      bottomY: PAD.top + INNER_H,
      xTicks,
      fasterPayoffLabel,
      totalSavings,
    }
  }, [currentResult, reliefResult, debt, payment, interestRate])

  const revealWidth = stage >= 1 ? INNER_W + PAD.right : 0

  const renderChart = (idSuffix: string) => {
    const { currentD, reliefD, reliefEndX, currentEndX, bottomY, xTicks } = chartData
    const cId = `${clipId}-${idSuffix}`

    return (
      <div className="w-full bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-1">
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full" role="img" aria-label="Debt payoff comparison chart">
            <defs>
              <clipPath id={cId}>
                <rect x={PAD.left} y={0} height={VB_H} width={revealWidth} style={{ transition: 'width 900ms ease-out' }} />
              </clipPath>
              <linearGradient id={`${cId}-relief`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity="0.15" />
                <stop offset="100%" stopColor={GREEN} stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id={`${cId}-current`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={RED} stopOpacity="0.10" />
                <stop offset="100%" stopColor={RED} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75, 1].map((frac) => (
              <line key={frac} x1={PAD.left} y1={PAD.top + frac * INNER_H} x2={PAD.left + INNER_W} y2={PAD.top + frac * INNER_H} stroke="#F0F0F0" strokeWidth="1" />
            ))}

            <path d={generateAreaPath(currentD)} fill={`url(#${cId}-current)`} className="transition-opacity duration-300" style={{ opacity: stage >= 2 ? 1 : 0 }} />
            <path d={generateAreaPath(reliefD)} fill={`url(#${cId}-relief)`} className="transition-opacity duration-300" style={{ opacity: stage >= 2 ? 1 : 0 }} />

            <g clipPath={`url(#${cId})`}>
              <path d={currentD} fill="none" stroke={RED} strokeWidth="3" />
              <path d={reliefD} fill="none" stroke={GREEN} strokeWidth="3" />
              <circle cx={PAD.left} cy={PAD.top} r="4" fill={NAVY} />
              <circle cx={reliefEndX} cy={bottomY} r="5" fill={GREEN} className="transition-opacity duration-500" style={{ opacity: stage >= 2 ? 1 : 0 }} />
              {currentResult.reachable && (
                <circle cx={currentEndX} cy={bottomY} r="4" fill={RED} className="transition-opacity duration-500" style={{ opacity: stage >= 2 ? 1 : 0 }} />
              )}
            </g>

            <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" fontSize="9" fill={GREY}>{formatCurrency(debt)}</text>
            <text x={PAD.left - 6} y={bottomY + 3} textAnchor="end" fontSize="9" fill={GREY}>$0</text>
            <line x1={PAD.left} y1={bottomY} x2={PAD.left + INNER_W} y2={bottomY} stroke="#EDEDED" strokeWidth="1" />

            {xTicks.map((tick) => (
              <text key={tick.year} x={tick.x} y={bottomY + 16} textAnchor="middle" fontSize="10" fill="#6A6A6A">{tick.year}</text>
            ))}

            <text x={reliefEndX} y={bottomY + 32} textAnchor="middle" fontSize="11" fontWeight="700" fill={GREEN} className="transition-opacity duration-500" style={{ opacity: stage >= 2 ? 1 : 0 }}>{reliefResult.year}</text>
            {currentResult.reachable ? (
              <text x={currentEndX} y={bottomY + 32} textAnchor="middle" fontSize="11" fontWeight="700" fill={RED} className="transition-opacity duration-500" style={{ opacity: stage >= 2 ? 1 : 0 }}>{currentResult.year}</text>
            ) : (
              <text x={PAD.left + INNER_W} y={PAD.top + 14} textAnchor="end" fontSize="10" fontWeight="600" fill={GREY} className="transition-opacity duration-500" style={{ opacity: stage >= 2 ? 1 : 0 }}>Never pays off →</text>
            )}

            <line x1={PAD.left} y1={PAD.top - 16} x2={PAD.left + 18} y2={PAD.top - 16} stroke={GREEN} strokeWidth="3" />
            <text x={PAD.left + 22} y={PAD.top - 13} fontSize="9" fill={NAVY} fontWeight="500">With relief program</text>
            <line x1={PAD.left + 150} y1={PAD.top - 16} x2={PAD.left + 168} y2={PAD.top - 16} stroke={RED} strokeWidth="3" />
            <text x={PAD.left + 172} y={PAD.top - 13} fontSize="9" fill={GREY}>Minimum payments</text>
          </svg>
        </div>
      </div>
    )
  }

  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-lg mx-auto text-center py-12 px-4 animate-slide-up">
            <h1 className="font-display text-display sm:text-display-md text-neutral-800">
              Crunching your numbers...
            </h1>
            <p className="mt-3 text-body text-neutral-500">
              We&apos;re building a personalized debt-free timeline based on your inputs.
            </p>

            <div className="space-y-3 inline-flex flex-col items-start mt-8">
              {LOADER_STEPS.map((step, index) => {
                const isComplete = index < loaderStep
                const isCurrent = index === loaderStep
                const isPending = index > loaderStep

                return (
                  <div key={index} className="flex items-center gap-3">
                    {isComplete && (
                      <div className="w-5 h-5 rounded-full bg-feedback-success flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                    {isCurrent && (
                      <div className="w-5 h-5 rounded-full border-2 border-primary-700 border-t-transparent animate-spin" />
                    )}
                    {isPending && (
                      <div className="w-5 h-5 rounded-full border-2 border-neutral-200" />
                    )}
                    <span className={cn('text-body-sm transition-colors duration-300', isPending ? 'text-neutral-500' : 'text-neutral-800')}>
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="w-full max-w-xs mx-auto mt-8">
              <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full bg-feedback-success rounded-full transition-all duration-100" style={{ width: `${loaderProgress}%` }} />
              </div>
              <p className="text-caption text-neutral-500 text-center mt-2">
                {loaderProgress}% complete
              </p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mt-8 text-neutral-500">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="text-caption">Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span className="text-caption">No credit impact</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="text-caption">100% Free</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (mode === 'results') {
    return (
      <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
        <Header />
        <div className="sticky top-[56px] z-40 bg-white">
          <div className="max-w-[555px] mx-auto px-4 sm:px-6">
            <div className="w-full py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMode('calculator')}
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                  aria-label="Go back"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: '#E0E0E6' }}>
                  <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: '50%', backgroundColor: '#1A1A2E' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full max-w-[555px] mx-auto px-4 sm:px-6 pt-2 sm:pt-4 pb-28">
          <div className="flex flex-col items-start w-full">
            {/* Savings callout pill */}
            <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full px-4 py-2 mb-4" style={{ backgroundColor: '#EEF2F7' }}>
              <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: '20px', height: '20px', backgroundColor: BLUE }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M4 8.5L6.5 11L12 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: NAVY }}>
                {!currentResult.reachable
                  ? 'You could save 30+ years with a relief program'
                  : `You could save ${chartData.fasterPayoffLabel} and ${formatCurrency(Math.max(0, chartData.totalSavings))}`}
              </span>
            </div>

            <h1
              className="animate-fade-in-up font-display text-headline-lg sm:text-display lg:text-display-md mb-2"
              style={{ animationDelay: '100ms', color: NAVY }}
            >
              Here&apos;s your <span style={{ color: BLUE }}>debt-free timeline.</span>
            </h1>
            <p
              className="animate-fade-in-up leading-relaxed mb-6"
              style={{ animationDelay: '200ms', fontSize: '15px', color: '#666666' }}
            >
              Two paths compared — minimum payments vs. a relief program.
            </p>

            {/* Chart */}
            <div className="animate-fade-in-up w-full mb-5" style={{ animationDelay: '400ms' }}>
              {renderChart('results')}
            </div>

            {/* Stat cards */}
            <div className="animate-fade-in-up w-full grid grid-cols-3 gap-3 mb-5" style={{ animationDelay: '600ms' }}>
              <div className="border border-neutral-200 rounded-xl p-4 text-center">
                <p style={{ fontSize: '22px', fontWeight: 700, color: GREEN }}>{formatCurrency(Math.max(0, chartData.totalSavings))}</p>
                <p style={{ fontSize: '11px', color: '#999999', marginTop: '2px' }}>Could save</p>
              </div>
              <div className="border border-neutral-200 rounded-xl p-4 text-center">
                <p style={{ fontSize: '22px', fontWeight: 700, color: GREEN }}>
                  {!currentResult.reachable ? '30+ yrs' : chartData.fasterPayoffLabel}
                </p>
                <p style={{ fontSize: '11px', color: '#999999', marginTop: '2px' }}>Faster payoff</p>
              </div>
              <div className="border border-neutral-200 rounded-xl p-4 text-center">
                <p style={{ fontSize: '22px', fontWeight: 700, color: GREEN }}>{reliefResult.year}</p>
                <p style={{ fontSize: '11px', color: '#999999', marginTop: '2px' }}>Debt-free by</p>
              </div>
            </div>

            {/* Comparison table */}
            <div className="animate-fade-in-up w-full grid grid-cols-2 gap-3 mb-6" style={{ animationDelay: '800ms' }}>
              <div className="border border-neutral-200 rounded-xl p-4" style={{ borderTopColor: RED, borderTopWidth: '3px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: RED, marginBottom: '12px' }}>Minimum Payments</p>
                <div className="space-y-3">
                  <div>
                    <p style={{ fontSize: '11px', color: '#999999' }}>Total you&apos;ll pay</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: NAVY }}>
                      {currentResult.reachable ? formatCurrency(currentResult.totalPaid) : 'Never paid off'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#999999' }}>Time to payoff</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: NAVY }}>
                      {!currentResult.reachable
                        ? '30+ years'
                        : currentResult.months >= 12
                          ? `${Math.floor(currentResult.months / 12)} yr ${currentResult.months % 12} mo`
                          : `${currentResult.months} mo`}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#999999' }}>Debt-free by</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: RED }}>
                      {currentResult.reachable ? currentResult.year : '2055+'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="border border-neutral-200 rounded-xl p-4" style={{ borderTopColor: GREEN, borderTopWidth: '3px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: GREEN, marginBottom: '12px' }}>With Relief Program</p>
                <div className="space-y-3">
                  <div>
                    <p style={{ fontSize: '11px', color: '#999999' }}>Total cost</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: GREEN }}>
                      {formatCurrency(reliefResult.totalCost)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#999999' }}>Program length</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: GREEN }}>
                      {reliefResult.months >= 12
                        ? `${Math.floor(reliefResult.months / 12)} yr ${reliefResult.months % 12} mo`
                        : `${reliefResult.months} mo`}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#999999' }}>Debt-free by</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: GREEN }}>
                      {reliefResult.year}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Fixed bottom CTA bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="max-w-[555px] mx-auto px-4 sm:px-6 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <Button fullWidth showTrailingIcon onClick={onContinue}>
              {!currentResult.reachable || chartData.fasterPayoffLabel !== '0 mo'
                ? `See If You Qualify — Save ${chartData.fasterPayoffLabel}`
                : 'See If You Qualify'}
            </Button>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Image src="/icon-shield.png" alt="Shield" width={20} height={20} unoptimized />
              <span style={{ fontSize: '12px', color: '#999999' }}>
                Your information is secure and never shared
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Calculator mode — two-column layout with illustration
  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
      <Header />

      <main className="flex-1 flex items-center">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-[80px] pt-6 sm:pt-10 pb-4 sm:pb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12 has-sticky-button">
            {/* Left column: Lottie + example box */}
            <div className="hidden lg:flex lg:flex-col lg:items-start lg:justify-center lg:w-[380px] lg:flex-shrink-0 lg:self-center">
              <div className="animate-fade-in-up" style={{ width: '380px', height: '380px', animationDelay: '200ms' }}>
                <LottieIcon animationData={relaxAnimation} className="w-full h-full" />
              </div>

              <div
                className="animate-fade-in-up w-full bg-neutral-50 rounded-lg text-left mt-6"
                style={{ animationDelay: '700ms', padding: '20px' }}
              >
                <div className="flex items-start gap-3">
                  <Image src="/clock-icon.png" alt="Clock" width={64} height={64} unoptimized className="flex-shrink-0 animate-float" />
                  <p className="text-body-sm text-neutral-800" style={{ lineHeight: '1.6' }}>
                    Debt relief programs have helped over{' '}
                    <span className="font-bold">1 million Americans</span> resolve their debt for a fraction of what they owe — often in{' '}
                    <span className="font-bold text-feedback-success">2–4 years</span> instead of decades.
                  </p>
                </div>
              </div>
            </div>

            {/* Right column: calculator */}
            <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left lg:ml-auto lg:max-w-[480px]">
              <p
                className="animate-fade-in-up text-xs font-medium uppercase tracking-wider text-neutral-400 mb-3"
                style={{ animationDelay: '100ms' }}
              >
                Debt Relief Has Saved Americans Over $10 Billion
              </p>

              <h1
                className="animate-fade-in-up font-display text-display-md sm:text-display-md lg:text-display-lg mb-3 text-neutral-800"
                style={{ animationDelay: '200ms' }}
              >
                You could be{' '}
                <span className="text-primary-700">debt-free</span>
                <br />
                sooner than you think.
              </h1>

              <p
                className="animate-fade-in-up text-body text-neutral-500 mb-10"
                style={{ animationDelay: '300ms' }}
              >
                The average American with $15,000 in credit card debt could be debt-free by{' '}
                <span className="font-bold text-feedback-success">2028</span> instead of{' '}
                <span className="font-bold text-feedback-error">2049</span> on minimum payments.
              </p>

              <div className="w-full max-w-[480px]">
                <div className="animate-fade-in-up w-full mb-10" style={{ animationDelay: '400ms' }}>
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="font-semibold text-lg text-neutral-800">Total debt</span>
                    <span className="text-primary-700">
                      <AnimatedCounter value={debt} prefix="$" className="font-display text-3xl sm:text-4xl font-bold" duration={200} />
                    </span>
                  </div>
                  <input ref={debtSliderRef} type="range" min={DEBT_MIN} max={DEBT_MAX} step={DEBT_STEP} value={debt} onChange={(e) => setDebt(Number(e.target.value))} className="debt-slider w-full" aria-label="Total debt amount" />
                  <div className="w-full flex justify-between mt-2 text-caption text-neutral-500">
                    <span>$5k</span>
                    <span>$100k</span>
                  </div>
                </div>

                <div className="animate-fade-in-up w-full mb-10" style={{ animationDelay: '500ms' }}>
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="font-semibold text-lg text-neutral-800">Monthly payment</span>
                    <span className="text-primary-700">
                      <AnimatedCounter value={payment} prefix="$" className="font-display text-3xl sm:text-4xl font-bold" duration={200} />
                    </span>
                  </div>
                  <input ref={paymentSliderRef} type="range" min={PAYMENT_MIN} max={PAYMENT_MAX} step={PAYMENT_STEP} value={payment} onChange={(e) => setPayment(Number(e.target.value))} className="debt-slider w-full" aria-label="Monthly payment amount" />
                  <div className="w-full flex justify-between mt-2 text-caption text-neutral-500">
                    <span>$50</span>
                    <span>$2,000</span>
                  </div>
                </div>

                <StickyButtonContainer>
                  <Button fullWidth showTrailingIcon onClick={handleCalculate}>
                    See How Much I Could Save
                  </Button>
                  <p className="text-center mt-2 text-caption text-neutral-500">
                    It&apos;s free and will not affect your credit score
                  </p>
                </StickyButtonContainer>

                {/* Trust badges — mobile */}
                <div className="animate-fade-in-up w-full mt-5 sm:hidden" style={{ animationDelay: '700ms' }}>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-sm font-bold text-neutral-800">Excellent</span>
                    <Image src="/trustpilot-stars.svg" alt="Trustpilot 5 stars" width={100} height={20} unoptimized />
                    <Image src="/trustpilot-logo.svg" alt="Trustpilot" width={76} height={18} unoptimized className="ml-1" />
                  </div>
                  <div className="flex justify-center">
                    <div className="inline-flex items-center gap-3 border border-neutral-200 rounded-lg px-4 py-2.5 bg-white">
                      <Image src="/bbb-accredited.svg" alt="BBB Accredited Business" width={80} height={40} unoptimized />
                      <div className="text-left">
                        <p className="text-xs font-bold text-neutral-800">BBB Rating: A+</p>
                        <p style={{ fontSize: '10px', color: '#00B67A' }}>As of 3/2026</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trust badges — desktop */}
                <div className="animate-fade-in-up w-full mt-5 hidden sm:block" style={{ animationDelay: '700ms' }}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-neutral-800">Excellent</span>
                      <Image src="/trustpilot-stars.svg" alt="Trustpilot 5 stars" width={120} height={24} unoptimized />
                      <Image src="/trustpilot-logo.svg" alt="Trustpilot" width={90} height={22} unoptimized />
                    </div>

                    <div className="w-px h-10 bg-neutral-200" />

                    <div className="flex items-center gap-2.5">
                      <Image src="/bbb-accredited.svg" alt="BBB Accredited Business" width={72} height={36} unoptimized />
                      <div className="text-left">
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#1B2A4A' }}>BBB Rating: A+</p>
                        <p style={{ fontSize: '10px', color: '#00B67A' }}>As of 3/2026</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default CalcCombined

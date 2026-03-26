'use client'

import * as React from 'react'
import Image from 'next/image'
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

const COL_PRIMARY = 'var(--color-primary-700)'
const COL_NEUTRAL = 'var(--color-charcoal)'
const COL_SUCCESS = 'var(--color-success)'
const COL_MUTED = 'var(--color-medium-grey)'
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
  actualMonths: number,
  maxMonths: number,
  reachable: boolean
): string {
  const pts: string[] = []
  const monthlyRate = apr / 100 / 12

  if (!reachable) {
    const n = 60
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const remaining = Math.max(0.82, 1 - t * 0.18)
      const x = PAD.left + t * INNER_W
      const y = PAD.top + (1 - remaining) * INNER_H
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    }
    return pts.join(' ')
  }

  const balances: number[] = [principal]
  let b = principal
  for (let m = 0; m < actualMonths && b > 0; m++) {
    const interest = b * monthlyRate
    b -= Math.min(monthlyPayment - interest, b)
    balances.push(Math.max(0, b))
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
  const [mode, setMode] = React.useState<'calculator' | 'results'>('calculator')
  const [currentResult, setCurrentResult] = React.useState<DebtFreeResult | null>(null)
  const [reliefResult, setReliefResult] = React.useState<ReliefResult | null>(null)
  const [stage, setStage] = React.useState(0)
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
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [mode])

  const handleCalculate = () => {
    const current = calculateDebtFreeDate(debt, interestRate, payment)
    const relief = calculateReliefTimeline(debt)
    setCurrentResult(current)
    setReliefResult(relief)
    onResultsComputed?.(current, relief, debt, payment)
    setMode('results')
  }

  // Chart data (only computed when results exist)
  const chartData = React.useMemo(() => {
    if (!currentResult || !reliefResult) return null

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

    const reliefIsFaster = reliefResult.months < cappedCurrentMonths
    const monthsSaved = reliefIsFaster ? cappedCurrentMonths - reliefResult.months : 0
    const yearsSaved = Math.floor(monthsSaved / 12)
    const timeSavedLabel = monthsSaved >= 12
      ? `${yearsSaved} ${yearsSaved === 1 ? 'year' : 'yrs'}`
      : `${monthsSaved} mo`
    const totalSavings = currentResult.reachable
      ? currentResult.totalPaid - reliefResult.totalCost
      : debt - reliefResult.totalCost

    return {
      currentD: generateAmortizationCurve(debt, interestRate, payment, cappedCurrentMonths, longestMonths, currentResult.reachable),
      reliefD: generateReliefCurve(debt, reliefResult.months, longestMonths),
      reliefEndX: PAD.left + (reliefResult.months / longestMonths) * INNER_W,
      currentEndX: PAD.left + (cappedCurrentMonths / longestMonths) * INNER_W,
      bottomY: PAD.top + INNER_H,
      xTicks,
      reliefIsFaster,
      timeSavedLabel,
      totalSavings,
    }
  }, [currentResult, reliefResult, debt, payment, interestRate])

  const revealWidth = stage >= 1 ? INNER_W + PAD.right : 0

  const renderChart = (idSuffix: string) => {
    if (!chartData || !currentResult || !reliefResult) return null
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
              <linearGradient id={`${cId}-blue`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COL_PRIMARY} stopOpacity="0.15" />
                <stop offset="100%" stopColor={COL_PRIMARY} stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id={`${cId}-green`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COL_SUCCESS} stopOpacity="0.10" />
                <stop offset="100%" stopColor={COL_SUCCESS} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75, 1].map((frac) => (
              <line key={frac} x1={PAD.left} y1={PAD.top + frac * INNER_H} x2={PAD.left + INNER_W} y2={PAD.top + frac * INNER_H} stroke={COL_DIVIDER} strokeWidth="1" />
            ))}

            <path d={generateAreaPath(currentD)} fill={`url(#${cId}-green)`} className="transition-opacity duration-300" style={{ opacity: stage >= 2 ? 1 : 0 }} />
            <path d={generateAreaPath(reliefD)} fill={`url(#${cId}-blue)`} className="transition-opacity duration-300" style={{ opacity: stage >= 2 ? 1 : 0 }} />

            <g clipPath={`url(#${cId})`}>
              <path d={currentD} fill="none" stroke={COL_SUCCESS} strokeWidth="3" />
              <path d={reliefD} fill="none" stroke={COL_PRIMARY} strokeWidth="3" />
              <circle cx={PAD.left} cy={PAD.top} r="4" fill={COL_NEUTRAL} />
              <circle cx={reliefEndX} cy={bottomY} r="5" fill={COL_PRIMARY} className="transition-opacity duration-500" style={{ opacity: stage >= 2 ? 1 : 0 }} />
              <circle cx={currentEndX} cy={bottomY} r="4" fill={COL_SUCCESS} className="transition-opacity duration-500" style={{ opacity: stage >= 2 ? 1 : 0 }} />
            </g>

            <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" fontSize="9" fill={COL_MUTED}>{formatCurrency(debt)}</text>
            <text x={PAD.left - 6} y={bottomY + 3} textAnchor="end" fontSize="9" fill={COL_MUTED}>$0</text>
            <line x1={PAD.left} y1={bottomY} x2={PAD.left + INNER_W} y2={bottomY} stroke={COL_DIVIDER} strokeWidth="1" />

            {xTicks.map((tick) => (
              <text key={tick.year} x={tick.x} y={bottomY + 16} textAnchor="middle" fontSize="10" fill={COL_MUTED}>{tick.year}</text>
            ))}

            <text x={reliefEndX} y={bottomY + 32} textAnchor="middle" fontSize="11" fontWeight="700" fill={COL_PRIMARY} className="transition-opacity duration-500" style={{ opacity: stage >= 2 ? 1 : 0 }}>{reliefResult.year}</text>
            {currentResult.reachable && (
              <text x={currentEndX} y={bottomY + 32} textAnchor="middle" fontSize="11" fontWeight="700" fill={COL_SUCCESS} className="transition-opacity duration-500" style={{ opacity: stage >= 2 ? 1 : 0 }}>{currentResult.year}</text>
            )}

            <line x1={PAD.left} y1={PAD.top - 16} x2={PAD.left + 18} y2={PAD.top - 16} stroke={COL_PRIMARY} strokeWidth="3" />
            <text x={PAD.left + 22} y={PAD.top - 13} fontSize="9" fill={COL_NEUTRAL} fontWeight="500">With relief program</text>
            <line x1={PAD.left + 150} y1={PAD.top - 16} x2={PAD.left + 168} y2={PAD.top - 16} stroke={COL_SUCCESS} strokeWidth="3" />
            <text x={PAD.left + 172} y={PAD.top - 13} fontSize="9" fill={COL_MUTED}>Minimum payments</text>
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 flex items-center">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-[80px] pt-6 sm:pt-10 pb-4 sm:pb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12 has-sticky-button">
            {/* Left column: Lottie + example box (stays fixed across modes) */}
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
                    The average American with $15,000 in credit card debt could be debt-free by{' '}
                    <span className="font-bold text-feedback-success">2028</span> with the right
                    program instead of{' '}
                    <span className="font-bold text-feedback-error">2049</span> on minimum payments.
                  </p>
                </div>
              </div>
            </div>

            {/* Right column: swaps between calculator and results */}
            <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left lg:ml-auto lg:max-w-[480px]">
              {mode === 'calculator' ? (
                <>
                  <p
                    className="animate-fade-in-up text-xs font-semibold uppercase tracking-[0.2em] mb-4 text-primary-700"
                    style={{ animationDelay: '200ms' }}
                  >
                    See Your Timeline
                  </p>

                  <h1
                    className="animate-fade-in-up font-display text-display-md sm:text-display-md lg:text-display-lg mb-3 text-neutral-800"
                    style={{ animationDelay: '300ms' }}
                  >
                    What year will you
                    <br />
                    be debt-free?
                  </h1>

                  <p
                    className="animate-fade-in-up text-body text-neutral-500 mb-10"
                    style={{ animationDelay: '400ms' }}
                  >
                    It might be sooner than you expect.
                  </p>

                  <div className="w-full max-w-[480px]">
                    <div className="animate-fade-in-up w-full mb-10" style={{ animationDelay: '500ms' }}>
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

                    <div className="animate-fade-in-up w-full mb-10" style={{ animationDelay: '600ms' }}>
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

                    {/* Example box — mobile only */}
                    <div
                      className="animate-fade-in-up w-full bg-neutral-50 rounded-lg text-left mb-8 lg:hidden"
                      style={{ animationDelay: '650ms', padding: '20px' }}
                    >
                      <div className="flex items-start gap-3">
                        <Image src="/clock-icon.png" alt="Clock" width={64} height={64} unoptimized className="flex-shrink-0 animate-float" />
                        <p className="text-body-sm text-neutral-800" style={{ lineHeight: '1.6' }}>
                          The average American with $15,000 in credit card debt could be debt-free by{' '}
                          <span className="font-bold text-feedback-success">2028</span> with the right
                          program instead of{' '}
                          <span className="font-bold text-feedback-error">2049</span> on minimum payments.
                        </p>
                      </div>
                    </div>

                    <StickyButtonContainer>
                      <Button fullWidth showTrailingIcon onClick={handleCalculate}>
                        Show My Debt-Free Date
                      </Button>
                      <div className="flex items-center gap-2 mt-3 sm:hidden">
                        <Image src="/icon-shield.png" alt="Shield" width={28} height={28} unoptimized />
                        <p className="text-sm text-neutral-500">See your timeline for free. Takes 10 seconds</p>
                      </div>
                    </StickyButtonContainer>

                    <div className="animate-fade-in-up w-full mt-3 hidden sm:block" style={{ animationDelay: '800ms' }}>
                      <div className="flex items-center gap-2">
                        <Image src="/icon-shield.png" alt="Shield" width={28} height={28} unoptimized />
                        <p className="text-sm text-neutral-500">See your timeline for free. Takes 10 seconds</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setMode('calculator')}
                    className="animate-fade-in-up flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800 transition-colors mb-4"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Edit values
                  </button>
                  <h1
                    className="animate-fade-in-up font-display text-display sm:text-display-md lg:text-display-lg mb-2 text-neutral-800"
                    style={{ animationDelay: '100ms' }}
                  >
                    Here&apos;s your <span className="text-primary-700">debt-free timeline.</span>
                  </h1>
                  <p
                    className="animate-fade-in-up text-body text-neutral-500 mb-6"
                    style={{ animationDelay: '300ms' }}
                  >
                    Two paths compared — minimum payments vs. a relief program.
                  </p>

                  {/* Mobile-only chart */}
                  <div
                    className="animate-fade-in-up w-full lg:hidden mb-5"
                    style={{ animationDelay: '500ms' }}
                  >
                    {renderChart('mobile')}
                  </div>

                  {/* Stat cards */}
                  {chartData && currentResult && reliefResult && (
                    <div
                      className="animate-fade-in-up w-full grid grid-cols-3 gap-3 mb-6"
                      style={{ animationDelay: '700ms' }}
                    >
                      <div className="border border-neutral-200 rounded-xl p-4 text-center">
                        <p className="text-[22px] font-bold text-primary-700">{formatCurrency(Math.max(0, chartData.totalSavings))}</p>
                        <p className="text-caption text-neutral-500 mt-0.5">Could save</p>
                      </div>
                      <div className="border border-neutral-200 rounded-xl p-4 text-center">
                        <p className="text-[22px] font-bold text-primary-700">
                          {!currentResult.reachable ? '30+ yrs' : chartData.reliefIsFaster ? chartData.timeSavedLabel : `${reliefResult.months} mo`}
                        </p>
                        <p className="text-caption text-neutral-500 mt-0.5">
                          {chartData.reliefIsFaster || !currentResult.reachable ? 'Faster payoff' : 'Program length'}
                        </p>
                      </div>
                      <div className="border border-neutral-200 rounded-xl p-4 text-center">
                        <p className="text-[22px] font-bold text-primary-700">{reliefResult.year}</p>
                        <p className="text-caption text-neutral-500 mt-0.5">Debt-free by</p>
                      </div>
                    </div>
                  )}

                  {/* Desktop-only chart below stats */}
                  <div
                    className="animate-fade-in-up hidden lg:block w-full mb-6"
                    style={{ animationDelay: '1000ms' }}
                  >
                    {renderChart('desktop-inline')}
                  </div>

                  <div
                    className="animate-fade-in-up w-full"
                    style={{ animationDelay: '1300ms' }}
                  >
                    <StickyButtonContainer>
                      <Button fullWidth showTrailingIcon onClick={onContinue}>
                        See If You Qualify
                      </Button>
                    </StickyButtonContainer>
                  </div>

                  <div
                    className="animate-fade-in-up w-full flex items-center gap-2 mt-3"
                    style={{ animationDelay: '1500ms' }}
                  >
                    <Image src="/icon-shield.png" alt="Shield" width={20} height={20} unoptimized />
                    <span className="text-caption text-neutral-500">Your information is secure and never shared</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default CalcCombined

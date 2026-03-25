'use client'

import * as React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui'
import { StickyButtonContainer } from '@/components/ui/StickyButtonContainer'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { DebtFreeResult, ReliefResult } from '@/lib/calculator'

const BLUE = '#0066CC'
const NAVY = '#1B2A4A'
const GREEN = '#0C7663'
const GREY = '#B0B0B0'

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
  const n = 80

  if (!reachable) {
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const month = t * maxMonths
      const x = PAD.left + (month / maxMonths) * INNER_W
      const remaining = Math.max(0.82, 1 - t * 0.18)
      const y = PAD.top + (1 - remaining) * INNER_H
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    }
    return pts.join(' ')
  }

  for (let i = 0; i <= n; i++) {
    const month = (i / n) * actualMonths
    const wholeMonths = Math.floor(month)

    let b = principal
    for (let m = 0; m < wholeMonths && b > 0; m++) {
      const interest = b * monthlyRate
      b -= Math.min(monthlyPayment - interest, b)
    }
    const balance = Math.max(0, b)

    const x = PAD.left + (month / maxMonths) * INNER_W
    const remaining = balance / principal
    const y = PAD.top + (1 - remaining) * INNER_H
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
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

interface RevealScreenProps {
  debtAmount: number
  interestRate: number
  monthlyPayment: number
  currentPath: DebtFreeResult
  reliefPath: ReliefResult
  onContinue: () => void
}

export function RevealScreen({ debtAmount, interestRate, monthlyPayment, currentPath, reliefPath, onContinue }: RevealScreenProps) {
  const clipId = React.useId()
  const [stage, setStage] = React.useState(0)

  React.useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 300)
    const t2 = setTimeout(() => setStage(2), 1200)
    const t3 = setTimeout(() => setStage(3), 2000)
    const t4 = setTimeout(() => setStage(4), 2600)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  const cappedCurrentMonths = currentPath.reachable ? currentPath.months : 420
  const reliefIsFaster = reliefPath.months < cappedCurrentMonths
  const monthsSaved = reliefIsFaster
    ? cappedCurrentMonths - reliefPath.months
    : 0
  const yearsSaved = Math.floor(monthsSaved / 12)
  const timeSavedLabel = monthsSaved >= 12
    ? `${yearsSaved} ${yearsSaved === 1 ? 'year' : 'yrs'}`
    : `${monthsSaved} mo`
  const totalSavings = currentPath.reachable
    ? currentPath.totalPaid - reliefPath.totalCost
    : debtAmount - reliefPath.totalCost

  const nowYear = new Date().getFullYear()
  const longestMonths = Math.max(cappedCurrentMonths, reliefPath.months)
  const maxMonths = longestMonths
  const endYear = nowYear + Math.ceil(longestMonths / 12)
  const currentEndMonth = cappedCurrentMonths
  const reliefEndMonth = reliefPath.months

  const currentD = generateAmortizationCurve(debtAmount, interestRate, monthlyPayment, cappedCurrentMonths, maxMonths, currentPath.reachable)
  const reliefD = generateReliefCurve(debtAmount, reliefPath.months, maxMonths)

  const reliefEndX = PAD.left + (reliefEndMonth / maxMonths) * INNER_W
  const currentEndX = PAD.left + (currentEndMonth / maxMonths) * INNER_W
  const bottomY = PAD.top + INNER_H

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

  const revealWidth = stage >= 1 ? INNER_W + PAD.right : 0

  return (
    <div className="w-full max-w-[555px] mx-auto px-4 sm:px-6 pt-2 sm:pt-4 pb-4 sm:pb-8">
      <div className="flex flex-col items-start w-full has-sticky-button">
        <h1
          className="animate-fade-in-up font-display text-headline-lg sm:text-display lg:text-display-md mb-2"
          style={{ color: NAVY }}
        >
          Here&apos;s your <span style={{ color: BLUE }}>debt-free timeline.</span>
        </h1>
        <p
          className="animate-fade-in-up leading-relaxed mb-6"
          style={{ animationDelay: '100ms', fontSize: '15px', color: '#666666' }}
        >
          Two paths compared — minimum payments vs. a relief program.
        </p>

        {/* Chart */}
        <div className="w-full bg-white border border-neutral-200 rounded-xl overflow-hidden mb-5">
          <div className="px-4 pt-4 pb-1">
            <svg
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              className="w-full"
              role="img"
              aria-label="Debt payoff comparison chart"
            >
              <defs>
                <clipPath id={clipId}>
                  <rect
                    x={PAD.left}
                    y={0}
                    height={VB_H}
                    width={revealWidth}
                    style={{ transition: 'width 900ms ease-out' }}
                  />
                </clipPath>
                <linearGradient id={`${clipId}-blue`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BLUE} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={BLUE} stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id={`${clipId}-green`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity="0.10" />
                  <stop offset="100%" stopColor={GREEN} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0.25, 0.5, 0.75, 1].map((frac) => (
                <line
                  key={frac}
                  x1={PAD.left}
                  y1={PAD.top + frac * INNER_H}
                  x2={PAD.left + INNER_W}
                  y2={PAD.top + frac * INNER_H}
                  stroke="#F0F0F0"
                  strokeWidth="1"
                />
              ))}

              {/* Area fills */}
              <path
                d={generateAreaPath(currentD)}
                fill={`url(#${clipId}-green)`}
                className="transition-opacity duration-300"
                style={{ opacity: stage >= 2 ? 1 : 0 }}
              />
              <path
                d={generateAreaPath(reliefD)}
                fill={`url(#${clipId}-blue)`}
                className="transition-opacity duration-300"
                style={{ opacity: stage >= 2 ? 1 : 0 }}
              />

              {/* Lines revealed left-to-right */}
              <g clipPath={`url(#${clipId})`}>
                <path d={currentD} fill="none" stroke={GREEN} strokeWidth="3" />
                <path d={reliefD} fill="none" stroke={BLUE} strokeWidth="3" />

                {/* Start dot */}
                <circle cx={PAD.left} cy={PAD.top} r="4" fill={NAVY} />

                {/* Relief endpoint marker */}
                <circle
                  cx={reliefEndX}
                  cy={bottomY}
                  r="5"
                  fill={BLUE}
                  className="transition-opacity duration-500"
                  style={{ opacity: stage >= 2 ? 1 : 0 }}
                />

                {/* Current endpoint marker */}
                <circle
                  cx={currentEndX}
                  cy={bottomY}
                  r="4"
                  fill={GREEN}
                  className="transition-opacity duration-500"
                  style={{ opacity: stage >= 2 ? 1 : 0 }}
                />
              </g>

              {/* Y-axis labels */}
              <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" fontSize="9" fill={GREY}>
                {formatCurrency(debtAmount)}
              </text>
              <text x={PAD.left - 6} y={bottomY + 3} textAnchor="end" fontSize="9" fill={GREY}>
                $0
              </text>

              {/* X-axis baseline */}
              <line
                x1={PAD.left}
                y1={bottomY}
                x2={PAD.left + INNER_W}
                y2={bottomY}
                stroke="#EDEDED"
                strokeWidth="1"
              />

              {/* X-axis tick labels */}
              {xTicks.map((tick) => (
                <text
                  key={tick.year}
                  x={tick.x}
                  y={bottomY + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6A6A6A"
                >
                  {tick.year}
                </text>
              ))}

              {/* Endpoint year annotations */}
              <text
                x={reliefEndX}
                y={bottomY + 32}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={BLUE}
                className="transition-opacity duration-500"
                style={{ opacity: stage >= 2 ? 1 : 0 }}
              >
                {reliefPath.year}
              </text>

              {/* Endpoint year annotations — current path */}
              {currentPath.reachable && (
                <text
                  x={currentEndX}
                  y={bottomY + 32}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill={GREEN}
                  className="transition-opacity duration-500"
                  style={{ opacity: stage >= 2 ? 1 : 0 }}
                >
                  {currentPath.year}
                </text>
              )}

              {/* Legend */}
              <line x1={PAD.left} y1={PAD.top - 16} x2={PAD.left + 18} y2={PAD.top - 16} stroke={BLUE} strokeWidth="3" />
              <text x={PAD.left + 22} y={PAD.top - 13} fontSize="9" fill={NAVY} fontWeight="500">
                With relief program
              </text>
              <line x1={PAD.left + 150} y1={PAD.top - 16} x2={PAD.left + 168} y2={PAD.top - 16} stroke={GREEN} strokeWidth="3" />
              <text x={PAD.left + 172} y={PAD.top - 13} fontSize="9" fill={GREY}>
                Minimum payments
              </text>
            </svg>
          </div>
        </div>

        {/* Stat cards row */}
        <div
          className={cn(
            'w-full grid grid-cols-3 gap-3 mb-6 transition-all duration-700',
            stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          )}
        >
          <div className="border border-neutral-200 rounded-xl p-4 text-center">
            <p style={{ fontSize: '22px', fontWeight: 700, color: BLUE }}>{formatCurrency(Math.max(0, totalSavings))}</p>
            <p style={{ fontSize: '11px', color: '#999999', marginTop: '2px' }}>Could save</p>
          </div>
          <div className="border border-neutral-200 rounded-xl p-4 text-center">
            <p style={{ fontSize: '22px', fontWeight: 700, color: BLUE }}>
              {!currentPath.reachable ? '30+ yrs' : reliefIsFaster ? timeSavedLabel : `${reliefPath.months} mo`}
            </p>
            <p style={{ fontSize: '11px', color: '#999999', marginTop: '2px' }}>
              {reliefIsFaster || !currentPath.reachable ? 'Faster payoff' : 'Program length'}
            </p>
          </div>
          <div className="border border-neutral-200 rounded-xl p-4 text-center">
            <p style={{ fontSize: '22px', fontWeight: 700, color: BLUE }}>{reliefPath.year}</p>
            <p style={{ fontSize: '11px', color: '#999999', marginTop: '2px' }}>Debt-free by</p>
          </div>
        </div>

        {/* CTA */}
        <div
          className={cn(
            'w-full transition-all duration-700',
            stage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          )}
        >
          <StickyButtonContainer>
            <Button fullWidth showTrailingIcon onClick={onContinue}>
              See If You Qualify
            </Button>
          </StickyButtonContainer>
        </div>

        {/* Trust line */}
        <div
          className={cn(
            'w-full flex items-center justify-center gap-2 mt-4 transition-opacity duration-500',
            stage >= 4 ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Image src="/icon-shield.png" alt="Shield" width={20} height={20} unoptimized />
          <span style={{ fontSize: '12px', color: '#999999' }}>
            Your information is secure and never shared
          </span>
        </div>
      </div>
    </div>
  )
}

export default RevealScreen

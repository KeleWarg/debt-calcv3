'use client'

import * as React from 'react'
import {
  CalcCombined,
  CalcPII,
} from '@/components/calculator'
import { CalcProgressBar } from '@/components/calculator/CalcProgressBar'
import { Header } from '@/components/layout/Header'
import type { DebtFreeResult, ReliefResult } from '@/lib/calculator'
import type { CalcStep, CalcFunnelData } from '@/types/calculator'

const DEFAULT_APR = 24.37

const STEP_ORDER: CalcStep[] = [
  'combined',
  'pii',
]

const FULL_SCREEN_STEPS: CalcStep[] = ['combined']

export default function CalculatorPage() {
  const [step, setStep] = React.useState<CalcStep>('combined')
  const [data, setData] = React.useState<CalcFunnelData>({
    debtAmount: 15000,
    interestRate: DEFAULT_APR,
    monthlyPayment: 350,
  })
  const [currentResult, setCurrentResult] = React.useState<DebtFreeResult | null>(null)
  const [reliefResult, setReliefResult] = React.useState<ReliefResult | null>(null)

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [step])

  const goTo = (s: CalcStep) => setStep(s)

  const goBack = React.useCallback(() => {
    const idx = STEP_ORDER.indexOf(step)
    if (idx > 0) {
      setStep(STEP_ORDER[idx - 1])
    }
  }, [step])

  const update = (partial: Partial<CalcFunnelData>) => {
    setData((prev) => ({ ...prev, ...partial }))
  }

  const handleResultsComputed = React.useCallback((
    current: DebtFreeResult,
    relief: ReliefResult,
    debt: number,
    payment: number,
  ) => {
    update({ debtAmount: debt, monthlyPayment: payment })
    setCurrentResult(current)
    setReliefResult(relief)
  }, [])

  const isFullScreen = FULL_SCREEN_STEPS.includes(step)
  const showProgress = !isFullScreen
  const showBack = step !== 'combined'

  if (step === 'combined') {
    return (
      <CalcCombined
        initialDebt={data.debtAmount}
        initialPayment={data.monthlyPayment}
        interestRate={DEFAULT_APR}
        onContinue={() => goTo('pii')}
        onResultsComputed={handleResultsComputed}
      />
    )
  }

  const renderStep = () => {
    switch (step) {
      case 'pii':
        {
          const cappedMonths = currentResult?.reachable ? currentResult.months : 420
          const reliefMonths = reliefResult?.months ?? 0
          const monthsSaved = Math.max(0, cappedMonths - reliefMonths)
          const yearsSaved = monthsSaved >= 12
            ? `${Math.floor(monthsSaved / 12)} ${Math.floor(monthsSaved / 12) === 1 ? 'year' : 'yrs'}`
            : `${monthsSaved} mo`

          return (
            <CalcPII
              debtAmount={data.debtAmount}
              potentialSavings={
                currentResult?.reachable
                  ? (currentResult.totalPaid - (reliefResult?.totalCost ?? 0))
                  : (data.debtAmount - (reliefResult?.totalCost ?? 0))
              }
              yearsSaved={yearsSaved}
              onSubmit={(pii) => {
                update(pii)
                alert('Lead submitted! (API integration pending)')
              }}
            />
          )
        }
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-page-gradient overflow-auto">
      <div className="sticky top-0 z-50">
        <Header />
      </div>
      {showProgress && (
        <div className="sticky top-[56px] z-40 bg-white">
          <div className="max-w-[555px] mx-auto px-4 sm:px-6">
            <CalcProgressBar
              step={step}
              onBack={showBack ? goBack : undefined}
            />
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 pb-24 sm:pb-0">
        {renderStep()}
      </div>
    </div>
  )
}

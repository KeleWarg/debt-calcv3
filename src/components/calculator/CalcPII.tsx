'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { formatCurrency, formatPhoneNumber } from '@/lib/utils'

const BLUE = '#007AC8'
const GREEN = '#0C7663'
const NAVY = '#1B2A4A'

const piiSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(14, 'Please enter a valid phone number'),
})

type PIIFormValues = z.infer<typeof piiSchema>

interface CalcPIIProps {
  debtAmount: number
  potentialSavings: number
  yearsSaved?: string
  onSubmit: (data: PIIFormValues) => void
}

export function CalcPII({ debtAmount, potentialSavings, yearsSaved, onSubmit }: CalcPIIProps) {
  const [loading, setLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PIIFormValues>({
    resolver: zodResolver(piiSchema),
  })

  const onFormSubmit = async (data: PIIFormValues) => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    onSubmit(data)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setValue('phone', formatted, { shouldValidate: true })
  }

  const FIELDS = [
    { name: 'firstName' as const, label: 'First name', type: 'text', placeholder: 'First name' },
    { name: 'lastName' as const, label: 'Last name', type: 'text', placeholder: 'Last name' },
    { name: 'email' as const, label: 'Email', type: 'email', placeholder: 'you@example.com' },
    { name: 'phone' as const, label: 'Phone', type: 'tel', placeholder: '(555) 123-4567' },
  ]

  const summaryRows = [
    { label: 'Total Debt', value: formatCurrency(debtAmount) },
    { label: 'Potential Savings', value: formatCurrency(Math.max(0, potentialSavings)), valueColor: GREEN },
    ...(yearsSaved ? [{ label: 'Time Saved', value: yearsSaved }] : []),
  ]

  return (
    <>
      <div className="w-full max-w-[555px] mx-auto px-4 sm:px-6 pt-2 sm:pt-4 pb-28">
        <div className="flex flex-col items-start w-full">
          <p
            className="animate-fade-in-up text-xs font-medium uppercase tracking-wider text-neutral-400 mb-3"
            style={{ animationDelay: '400ms' }}
          >
            Almost done
          </p>

          <h1
            className="animate-fade-in-up font-display text-headline-lg sm:text-display lg:text-display-md mb-2"
            style={{ animationDelay: '400ms', color: NAVY }}
          >
            We made you a{' '}
            <span style={{ color: BLUE }}>debt-free timeline</span> with program recommendations.
          </h1>

          <p
            className="animate-fade-in-up leading-relaxed mb-6"
            style={{ animationDelay: '450ms', fontSize: '15px', color: '#666666' }}
          >
            Where should we send your free report?
          </p>

          {/* Summary card */}
          <div
            className="animate-fade-in-up w-full mb-6"
            style={{
              animationDelay: '500ms',
              borderRadius: '14px',
              backgroundColor: '#EFF3F8',
              padding: '2px 0',
            }}
          >
            {summaryRows.map((row, i, arr) => (
              <div key={row.label}>
                <div className="flex items-center justify-between" style={{ padding: '11px 20px' }}>
                  <span style={{ fontSize: '15px', color: '#6B7280' }}>{row.label}</span>
                  <span className="font-semibold" style={{ fontSize: '15px', color: row.valueColor || NAVY }}>
                    {row.value}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ height: '1px', backgroundColor: '#DEE4ED', margin: '0 20px' }} />
                )}
              </div>
            ))}
          </div>

          <div
            className="animate-fade-in-up w-full h-px mb-6"
            style={{ animationDelay: '550ms', backgroundColor: 'rgba(26, 26, 46, 0.08)' }}
          />

          {/* Form */}
          <form id="pii-form" onSubmit={handleSubmit(onFormSubmit)} className="w-full">
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {FIELDS.slice(0, 2).map((field, i) => (
                <div
                  key={field.name}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${600 + i * 60}ms` }}
                >
                  <Input
                    label={field.label}
                    type={field.type}
                    placeholder={field.placeholder}
                    error={errors[field.name]?.message}
                    {...register(field.name)}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-y-4 mt-4">
              {FIELDS.slice(2).map((field, i) => {
                const isPhone = field.name === 'phone'
                return (
                  <div
                    key={field.name}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${720 + i * 60}ms` }}
                  >
                    <Input
                      label={field.label}
                      type={field.type}
                      placeholder={field.placeholder}
                      error={errors[field.name]?.message}
                      {...register(field.name, isPhone ? { onChange: handlePhoneChange } : undefined)}
                    />
                  </div>
                )
              })}
            </div>
          </form>

          <p className="w-full text-center mt-4" style={{ fontSize: '11px', color: '#999999', lineHeight: '1.4' }}>
            By continuing, you agree to be connected with a debt relief specialist. No obligation.
            Free consultation. You can opt out at any time.
          </p>
        </div>
      </div>

      {/* Fixed bottom CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-[555px] mx-auto px-4 sm:px-6 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <Button type="submit" form="pii-form" fullWidth showTrailingIcon loading={loading}>
            Get My Free Report
          </Button>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="3" y="6" width="8" height="6" rx="1" stroke="#999999" strokeWidth="1.2" />
              <path d="M5 6V4a2 2 0 1 1 4 0v2" stroke="#999999" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: '12px', color: '#999999' }}>
              256-Bit Encrypted &nbsp;&bull;&nbsp; Never Sold or Shared
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

export default CalcPII

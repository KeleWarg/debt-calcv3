import type { Metadata } from 'next'
import { Work_Sans, Source_Serif_4 } from 'next/font/google'
import localFont from 'next/font/local'
import '@/styles/globals.css'

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
  weight: ['300', '400', '500', '600', '700'],
})

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const schnyderS = localFont({
  src: '../fonts/SchnyderS-Bold.otf',
  weight: '700',
  style: 'normal',
  variable: '--font-schnyder',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
})

export const metadata: Metadata = {
  title: 'Debt Relief Calculator - Forbes Advisor',
  description: 'See how fast you could be debt-free. Compare your current payments to a relief program and find out how much you could save.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${workSans.variable} ${schnyderS.variable} ${sourceSerif4.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}

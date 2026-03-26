'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface StickyButtonContainerProps {
  children: React.ReactNode
  className?: string
}

export function StickyButtonContainer({ 
  children, 
  className 
}: StickyButtonContainerProps) {
  const [keyboardOffset, setKeyboardOffset] = React.useState(0)
  const [isMobile, setIsMobile] = React.useState(false)
  const [desktopSticky, setDesktopSticky] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const anchorRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  React.useEffect(() => {
    if (isMobile || !mounted) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => setDesktopSticky(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [isMobile, mounted])

  React.useEffect(() => {
    if (!isMobile) return
    const visualViewport = window.visualViewport
    if (!visualViewport) return

    const handleResize = () => {
      const keyboardHeight = window.innerHeight - visualViewport.height
      if (keyboardHeight > 100) {
        const offset = keyboardHeight - visualViewport.offsetTop
        setKeyboardOffset(Math.max(0, offset))
      } else {
        setKeyboardOffset(0)
      }
    }

    visualViewport.addEventListener('resize', handleResize)
    visualViewport.addEventListener('scroll', handleResize)
    handleResize()

    return () => {
      visualViewport.removeEventListener('resize', handleResize)
      visualViewport.removeEventListener('scroll', handleResize)
    }
  }, [isMobile])

  const handlePortalClick = (e: React.MouseEvent) => {
    const button = (e.target as HTMLElement).closest('button')
    if (!button || button.disabled) return
    if (button.type === 'submit') {
      e.preventDefault()
      const form = anchorRef.current?.closest('form')
      if (form) {
        form.requestSubmit()
      }
    }
  }

  const shouldPortal = isMobile || desktopSticky

  const fixedBar = (
    <div
      className={cn(
        'fixed left-0 right-0 bottom-0 bg-white border-t border-neutral-200 px-4 pt-3 pb-4 z-[9999] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]',
        'transition-[bottom] duration-150 ease-out',
      )}
      style={{ bottom: keyboardOffset > 0 ? `${keyboardOffset}px` : 0 }}
    >
      <div
        className="max-w-content mx-auto [&_.btn-continue-wrapper]:w-full [&_button]:w-full"
        onClick={handlePortalClick}
      >
        {children}
      </div>
    </div>
  )

  return (
    <>
      <div ref={anchorRef} className={cn('w-full', shouldPortal ? 'invisible' : '', className)}>
        <div ref={sentinelRef} className="w-full">
          {children}
        </div>
      </div>
      {mounted && shouldPortal && createPortal(fixedBar, document.body)}
    </>
  )
}

export default StickyButtonContainer

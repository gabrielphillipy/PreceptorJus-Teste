import { useEffect, useRef, useCallback } from 'react'

// 30 min de inatividade → logout automático (R6, configurável)
const INACTIVITY_MS = 30 * 60 * 1000
const EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
]

export function useInactivityTimeout(onTimeout: () => void, enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onTimeoutRef.current(), INACTIVITY_MS)
  }, [])

  useEffect(() => {
    if (!enabled) return
    reset()
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      EVENTS.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [enabled, reset])
}

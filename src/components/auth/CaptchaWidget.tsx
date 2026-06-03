import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

// TODO(R3): obter site key em Cloudflare Dashboard → Turnstile → Add Site
// Configurar VITE_TURNSTILE_SITE_KEY e TURNSTILE_SECRET_KEY nas variáveis do projeto.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

declare global {
  interface Window {
    turnstile?: {
      render(
        container: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback': () => void
          theme: 'light' | 'dark' | 'auto'
        },
      ): string
      reset(widgetId: string): void
    }
  }
}

export interface CaptchaRef {
  getToken: () => string | null
  reset: () => void
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
const CaptchaWidget = forwardRef<CaptchaRef, {}>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)

  useImperativeHandle(ref, () => ({
    getToken: () => tokenRef.current,
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
        tokenRef.current = null
      }
    },
  }))

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return

    function mount() {
      if (!containerRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY!,
        callback: (t) => {
          tokenRef.current = t
        },
        'expired-callback': () => {
          tokenRef.current = null
        },
        theme: 'light',
      })
    }

    if (window.turnstile) {
      mount()
    } else {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      script.onload = mount
      document.head.appendChild(script)
    }

    return () => {
      widgetIdRef.current = null
      tokenRef.current = null
    }
  }, [])

  if (!SITE_KEY) {
    if (import.meta.env.DEV) {
      return (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          CAPTCHA desabilitado (VITE_TURNSTILE_SITE_KEY não configurada)
        </div>
      )
    }
    return null
  }

  return <div ref={containerRef} className="min-h-[65px]" />
})
CaptchaWidget.displayName = 'CaptchaWidget'

export default CaptchaWidget

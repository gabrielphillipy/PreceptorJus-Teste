import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  title: string
  description?: string
  children: ReactNode
}

export default function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--pjus-canvas)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 mb-8 no-underline"
          aria-label="Ir para página inicial"
        >
          <span className="text-[rgb(var(--brand-primary))] font-extrabold text-2xl tracking-tight font-[Manrope]">
            PreceptorJus
          </span>
        </Link>

        <div className="bg-white rounded-2xl border border-[var(--pjus-hairline)] shadow-sm px-8 py-8">
          <div className="mb-6">
            <h1 className="text-[rgb(var(--brand-ink))] text-2xl font-bold font-[Manrope] leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-[rgb(var(--brand-ink-2))] text-sm mt-1">{description}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

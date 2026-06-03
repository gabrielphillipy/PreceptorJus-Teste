import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PASSWORD_MIN_LENGTH } from '@/lib/auth-utils'

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
  // Se true, exibe o hint de requisitos ao mostrar erro. Nunca antes (R2).
  showHintOnError?: boolean
}

const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ id, label, error, showHintOnError = false, className, ...rest }, ref) => {
    const [visible, setVisible] = useState(false)

    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative">
          <Input
            id={id}
            ref={ref}
            type={visible ? 'text' : 'password'}
            minLength={PASSWORD_MIN_LENGTH}
            aria-describedby={error ? `${id}-err` : undefined}
            aria-invalid={!!error}
            className={`pr-16 ${className ?? ''}`}
            {...rest}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--pjus-ink-4)] hover:text-[rgb(var(--brand-ink))] text-xs font-medium select-none"
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {visible ? 'ocultar' : 'mostrar'}
          </button>
        </div>
        {error && (
          <p id={`${id}-err`} role="alert" className="text-red-600 text-xs">
            {error}
            {showHintOnError && (
              <span className="block mt-0.5 text-[var(--pjus-ink-3)]">
                Ex: Abcd1234!
              </span>
            )}
          </p>
        )}
      </div>
    )
  },
)
PasswordField.displayName = 'PasswordField'

export default PasswordField

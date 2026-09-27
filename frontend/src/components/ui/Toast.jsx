/** Toast notifications driven by the app store. */
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '../../store'

const TONES = {
  success: { icon: CheckCircle2, className: 'text-positive' },
  error: { icon: AlertTriangle, className: 'text-danger' },
  info: { icon: Info, className: 'text-accent' },
}

export default function ToastContainer() {
  const toasts = useStore((state) => state.toasts)
  const dismissToast = useStore((state) => state.dismissToast)

  if (!toasts.length) return null

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
    >
      {toasts.map((toast) => {
        const tone = TONES[toast.type] || TONES.info
        const Icon = tone.icon
        return (
          <div
            key={toast.id}
            role="status"
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-lifted animate-slide-up"
          >
            <Icon aria-hidden="true" className={clsx('mt-0.5 h-4 w-4 shrink-0', tone.className)} />
            <p className="flex-1 text-sm text-ink">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="rounded p-1 text-muted transition-colors hover:text-ink"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
import { useStore } from '../../store'
import { CheckCircle, XCircle, Info } from 'lucide-react'
import clsx from 'clsx'

const ICONS = {
  success: <CheckCircle size={16} className="text-green-400" />,
  error: <XCircle size={16} className="text-red-400" />,
  info: <Info size={16} className="text-accent-purpleLight" />,
}

export default function ToastContainer() {
  const { toasts } = useStore()

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-card glass',
            'text-sm text-text-primary animate-slide-up shadow-lg',
            'min-w-64 max-w-80'
          )}
        >
          {ICONS[toast.type] || ICONS.info}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}

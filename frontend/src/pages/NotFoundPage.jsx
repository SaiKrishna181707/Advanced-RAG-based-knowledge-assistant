import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <EmptyState
        icon={Compass}
        title="That page does not exist"
        description="The link may be out of date. Head back to your dashboard, or to the ALBATROSS home page."
        action={
          <div className="flex gap-2">
            <Link to="/app" className="btn-primary">
              Go to dashboard
            </Link>
            <Link to="/" className="btn-secondary">
              Back to home
            </Link>
          </div>
        }
      />
    </div>
  )
}
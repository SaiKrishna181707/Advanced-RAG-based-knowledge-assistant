/** Route-level loading placeholder, shown while a lazy page chunk downloads. */
import { Skeleton } from './Primitives'

export default function PageFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6" aria-busy="true">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-80" />
      <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-card" />
    </div>
  )
}
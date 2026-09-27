/** Live upload and processing progress for files added in this session. */
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Progress } from '../ui/Primitives'
import { useStore } from '../../store'
import { formatBytes } from '../../lib/format'

const LABELS = {
  uploading: 'Uploading',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
}

export default function UploadProgress({ className }) {
  const uploads = useStore((state) => state.uploads)
  if (!uploads.length) return null

  return (
    <div className={className}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Recent uploads</h2>
      <ul className="mt-2 space-y-2">
        {uploads.map((upload) => (
          <li key={upload.key} className="card p-3">
            <div className="flex items-center gap-2.5">
              {upload.status === 'failed' ? (
                <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-danger" />
              ) : upload.status === 'ready' ? (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-positive" />
              ) : (
                <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin text-accent" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{upload.name}</span>
              <span className="shrink-0 text-2xs text-muted">
                {LABELS[upload.status] || upload.status}
                {upload.chunk_count ? ` · ${upload.chunk_count} chunks` : ''}
              </span>
            </div>

            {upload.status === 'uploading' && (
              <Progress
                value={upload.progress || 0}
                label={`Upload progress for ${upload.name}`}
                className="mt-2"
              />
            )}

            {upload.error && (
              <p role="alert" className="mt-2 text-xs text-danger">
                {upload.error}
              </p>
            )}

            {upload.status === 'ready' && upload.size_bytes ? (
              <p className="mt-1.5 text-2xs text-muted">{formatBytes(upload.size_bytes)}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
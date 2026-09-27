/**
 * Multi-format upload dropzone.
 *
 * Only the extensions the backend can actually extract are accepted. A rejected
 * file, an oversized file and a duplicate are all reported with the server's own
 * message, so the user sees the same wording the API produced.
 */
import { useCallback, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { CloudUpload, FileUp, Info } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '../ui/Primitives'
import { useStore } from '../../store'

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md', '.markdown'],
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

/** Highest limit across the plan catalogue; the server enforces the account's own. */
const MAX_BYTES = 100 * 1024 * 1024

export default function UploadZone({ collectionId = null, className }) {
  const uploadDocument = useStore((state) => state.uploadDocument)
  const addToast = useStore((state) => state.addToast)
  const isUploading = useStore((state) => state.isUploading)
  const [busy, setBusy] = useState(false)

  const onDrop = useCallback(
    async (accepted) => {
      if (!accepted.length) return
      setBusy(true)
      for (const file of accepted) {
        try {
          await uploadDocument(file, { collectionId })
        } catch {
          /* the store already reported the reason */
        }
      }
      setBusy(false)
    },
    [uploadDocument, collectionId],
  )

  const onDropRejected = useCallback(
    (rejections) => {
      const [first] = rejections
      const reason = first?.errors?.[0]
      if (reason?.code === 'file-too-large') {
        addToast('That file is larger than 100 MB. Upload a smaller file.', 'error')
      } else if (reason?.code === 'file-invalid-type') {
        addToast('That file type is not supported. Use PDF, TXT, Markdown, DOCX or CSV.', 'error')
      } else {
        addToast('That file could not be accepted.', 'error')
      }
    },
    [addToast],
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected,
    accept: ACCEPT,
    multiple: true,
    maxSize: MAX_BYTES,
    noClick: true,
    noKeyboard: true,
  })

  const hint = useMemo(
    () => 'PDF, TXT, MD, DOCX or CSV · up to 100 MB each · duplicates are detected',
    [],
  )

  return (
    <div
      {...getRootProps({
        className: clsx(
          'rounded-card border border-dashed p-6 text-center transition-colors',
          isDragActive ? 'border-accent bg-accent/5' : 'border-line bg-surface',
          className,
        ),
      })}
    >
      <input {...getInputProps()} aria-label="Choose documents to upload" />
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent/12 text-accent-ink">
        <CloudUpload aria-hidden="true" className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-ink">
        {isDragActive ? 'Drop your documents here' : 'Drag documents here to build your knowledge base'}
      </p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button variant="primary" icon={FileUp} loading={busy || isUploading} onClick={open}>
          Choose files
        </Button>
      </div>
      <p className="mt-3 flex items-start justify-center gap-1.5 text-2xs text-muted">
        <Info aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
        Files are processed in the background. You can keep working while indexing runs.
      </p>
    </div>
  )
}
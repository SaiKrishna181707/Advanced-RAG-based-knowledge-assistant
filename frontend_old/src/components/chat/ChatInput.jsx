/**
 * Composer.
 *
 * Enter sends, Shift+Enter adds a newline. While an answer is streaming the send
 * button becomes a stop button, and Escape also stops generation.
 */
import { useEffect, useRef } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '../ui/Primitives'

const MAX_HEIGHT = 200

export default function ChatInput({ onSend, onStop, isStreaming, disabled, placeholder, value, onValueChange }) {
  const textareaRef = useRef(null)

  const resize = () => {
    const node = textareaRef.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, MAX_HEIGHT)}px`
  }

  useEffect(() => {
    resize()
  }, [value])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && isStreaming) onStop?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isStreaming, onStop])

  const submit = () => {
    const text = (value || '').trim()
    if (!text || isStreaming || disabled) return
    onSend?.(text)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      className="flex items-end gap-2 rounded-card border border-line bg-surface p-2 shadow-card"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <label htmlFor="chat-composer" className="sr-only">
        Ask a question about your documents
      </label>
      <textarea
        id="chat-composer"
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Ask a question about your documents…'}
        aria-describedby="chat-composer-hint"
        className="max-h-[200px] min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-muted/70 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />

      <span id="chat-composer-hint" className="sr-only">
        Press Enter to send, Shift and Enter for a new line, Escape to stop generating.
      </span>

      {isStreaming ? (
        <Button variant="secondary" onClick={onStop} className="shrink-0" aria-label="Stop generating">
          <Square aria-hidden="true" className="h-3.5 w-3.5" />
          Stop
        </Button>
      ) : (
        <button
          type="submit"
          disabled={disabled || !(value || '').trim()}
          aria-label="Send question"
          className={clsx(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-accent text-accent-fg transition-opacity',
            'hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          <ArrowUp aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </form>
  )
}
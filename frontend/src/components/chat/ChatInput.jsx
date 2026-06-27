/**
 * components/chat/ChatInput.jsx
 *
 * The message input bar at the bottom of the chat page.
 * Supports: Enter to send, Shift+Enter for newline, upload button.
 */

import { useState, useRef } from 'react'
import { Send, Paperclip, Loader2 } from 'lucide-react'
import { useStore } from '../../store'
import clsx from 'clsx'

export default function ChatInput({ onUploadClick }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)
  const { askQuestion, isAsking } = useStore()

  const handleSubmit = async () => {
    const q = value.trim()
    if (!q || isAsking) return
    setValue('')
    textareaRef.current.style.height = 'auto'
    await askQuestion(q)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Auto-grow textarea
  const handleChange = (e) => {
    setValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  return (
    <div className="px-4 pb-5 pt-2">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3 bg-bg-card border border-bg-border rounded-2xl px-4 py-3
                        focus-within:border-accent-purple/50 transition-colors duration-200">
          {/* Upload trigger */}
          <button
            onClick={onUploadClick}
            className="text-text-muted hover:text-accent-purpleLight transition-colors mb-1 flex-shrink-0"
            title="Upload document"
          >
            <Paperclip size={18} />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your documents…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted
                       resize-none outline-none leading-relaxed min-h-[24px]"
            style={{ maxHeight: '160px' }}
            disabled={isAsking}
          />

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || isAsking}
            className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mb-0.5 transition-all',
              value.trim() && !isAsking
                ? 'bg-accent-purple text-white hover:bg-violet-600'
                : 'bg-bg-hover text-text-muted cursor-not-allowed'
            )}
          >
            {isAsking
              ? <Loader2 size={15} className="animate-spin" />
              : <Send size={15} />
            }
          </button>
        </div>

        <p className="text-center text-xs text-text-muted mt-2">
          Press <kbd className="px-1 py-0.5 rounded bg-bg-hover border border-bg-border font-mono text-xs">Enter</kbd> to send,{' '}
          <kbd className="px-1 py-0.5 rounded bg-bg-hover border border-bg-border font-mono text-xs">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}

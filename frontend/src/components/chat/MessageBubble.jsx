/**
 * components/chat/MessageBubble.jsx
 *
 * Renders a single chat message.
 * For assistant messages: renders markdown, shows source cards, timing info.
 * For user messages: simple bubble.
 */

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { FileText, Clock, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-text-muted hover:text-text-primary transition-colors">
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  )
}

function SourceCard({ source }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="flex flex-col gap-1.5 bg-bg-hover border border-bg-border rounded-lg px-3 py-2.5 cursor-pointer hover:border-accent-purple/40 transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <FileText size={14} className="text-accent-purpleLight flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-primary truncate">{source.document}</p>
          <p className="text-xs text-text-muted">Page {source.page}</p>
        </div>
        <span className="text-xs text-accent-purpleLight ml-auto flex-shrink-0 bg-accent-purpleDim px-1.5 py-0.5 rounded">
          {Math.round(source.score * 100)}% match
        </span>
      </div>
      {expanded && source.snippet && (
        <p className="text-xs text-text-secondary mt-1 border-t border-bg-border pt-2 leading-relaxed">
          {source.snippet}
        </p>
      )}
    </div>
  )
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isError = message.isError

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[75%] bg-accent-purpleDim border border-accent-purple/30 rounded-2xl rounded-br-sm px-4 py-3">
          <p className="text-sm text-text-primary leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 animate-slide-up">
      {/* AI avatar */}
      <div className="w-7 h-7 rounded-lg bg-accent-purpleDim border border-accent-purple/30 flex-shrink-0
                      flex items-center justify-center mt-1">
        <span className="text-xs font-bold text-accent-purpleLight">AI</span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Main answer */}
        <div className={clsx(
          'bg-bg-card border rounded-2xl rounded-tl-sm px-5 py-4',
          isError ? 'border-red-500/30' : 'border-bg-border'
        )}>
          <div className="markdown-content text-sm text-text-primary leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{ borderRadius: '8px', margin: '8px 0' }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>{children}</code>
                  )
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Timing info */}
          {message.retrieval_time_ms && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-bg-border">
            <Clock size={12} className="text-text-muted" />
            <span className="text-xs text-text-muted">
              {message.retrieval_time_ms
                ? `Retrieved in ${message.retrieval_time_ms}ms · Generated in ${message.llm_time_ms}ms`
                : 'Generated'}
            </span>
            <CopyButton text={message.content} />
          </div>
          )}
        </div>

        {/* Source citations */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-text-muted mb-1.5 px-1">Sources</p>
            <div className="grid grid-cols-1 gap-1.5">
              {message.sources.map((src, i) => (
                <SourceCard key={i} source={src} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * One turn in a conversation.
 *
 * Answers are rendered as Markdown (tables, code, maths via KaTeX). Numbered
 * citations written by the model as [1] are converted into buttons that open the
 * source inspector, so a claim is one click away from its evidence.
 *
 * The syntax highlighter is the "light" Prism build with an explicit language
 * list; the full build pulls in every grammar and triples the bundle.
 */
import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import 'katex/dist/katex.min.css'
import {
  AlertTriangle,
  Check,
  Copy,
  FileText,
  RefreshCw,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import clsx from 'clsx'
import { BrandMark } from '../layout/Brand'
import { locationLabel } from '../../lib/format'
import { linkifyCitations } from '../../lib/citations'
import { useThemeStore } from '../../store/theme'

const LANGUAGES = {
  bash,
  javascript,
  json,
  jsx,
  markdown,
  python,
  sql,
  tsx,
  typescript,
  yaml,
}

Object.entries(LANGUAGES).forEach(([name, grammar]) => {
  SyntaxHighlighter.registerLanguage(name, grammar)
})
SyntaxHighlighter.registerLanguage('js', javascript)
SyntaxHighlighter.registerLanguage('ts', typescript)
SyntaxHighlighter.registerLanguage('py', python)
SyntaxHighlighter.registerLanguage('sh', bash)
SyntaxHighlighter.registerLanguage('shell', bash)
SyntaxHighlighter.registerLanguage('yml', yaml)

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-2xs text-muted transition-colors hover:bg-raised hover:text-ink"
      aria-label={copied ? 'Answer copied' : 'Copy answer'}
    >
      {copied ? <Check aria-hidden="true" className="h-3 w-3" /> : <Copy aria-hidden="true" className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function SourceChips({ sources, onOpenSource }) {
  if (!sources?.length) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((source) => (
        <button
          key={`${source.index}-${source.chunk_id}`}
          type="button"
          onClick={() => onOpenSource?.(source)}
          className="group inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-muted transition-colors hover:border-accent/40 hover:text-ink"
          title={`Open source: ${source.document}`}
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-accent/12 font-semibold text-accent-ink">
            {source.index}
          </span>
          <FileText aria-hidden="true" className="h-3 w-3 shrink-0" />
          <span className="max-w-[14rem] truncate">{source.document}</span>
          {locationLabel(source.location_unit, source.page) && (
            <span className="shrink-0 text-muted/80">
              · {locationLabel(source.location_unit, source.page)}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function MarkdownBody({ content, onOpenSource, dark }) {
  const prepared = linkifyCitations(content)

  return (
    <div className="prose-albatross">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a({ href, children, ...props }) {
            const match = /^#cite-(\d+)$/.exec(href || '')
            if (match) {
              const number = Number(match[1])
              return (
                <button
                  type="button"
                  onClick={() => onOpenSource?.(number)}
                  aria-label={`Open source ${number}`}
                  className="mx-0.5 inline-flex items-center rounded border border-accent/40 bg-accent/10 px-1 align-middle text-2xs font-semibold text-accent-ink transition-colors hover:bg-accent/20"
                >
                  {number}
                </button>
              )
            }
            return (
              <a href={href} target="_blank" rel="noreferrer noopener" {...props}>
                {children}
              </a>
            )
          },
          code({ inline, className, children, ...props }) {
            const language = /language-(\w+)/.exec(className || '')?.[1]
            if (inline || !language) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }
            return (
              <SyntaxHighlighter
                language={language}
                style={dark ? oneDark : oneLight}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  background: 'transparent',
                  fontSize: '0.8125rem',
                  padding: 0,
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            )
          },
        }}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  )
}

function MessageBubble({
  message,
  onOpenSource,
  onFeedback,
  onRegenerate,
  onRetry,
  canRegenerate = false,
}) {
  const dark = useThemeStore((state) => state.resolvedDark)

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[min(46rem,92%)] rounded-card rounded-br-sm bg-accent px-4 py-2.5 text-sm leading-relaxed text-accent-fg">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  const isError = message.isError
  const streaming = Boolean(message.streaming)
  const sources = message.sources || []

  const openByNumber = (number) => {
    const source =
      typeof number === 'number' ? sources.find((item) => item.index === number) : number
    if (source) onOpenSource?.(source)
  }

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface">
        <BrandMark className="h-4 w-4 text-accent" />
      </span>

      <div className="min-w-0 flex-1">
        {isError ? (
          <div
            role="alert"
            className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            <p className="flex items-start gap-2">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{message.errorMessage || 'The answer could not be generated.'}</span>
            </p>
            {onRetry && message.retryQuestion && (
              <button
                type="button"
                onClick={() => onRetry(message.retryQuestion)}
                className="btn-secondary mt-3"
              >
                <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                Try again
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-card rounded-bl-sm border border-line bg-surface px-4 py-3">
            {message.content ? (
              <MarkdownBody content={message.content} onOpenSource={openByNumber} dark={dark} />
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Searching your documents…
              </p>
            )}

            {streaming && message.content && (
              <span
                aria-hidden="true"
                className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-text-bottom"
              />
            )}

            {!streaming && <SourceChips sources={sources} onOpenSource={openByNumber} />}

            {!streaming && message.notice && (
              <p className="mt-3 flex items-start gap-2 rounded-input border border-warning/40 bg-warning/10 px-3 py-2 text-2xs text-ink">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                <span>{message.notice}</span>
              </p>
            )}
          </div>
        )}

        {!streaming && !isError && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <CopyButton text={message.content || ''} />

            {onFeedback && !String(message.id).startsWith('temp-') && (
              <>
                <button
                  type="button"
                  onClick={() => onFeedback(message.id, 'up')}
                  aria-pressed={message.feedback === 'up'}
                  aria-label="This answer was helpful"
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-2xs transition-colors hover:bg-raised',
                    message.feedback === 'up' ? 'text-positive' : 'text-muted hover:text-ink',
                  )}
                >
                  <ThumbsUp aria-hidden="true" className="h-3 w-3" />
                  Helpful
                </button>
                <button
                  type="button"
                  onClick={() => onFeedback(message.id, 'down')}
                  aria-pressed={message.feedback === 'down'}
                  aria-label="This answer was not helpful"
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-2xs transition-colors hover:bg-raised',
                    message.feedback === 'down' ? 'text-danger' : 'text-muted hover:text-ink',
                  )}
                >
                  <ThumbsDown aria-hidden="true" className="h-3 w-3" />
                  Not helpful
                </button>
              </>
            )}

            {canRegenerate && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-2xs text-muted transition-colors hover:bg-raised hover:text-ink"
              >
                <RefreshCw aria-hidden="true" className="h-3 w-3" />
                Regenerate
              </button>
            )}

            <span className="ml-auto flex items-center gap-2 text-2xs text-muted">
              {message.retrieval_ms !== undefined && message.retrieval_ms !== null && (
                <span className="tabular-nums">retrieval {Math.round(message.retrieval_ms)} ms</span>
              )}
              {message.llm_ms !== undefined && message.llm_ms !== null && (
                <span className="tabular-nums">generation {Math.round(message.llm_ms)} ms</span>
              )}
              {message.model && <span className="hidden sm:inline">{message.model}</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export { linkifyCitations, normalizeCitations } from '../../lib/citations'

export default memo(MessageBubble)
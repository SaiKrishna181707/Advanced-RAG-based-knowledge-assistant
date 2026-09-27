/**
 * Chat workspace.
 *
 * Three regions: conversation history, the message stream, and the source
 * inspector (opened from a citation). On small screens the history becomes a
 * drawer and the inspector overlays.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessagesSquare, PanelLeftOpen, X } from 'lucide-react'
import clsx from 'clsx'
import { Button, Card, SectionHeader, Skeleton } from '../components/ui/Primitives'
import EmptyState from '../components/ui/EmptyState'
import MessageBubble from '../components/chat/MessageBubble'
import ChatInput from '../components/chat/ChatInput'
import ConversationList from '../components/chat/ConversationList'
import ScopeSelector from '../components/chat/ScopeSelector'
import FollowUps from '../components/chat/FollowUps'
import SourcePanel from '../components/SourcePanel'
import { useStore } from '../store'
import { useAuthStore } from '../store/authStore'
import { pluralize } from '../lib/format'

/**
 * Openers shown before the first question. The first two are built from the
 * documents that are actually indexed, so the suggestions stay relevant to the
 * knowledge base rather than being fixed marketing copy.
 */
function buildStarters(documents) {
  const derived = documents
    .filter((document) => document.status === 'ready')
    .slice(0, 2)
    .map((document) => `Summarise ${document.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')}`)

  const generic = [
    'What are the main findings?',
    'Which limitations or caveats are noted?',
    'Compare the recommendations side by side.',
  ]

  return [...derived, ...generic].slice(0, 4)
}


export default function ChatPage() {
  const documents = useStore((state) => state.documents)
  const documentsLoading = useStore((state) => state.documentsLoading)
  const loadDocuments = useStore((state) => state.loadDocuments)
  const loadCollections = useStore((state) => state.loadCollections)
  const loadConversations = useStore((state) => state.loadConversations)
  const loadPreferences = useStore((state) => state.loadPreferences)
  const preferences = useStore((state) => state.preferences)
  const loadUsage = useStore((state) => state.loadUsage)

  const messages = useStore((state) => state.messages)
  const isStreaming = useStore((state) => state.isStreaming)
  const streamError = useStore((state) => state.streamError)
  const ask = useStore((state) => state.ask)
  const stop = useStore((state) => state.stop)
  const sendFeedback = useStore((state) => state.sendFeedback)
  const currentConversationId = useStore((state) => state.currentConversationId)
  const conversations = useStore((state) => state.conversations)
  const setScope = useStore((state) => state.setScope)

  const [draft, setDraft] = useState('')
  const [source, setSource] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const scrollRef = useRef(null)
  const bottomRef = useRef(null)
  const pinnedRef = useRef(true)

  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    loadDocuments()
    loadCollections()
    loadConversations()
    loadPreferences()
    loadUsage()
  }, [loadDocuments, loadCollections, loadConversations, loadPreferences, loadUsage])

  // Apply the account's default scope once, before the first question.
  const appliedDefault = useRef(false)
  useEffect(() => {
    if (appliedDefault.current || !preferences || currentConversationId || messages.length) return
    appliedDefault.current = true
    if (preferences.default_scope === 'collection' && preferences.default_collection_id) {
      setScope({ mode: 'collection', collection_id: preferences.default_collection_id })
    }
  }, [preferences, currentConversationId, messages.length, setScope])

  // Track whether the user is reading history; only auto-scroll when they are not.
  const onScroll = () => {
    const node = scrollRef.current
    if (!node) return
    pinnedRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120
  }

  useEffect(() => {
    if (pinnedRef.current) bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  const readyCount = useMemo(
    () => documents.filter((document) => document.status === 'ready').length,
    [documents],
  )

  const starters = useMemo(() => buildStarters(documents), [documents])

  // An empty list means either "nothing uploaded" or "still fetching"; only the
  // first of those should claim the account has no documents.
  const documentsPending = documentsLoading && documents.length === 0

  const lastAssistantIndex = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'assistant') return index
    }
    return -1
  }, [messages])

  const submit = (question) => {
    setDraft('')
    pinnedRef.current = true
    ask(question)
  }

  const regenerate = () => {
    pinnedRef.current = true
    ask('', { regenerate: true })
  }

  const currentTitle =
    conversations.find((item) => item.id === currentConversationId)?.title || 'New conversation'

  return (
    <div className="flex h-full min-h-0">
      {/* History rail (desktop) */}
      <aside className="hidden w-72 shrink-0 border-r border-line bg-surface lg:flex lg:flex-col">
        <ConversationList />
      </aside>

      {/* History drawer (mobile) */}
      {historyOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={() => setHistoryOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col border-r border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <span className="text-sm font-medium text-ink">Conversations</span>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close conversation history"
                className="rounded-input p-1.5 text-muted hover:bg-raised hover:text-ink"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ConversationList />
            </div>
          </div>
        </div>
      )}

      {/* Conversation */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            aria-label="Open conversation history"
            className="rounded-input p-1.5 text-muted hover:bg-raised hover:text-ink lg:hidden"
          >
            <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
          </button>

          <span className="hidden min-w-0 flex-1 truncate text-sm text-muted sm:block" title={currentTitle}>
            {currentTitle}
          </span>

          <div className="ml-auto">
            <ScopeSelector />
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6"
        >
          <div
            className={clsx(
              'mx-auto w-full max-w-3xl space-y-5',
              messages.length === 0 && 'flex min-h-full flex-col justify-center',
            )}
          >
            {messages.length === 0 ? (
              <div className="py-6 text-center">
                <h2 className="text-lg font-semibold tracking-tight text-ink">
                  Ask your knowledge base
                </h2>
                <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
                  Answers come only from your documents, and every claim carries a citation you can
                  open.
                </p>

                {documentsPending ? (
                  <div className="mx-auto mt-7 flex max-w-2xl flex-wrap justify-center gap-2">
                    {[0, 1, 2, 3].map((index) => (
                      <Skeleton key={index} className="h-7 w-44 rounded-full" />
                    ))}
                  </div>
                ) : readyCount === 0 ? (
                  <EmptyState
                    className="mx-auto mt-7 max-w-lg text-left"
                    icon={MessagesSquare}
                    title="No processed documents yet"
                    description="Upload a document and wait for it to reach the ready state. Then this page will have something to answer from."
                    action={
                      <Link to="/app/documents" className="btn-primary">
                        Upload a document
                      </Link>
                    }
                  />
                ) : (
                  <>
                    <p className="mt-7 text-2xs font-medium uppercase tracking-wide text-muted">
                      Searching {pluralize(readyCount, 'document')} &middot; try one of these
                    </p>
                    <div className="mx-auto mt-3 flex max-w-2xl flex-wrap justify-center gap-2">
                      {starters.map((starter) => (
                        <button
                          key={starter}
                          type="button"
                          onClick={() => submit(starter)}
                          className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-ink"
                        >
                          {starter}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={message.id}>
                  <MessageBubble
                    message={message}
                    onOpenSource={setSource}
                    onFeedback={sendFeedback}
                    onRegenerate={regenerate}
                    onRetry={submit}
                    canRegenerate={
                      index === lastAssistantIndex && !isStreaming && !message.isError
                    }
                  />
                  {index === lastAssistantIndex &&
                    message.role === 'assistant' &&
                    !isStreaming &&
                    !message.isError &&
                    message.content && (
                      <FollowUps
                        messageId={message.id}
                        onSelect={submit}
                        disabled={isStreaming}
                      />
                    )}
                </div>
              ))
            )}

            {streamError && !isStreaming && (
              <p role="alert" className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                {streamError}
              </p>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-line bg-surface px-3 py-3 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <ChatInput
              value={draft}
              onValueChange={setDraft}
              onSend={submit}
              onStop={stop}
              isStreaming={isStreaming}
              disabled={readyCount === 0}
              placeholder={
                documentsPending
                  ? 'Loading your documents'
                  : readyCount === 0
                    ? 'Upload a document to start asking questions'
                    : `Ask a question, ${(user?.name || '').split(' ')[0] || 'there'}…`
              }
            />
            <p className="mt-2 text-center text-2xs text-muted">
              ALBATROSS answers only from your documents. Press Esc to stop generating.
            </p>
          </div>
        </div>
      </div>

      <SourcePanel open={Boolean(source)} source={source} onClose={() => setSource(null)} />
    </div>
  )
}
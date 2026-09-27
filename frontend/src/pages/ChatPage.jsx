/**
 * Chat workspace.
 *
 * Three regions: conversation history, the message stream, and the source
 * inspector (opened from a citation). On small screens the history becomes a
 * drawer and the inspector overlays.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessagesSquare, PanelLeftOpen, Sparkles, X } from 'lucide-react'
import clsx from 'clsx'
import { Button, Card, SectionHeader } from '../components/ui/Primitives'
import EmptyState from '../components/ui/EmptyState'
import MessageBubble from '../components/chat/MessageBubble'
import ChatInput from '../components/chat/ChatInput'
import ConversationList from '../components/chat/ConversationList'
import ScopeSelector from '../components/chat/ScopeSelector'
import FollowUps from '../components/chat/FollowUps'
import SourcePanel from '../components/SourcePanel'
import { useStore } from '../store'
import { useAuthStore } from '../store/authStore'

const STARTERS = [
  'Summarise the main argument of these documents.',
  'What methodology did they use?',
  'List the key findings with their sources.',
  'What limitations do the authors acknowledge?',
]

export default function ChatPage() {
  const documents = useStore((state) => state.documents)
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
          <div className="mx-auto w-full max-w-3xl space-y-5">
            {messages.length === 0 ? (
              <div className="pt-6">
                <div className="text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent/12 text-accent-ink">
                    <Sparkles aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <h2 className="mt-3 text-base font-semibold text-ink">
                    Ask your knowledge base a question
                  </h2>
                  <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
                    Answers are built only from passages retrieved out of your documents, and every
                    claim carries a citation you can open.
                  </p>
                </div>

                {readyCount === 0 ? (
                  <EmptyState
                    className="mt-6"
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
                  <div className="mx-auto mt-6 grid max-w-xl gap-2 sm:grid-cols-2">
                    {STARTERS.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => submit(starter)}
                        className="card-interactive px-3 py-2.5 text-left text-sm text-muted"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
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
                readyCount === 0
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
/**
 * Personal dashboard: counts, quick actions, recent documents and conversations,
 * usage against the current plan, and the activity timeline.
 */
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  FileText,
  FileUp,
  FolderPlus,
  MessageSquare,
  MessagesSquare,
  Search,
  Sparkles,
} from 'lucide-react'
import { Button, Card, SectionHeader, Skeleton, Stat, UsageMeter } from '../components/ui/Primitives'
import EmptyState from '../components/ui/EmptyState'
import { useStore } from '../store'
import { useAuthStore } from '../store/authStore'
import { describeActivity } from '../lib/activity'
import { relativeTime } from '../lib/format'

function QuickAction({ to, icon: Icon, label, detail, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="card-interactive flex items-start gap-3 p-4"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent-ink">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-xs text-muted">{detail}</span>
      </span>
    </Link>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const overview = useStore((state) => state.overview)
  const loading = useStore((state) => state.overviewLoading)
  const loadOverview = useStore((state) => state.loadOverview)
  const loadDocuments = useStore((state) => state.loadDocuments)
  const loadConversations = useStore((state) => state.loadConversations)
  const newConversation = useStore((state) => state.newConversation)
  const setScope = useStore((state) => state.setScope)

  useEffect(() => {
    loadOverview()
    loadDocuments()
    loadConversations()
  }, [loadOverview, loadDocuments, loadConversations])

  const counts = overview?.counts
  const usage = overview?.usage
  const name = (user?.name || '').split(' ')[0]

  const startConversation = () => {
    newConversation()
    setScope({ mode: 'all', collection_id: null, document_ids: [] })
    navigate('/app/chat')
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Welcome back{name ? `, ${name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Upload your documents, ask questions naturally, and get grounded answers with transparent
          sources.
        </p>
      </header>

      {/* Counts */}
      {loading && !counts ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-24 rounded-card" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Documents"
            value={counts?.documents ?? 0}
            icon={FileText}
            tone="accent"
            hint={counts?.documents ? 'Indexed and searchable' : 'None uploaded yet'}
          />
          <Stat
            label="Questions"
            value={counts?.questions ?? 0}
            icon={MessageSquare}
            tone="accent"
          />
          <Stat label="Collections" value={counts?.collections ?? 0} icon={FolderPlus} tone="accent" />
          <Stat
            label="Conversations"
            value={counts?.conversations ?? 0}
            icon={MessagesSquare}
            tone="accent"
          />
        </div>
      )}

      {/* Quick actions */}
      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="text-sm font-semibold text-ink">
          Quick actions
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            to="/app/documents"
            icon={FileUp}
            label="Upload document"
            detail="Build your knowledge base"
          />
          <QuickAction
            to="/app/chat"
            icon={MessageSquare}
            label="Start conversation"
            detail="Ask across all documents"
            onClick={startConversation}
          />
          <QuickAction
            to="/app/search"
            icon={Search}
            label="Search knowledge"
            detail="Hybrid search with filters"
          />
          <QuickAction
            to="/app/collections"
            icon={FolderPlus}
            label="Create collection"
            detail="Separate knowledge spaces"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Recent documents */}
        <Card className="p-4">
          <SectionHeader
            title="Recent documents"
            actions={
              <Link to="/app/documents" className="btn-ghost text-xs">
                All documents
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {(overview?.recent_documents || []).length === 0 ? (
            <EmptyState
              compact
              icon={FileText}
              title="No documents yet"
              description="Upload a PDF, text file, Markdown, DOCX or CSV to get started."
              action={
                <Button variant="primary" size="sm" onClick={() => navigate('/app/documents')}>
                  Upload a document
                </Button>
              }
              className="mt-4"
            />
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {(overview?.recent_documents || []).map((document) => (
                <li key={document.id} className="flex items-center gap-3 py-2.5">
                  <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
                  <Link
                    to="/app/documents"
                    className="min-w-0 flex-1 truncate text-sm text-ink hover:text-accent-ink hover:underline"
                  >
                    {document.name}
                  </Link>
                  <span className="shrink-0 text-2xs text-muted">
                    {document.chunk_count || 0} chunks · {relativeTime(document.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Usage */}
        <Card className="p-4">
          <SectionHeader
            title="Usage"
            description={usage ? `${usage.plan_name} plan · this month` : 'Loading…'}
            actions={
              <Link to="/app/settings" className="btn-ghost text-xs">
                Manage
              </Link>
            }
          />
          {usage ? (
            <div className="mt-4 space-y-4">
              <UsageMeter
                label="Documents"
                percent={usage.documents.percent}
                detail={usage.documents.label}
              />
              <UsageMeter
                label="Questions this month"
                percent={usage.questions.percent}
                detail={usage.questions.label}
              />
              <UsageMeter
                label="Storage"
                percent={usage.storage.percent}
                detail={usage.storage.label}
              />
              <p className="flex items-start gap-1.5 border-t border-line pt-3 text-2xs text-muted">
                <Sparkles aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                Retrieves up to {usage.limits.retrieval_top_k} passages per question on this plan.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Recent conversations */}
        <Card className="p-4">
          <SectionHeader
            title="Recent conversations"
            actions={
              <Link to="/app/chat" className="btn-ghost text-xs">
                Open chat
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {(overview?.recent_conversations || []).length === 0 ? (
            <EmptyState
              compact
              icon={MessagesSquare}
              title="No conversations yet"
              description="Ask your first question and the thread will appear here."
              className="mt-4"
            />
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {(overview?.recent_conversations || []).map((conversation) => (
                <li key={conversation.id}>
                  <Link
                    to="/app/chat"
                    className="flex items-center gap-3 py-2.5 hover:text-accent-ink"
                  >
                    <MessagesSquare aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">
                        {conversation.title || 'New conversation'}
                      </span>
                      <span className="block truncate text-2xs text-muted">
                        {conversation.last_message_preview || 'No messages yet'}
                      </span>
                    </span>
                    <span className="shrink-0 text-2xs text-muted">
                      {relativeTime(conversation.updated_at || conversation.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Activity */}
        <Card className="p-4">
          <SectionHeader
            title="Recent activity"
            actions={
              <Link to="/app/analytics" className="btn-ghost text-xs">
                <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" />
                Analytics
              </Link>
            }
          />
          {(overview?.activity || []).length === 0 ? (
            <p className="mt-4 text-sm text-muted">Your activity will appear here as you use ALBATROSS.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {(overview?.activity || []).map((entry) => {
                const activity = describeActivity(entry)
                const Icon = activity.icon
                return (
                  <li key={entry.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-raised text-muted">
                      {Icon ? <Icon aria-hidden="true" className="h-3 w-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-ink">{activity.label}</span>
                      {activity.detail && (
                        <span className="block truncate text-2xs text-muted">{activity.detail}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-2xs text-muted">
                      {relativeTime(entry.created_at)}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  )
}
/** Human labels for the activity events the backend records. */
import {
  CreditCard,
  FileUp,
  FolderPlus,
  KeyRound,
  ListChecks,
  MessageSquare,
  Search,
  ThumbsUp,
  Trash2,
  TriangleAlert,
  UserPlus,
} from 'lucide-react'

const EVENTS = {
  'user.signed_up': { label: 'Account created', icon: UserPlus },
  'user.password_changed': { label: 'Password changed', icon: KeyRound },
  'document.uploaded': { label: 'Document uploaded', icon: FileUp },
  'document.processed': { label: 'Document indexed', icon: ListChecks, tone: 'positive' },
  'document.failed': { label: 'Document failed', icon: TriangleAlert, tone: 'danger' },
  'document.deleted': { label: 'Document deleted', icon: Trash2 },
  'conversation.deleted': { label: 'Conversation deleted', icon: Trash2 },
  'question.asked': { label: 'Question asked', icon: MessageSquare },
  'collection.created': { label: 'Collection created', icon: FolderPlus },
  'collection.deleted': { label: 'Collection deleted', icon: Trash2 },
  'search.performed': { label: 'Search performed', icon: Search },
  'answer.rated': { label: 'Answer rated', icon: ThumbsUp },
  'subscription.changed': { label: 'Plan changed', icon: CreditCard },
}

function detailFor(event, metadata = {}) {
  if (metadata.name) return metadata.name
  if (metadata.title) return metadata.title
  if (metadata.query) return `“${metadata.query}”`
  if (metadata.plan) return `Plan: ${metadata.plan}`
  if (metadata.rating) return metadata.rating === 'up' ? 'Rated helpful' : 'Rated not helpful'
  if (metadata.email) return metadata.email
  return null
}

export function describeActivity(entry) {
  const meta = EVENTS[entry.event] || {}
  return {
    label: meta.label || entry.event?.replace(/[._]/g, ' ') || 'Activity',
    icon: meta.icon,
    tone: meta.tone || 'neutral',
    detail: detailFor(entry.event, entry.metadata),
  }
}
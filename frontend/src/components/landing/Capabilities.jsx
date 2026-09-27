import {
  BarChart3,
  FileStack,
  FolderTree,
  Gauge,
  Layers,
  ListFilter,
  MessagesSquare,
  Quote,
  Sparkles,
  Users,
} from 'lucide-react'
import { Section, SectionIntro } from './Section'

const CAPABILITIES = [
  {
    icon: FileStack,
    title: 'Multi-format ingestion',
    body: 'PDF, TXT, Markdown, DOCX and CSV. Every file is validated by extension and MIME type, hashed, and checked for duplicates.',
  },
  {
    icon: FolderTree,
    title: 'Collections as knowledge spaces',
    body: 'Group documents into Research Papers, College Notes, Projects or anything else. Chat and search inside one space, or across all of them.',
  },
  {
    icon: Layers,
    title: 'Hybrid retrieval',
    body: 'Dense vector similarity runs alongside BM25 keyword matching. The two rankings are fused, so exact terms and paraphrases both find their passage.',
  },
  {
    icon: Quote,
    title: 'Citations you can open',
    body: 'Answers carry numbered citations naming the document and page. Click one to read the retrieved passage and its relevance score.',
  },
  {
    icon: ListFilter,
    title: 'Search with real filters',
    body: 'Semantic, keyword or hybrid modes, narrowed by collection, document, upload date or page number, with snippets and relevance for each hit.',
  },
  {
    icon: MessagesSquare,
    title: 'Conversations with memory',
    body: 'Follow-up questions are interpreted with the earlier turns in mind, bounded to a sensible context window rather than the full history.',
  },
  {
    icon: BarChart3,
    title: 'Analytics that mean something',
    body: 'Documents, pages, chunks, questions, retrieval and generation latency, storage, failures, and which documents get asked about most.',
  },
  {
    icon: Users,
    title: 'Usage you can see',
    body: 'Live meters for documents, storage and monthly questions, driven by the same plan configuration the server enforces.',
  },
  {
    icon: Gauge,
    title: 'Visible processing',
    body: 'Watch each upload move through uploading, processing, indexing and ready — or fail with a message that says what to do next.',
  },
]

export default function Capabilities() {
  return (
    <Section id="capabilities" tone="surface" divider>
      <SectionIntro
        eyebrow="Core capabilities"
        title="Built for people who need to trust the answer"
        lede="Not a chat window bolted onto a search box. Every capability exists to make the retrieval inspectable."
      />

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((capability) => (
          <div key={capability.title} className="card p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/12 text-accent-ink">
              <capability.icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-ink">{capability.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{capability.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 flex items-start gap-2 text-xs text-muted">
        <Sparkles aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        <span>
          Answer style, retrieval depth and default collection are configurable per account in
          Settings, within what your plan allows.
        </span>
      </p>
    </Section>
  )
}
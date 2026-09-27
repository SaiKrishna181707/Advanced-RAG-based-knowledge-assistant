import { Bot, Database, HardDrive, Server, ShieldCheck } from 'lucide-react'
import { Section, SectionIntro } from './Section'

const LAYERS = [
  {
    icon: Database,
    title: 'MongoDB Atlas — application persistence',
    body: 'Users, documents, the chunks themselves, collections, conversations, messages, feedback, activity and usage counters. MongoDB is the source of truth: the vector index is derived data that can be rebuilt from it at any time.',
  },
  {
    icon: HardDrive,
    title: 'File storage — the original uploads',
    body: 'Original files are written through a single storage service, so local disk can be replaced with S3 or similar without touching the rest of the application.',
  },
  {
    icon: Server,
    title: 'Vector retrieval — per-user index',
    body: 'One FAISS IndexFlatIP per account over L2-normalised embeddings, with an exact NumPy inner-product backend when FAISS is unavailable. Indexes are built from MongoDB chunks and kept in a bounded cache.',
  },
  {
    icon: Bot,
    title: 'LLM — Groq',
    body: 'Answer generation runs on Groq (llama-3.3-70b-versatile by default). The model only ever sees the retrieved passages, plus the instructions that constrain it to them.',
  },
  {
    icon: ShieldCheck,
    title: 'Authentication — bearer tokens',
    body: 'Passwords are hashed with scrypt. Sessions are HS256 JWTs sent in an Authorization header, so the API and the frontend can live on different domains without cookie-sharing problems.',
  },
]

const PIPELINE = [
  { stage: 'Extract', detail: 'pdfplumber for PDF page text, python-docx for DOCX sections, row-aware parsing for CSV' },
  { stage: 'Chunk', detail: '500-character chunks on sentence boundaries with 50 characters of overlap; each chunk keeps its page' },
  { stage: 'Embed', detail: '1024-dimensional vectors, L2-normalised' },
  { stage: 'Index', detail: 'Per-user FAISS inner-product index, invalidated when the knowledge base changes' },
  { stage: 'Retrieve', detail: 'Dense candidates + BM25 candidates, fused with Reciprocal Rank Fusion (k=60)' },
  { stage: 'Answer', detail: 'Grounded prompt over the fused passages, streamed to the browser as it is generated' },
]

export default function Architecture() {
  return (
    <Section id="architecture" divider>
      <SectionIntro
        eyebrow="RAG architecture"
        title="What happens between your question and your answer"
        lede="The retrieval pipeline is conventional on purpose: each stage is simple enough to be reasoned about and inspected."
      />

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <ol className="space-y-0">
          {PIPELINE.map((step, index) => (
            <li key={step.stage} className="relative flex gap-4 pb-6 last:pb-0">
              <div className="flex flex-col items-center">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-2xs font-semibold text-accent-ink">
                  {index + 1}
                </span>
                {index < PIPELINE.length - 1 && (
                  <span className="mt-1 w-px flex-1 bg-line" aria-hidden="true" />
                )}
              </div>
              <div className="pb-1">
                <p className="text-sm font-semibold text-ink">{step.stage}</p>
                <p className="mt-0.5 text-sm text-muted">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="space-y-4">
          {LAYERS.map((layer) => (
            <div key={layer.title} className="card p-4">
              <div className="flex items-center gap-2">
                <layer.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
                <h3 className="text-sm font-semibold text-ink">{layer.title}</h3>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{layer.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 rounded-card border border-line bg-raised/60 p-5">
        <h3 className="text-sm font-semibold text-ink">On embeddings, honestly</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The default embedding provider is a deterministic feature-hashing model: it maps tokens
          and word bigrams into 1024 signed buckets using <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">blake2b</code>,
          then L2-normalises the result. It is lexical, not semantic, and it is the default because it
          needs no model download and fits a small container. Set{' '}
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">EMBEDDING_PROVIDER=sentence_transformers</code>{' '}
          to swap in a real semantic encoder — the interface is a small protocol, so no other code
          changes. BM25 in the hybrid ranking compensates for much of the lexical gap in the meantime.
        </p>
      </div>
    </Section>
  )
}
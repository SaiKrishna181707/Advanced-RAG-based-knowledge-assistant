/**
 * A static, faithful mock of the chat workspace.
 *
 * It is not a live widget — it is a picture of the real UI so a visitor knows
 * what they are signing up for. Text is illustrative, not fabricated analytics.
 */
import { ArrowUp, FileText, Quote } from 'lucide-react'
import { Badge } from '../ui/Primitives'

export default function ProductPreview() {
  return (
    <div className="card overflow-hidden shadow-lifted" role="img" aria-label="Preview of the ALBATROSS chat workspace showing a grounded answer with numbered sources">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-line bg-raised px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-caution/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-positive/50" />
        <span className="ml-3 truncate text-2xs text-muted">albatross — Research Papers</span>
      </div>

      <div className="grid gap-0 sm:grid-cols-[1.55fr_1fr]">
        {/* Conversation */}
        <div className="space-y-4 border-line p-4 sm:border-r">
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-card rounded-br-sm bg-accent px-3.5 py-2 text-sm text-accent-fg">
              Which dataset did they evaluate on, and how large was it?
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-2xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" />
              Scope: Research Papers · hybrid retrieval · 34 ms
            </div>
            <div className="max-w-[92%] space-y-2 rounded-card rounded-bl-sm border border-line bg-surface px-3.5 py-3 text-sm text-ink">
              <p>
                The model was evaluated on the MIMIC-III clinical dataset, restricted to 12,480
                admission records after filtering.
                <button type="button" className="mx-0.5 rounded border border-accent/40 bg-accent/10 px-1 align-middle text-2xs font-medium text-accent-ink">
                  1
                </button>
                They report a held-out split of 20%.
                <button type="button" className="mx-0.5 rounded border border-accent/40 bg-accent/10 px-1 align-middle text-2xs font-medium text-accent-ink">
                  2
                </button>
              </p>
              <p className="text-xs text-muted">
                Answer drawn from 2 passages across 1 document.
              </p>
            </div>
          </div>

          {/* Composer */}
          <div className="flex items-end gap-2 rounded-card border border-line bg-surface p-2">
            <span className="flex-1 px-1 py-1.5 text-sm text-muted">Ask a follow-up…</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-input bg-accent text-accent-fg">
              <ArrowUp aria-hidden="true" className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* Sources */}
        <div className="space-y-3 bg-raised/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted">Sources</span>
            <Badge tone="accent">2 passages</Badge>
          </div>

          {[
            { n: 1, name: 'MIMIC-III-Study.pdf', page: 'Page 7', score: '0.87' },
            { n: 2, name: 'MIMIC-III-Study.pdf', page: 'Page 12', score: '0.74' },
          ].map((source) => (
            <div key={source.n} className="rounded-card border border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/12 text-2xs font-semibold text-accent-ink">
                  {source.n}
                </span>
                <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="min-w-0 truncate text-xs font-medium text-ink">{source.name}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-2xs text-muted">
                <span>{source.page}</span>
                <span className="tabular-nums">relevance {source.score}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-2xs leading-relaxed text-muted">
                “We restrict the cohort to 12,480 admissions with at least two recorded
                observations…”
              </p>
            </div>
          ))}

          <div className="flex items-start gap-2 rounded-card border border-dashed border-line p-3">
            <Quote aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <p className="text-2xs text-muted">
              Open any citation to read the exact retrieved passage before you trust the answer.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
import { FileCheck2, FileSpreadsheet, FileText, FileType2, Quote, ScanLine } from 'lucide-react'
import { Section, SectionIntro } from './Section'

const FORMATS = [
  { icon: FileText, ext: 'PDF', detail: 'Page text via pdfplumber', citation: 'Cited by page' },
  { icon: FileType2, ext: 'DOCX', detail: 'Paragraphs via python-docx', citation: 'Cited by section' },
  { icon: FileSpreadsheet, ext: 'CSV', detail: 'Header-aware row parsing', citation: 'Cited by row block' },
  { icon: FileText, ext: 'Markdown', detail: 'Headings and body text', citation: 'Cited by section' },
  { icon: FileText, ext: 'TXT', detail: 'Plain text, encoding-aware', citation: 'Cited by section' },
]

export default function Trust() {
  return (
    <Section tone="surface" divider>
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div id="transparency" className="scroll-mt-24">
          <SectionIntro
            eyebrow="Source transparency"
            title="The citation is the product"
            lede="A confident sentence is worthless if you cannot check it. ALBATROSS treats every claim as something you should be able to open."
          />

          <div className="mt-8 space-y-4">
            <div className="card p-5">
              <p className="text-2xs font-semibold uppercase tracking-wide text-muted">In the answer</p>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                Retention improved by 4.2 points over the baseline.
                <span className="mx-1 inline-flex items-center rounded border border-accent/40 bg-accent/10 px-1.5 text-2xs font-medium text-accent-ink">
                  1
                </span>
                The gain was not statistically significant once site fixed effects were included.
                <span className="mx-1 inline-flex items-center rounded border border-accent/40 bg-accent/10 px-1.5 text-2xs font-medium text-accent-ink">
                  3
                </span>
              </p>
            </div>

            <div className="card p-5">
              <p className="text-2xs font-semibold uppercase tracking-wide text-muted">
                In the source panel
              </p>
              <ul className="mt-3 space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/12 text-2xs font-semibold text-accent-ink">
                    1
                  </span>
                  <span className="text-muted">
                    <span className="font-medium text-ink">Trial-Results-2025.pdf</span> · Page 14 ·
                    relevance 0.91
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/12 text-2xs font-semibold text-accent-ink">
                    3
                  </span>
                  <span className="text-muted">
                    <span className="font-medium text-ink">Trial-Results-2025.pdf</span> · Page 22 ·
                    relevance 0.78
                  </span>
                </li>
              </ul>
              <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
                Open either one to read the exact retrieved text before you rely on the answer.
              </p>
            </div>

            <p className="flex items-start gap-2 text-xs text-muted">
              <Quote aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <span>
                When the retrieved passages do not contain the answer, the assistant says so
                instead of improvising.
              </span>
            </p>
          </div>
        </div>

        <div id="documents" className="scroll-mt-24">
          <SectionIntro
            eyebrow="Document workflow"
            title="What you can actually upload"
            lede="Only formats the backend can extract reliably are accepted. Unsupported files are rejected at upload with a clear reason."
          />

          <ul className="mt-8 space-y-3">
            {FORMATS.map((format) => (
              <li key={format.ext} className="card flex items-start gap-4 p-4">
                <span className="flex h-9 w-11 shrink-0 items-center justify-center rounded-lg bg-raised">
                  <format.icon aria-hidden="true" className="h-4 w-4 text-accent" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-semibold text-ink">{format.ext}</p>
                    <span className="text-xs text-muted">{format.detail}</span>
                  </div>
                </div>
                <span className="shrink-0 self-center rounded-full border border-line bg-raised px-2 py-0.5 text-2xs text-muted">
                  {format.citation}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="card p-4">
              <FileCheck2 aria-hidden="true" className="h-4 w-4 text-accent" />
              <p className="mt-2.5 text-sm font-medium text-ink">Duplicate detection</p>
              <p className="mt-1 text-xs text-muted">
                Files are hashed on upload. Uploading the same file twice returns
                “Document already exists.”
              </p>
            </div>
            <div className="card p-4">
              <ScanLine aria-hidden="true" className="h-4 w-4 text-accent" />
              <p className="mt-2.5 text-sm font-medium text-ink">Processing states</p>
              <p className="mt-1 text-xs text-muted">
                Uploading, processing, indexing, ready — or failed, with the reason stored and shown.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
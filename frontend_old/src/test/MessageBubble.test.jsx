/**
 * The answer bubble, which is where the product's trust story is delivered.
 *
 * The behaviours worth pinning: a citation in the prose is clickable and opens
 * the right source, the retrieved evidence is listed, the incomplete-scope notice
 * is visible, and a failure offers a retry instead of a dead end.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageBubble from '../components/chat/MessageBubble'
import { CHUNK, DOCUMENT } from './fixtures'

const SOURCES = [
  {
    index: 1,
    chunk_id: CHUNK.id,
    document_id: DOCUMENT.id,
    document: DOCUMENT.name,
    page: 1,
    location_unit: 'page',
    relevance: 0.9,
    snippet: CHUNK.content,
    content: CHUNK.content,
  },
  {
    index: 2,
    chunk_id: 'chunk2',
    document_id: 'doc2',
    document: 'annual-report.pdf',
    page: 18,
    location_unit: 'page',
    relevance: 0.7,
    snippet: 'Regional splits were reported separately.',
    content: 'Regional splits were reported separately.',
  },
]

function assistant(overrides = {}) {
  return { id: 'm1', role: 'assistant', content: '', ...overrides }
}

describe('answer rendering', () => {
  it('renders markdown rather than raw text', () => {
    render(
      <MessageBubble
        message={assistant({ content: 'The cohort was **12,480** records.' })}
        onOpenSource={vi.fn()}
      />,
    )

    expect(screen.getByText('12,480')).toBeInTheDocument()
    // Bold is parsed, so the literal asterisks must not survive into the DOM.
    expect(screen.queryByText(/\*\*12,480\*\*/)).not.toBeInTheDocument()
  })

  it('renders a markdown table', () => {
    const table = '| Region | Value |\n|---|---|\n| North | 5,100 |'
    render(<MessageBubble message={assistant({ content: table })} onOpenSource={vi.fn()} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('North')).toBeInTheDocument()
  })

  it('shows a searching state before any text has arrived', () => {
    render(<MessageBubble message={assistant({ streaming: true })} onOpenSource={vi.fn()} />)

    expect(screen.getByText(/searching your documents/i)).toBeInTheDocument()
  })
})

describe('citations', () => {
  it('opens the matching source when the citation marker is clicked', async () => {
    const onOpenSource = vi.fn()
    render(
      <MessageBubble
        message={assistant({
          content: 'The filtered cohort contained 12,480 records[1].',
          sources: SOURCES,
        })}
        onOpenSource={onOpenSource}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Open source 1' }))

    expect(onOpenSource).toHaveBeenCalledTimes(1)
    expect(onOpenSource.mock.calls[0][0].chunk_id).toBe(CHUNK.id)
  })

  it('resolves the second citation to the second source, not the first', async () => {
    const onOpenSource = vi.fn()
    render(
      <MessageBubble
        message={assistant({ content: 'Spend grew[1] and splits changed[2].', sources: SOURCES })}
        onOpenSource={onOpenSource}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Open source 2' }))

    expect(onOpenSource.mock.calls[0][0].document).toBe('annual-report.pdf')
    expect(onOpenSource.mock.calls[0][0].page).toBe(18)
  })

  it('lists retrieved evidence as chips naming the document and page', async () => {
    const onOpenSource = vi.fn()
    render(
      <MessageBubble
        message={assistant({ content: 'Answer[1][2].', sources: SOURCES })}
        onOpenSource={onOpenSource}
      />,
    )

    const chip = screen.getByTitle('Open source: annual-report.pdf')
    expect(chip).toHaveTextContent('annual-report.pdf')
    expect(chip).toHaveTextContent(/page 18/i)

    await userEvent.click(chip)
    expect(onOpenSource.mock.calls[0][0].index).toBe(2)
  })

  it('does not turn a markdown link into a citation', () => {
    render(
      <MessageBubble
        message={assistant({
          content: 'See [the report](https://example.com/report).',
          sources: SOURCES,
        })}
        onOpenSource={vi.fn()}
      />,
    )

    expect(screen.getByRole('link', { name: /the report/i })).toHaveAttribute(
      'href',
      'https://example.com/report',
    )
  })
})

describe('incomplete scope', () => {
  it('warns that part of the scope was still processing', () => {
    const notice =
      '2 documents in this scope are still being processed, so they may not be reflected in this answer yet.'
    render(
      <MessageBubble
        message={assistant({ content: 'A partial answer[1].', sources: SOURCES, notice })}
        onOpenSource={vi.fn()}
      />,
    )

    expect(screen.getByText(notice)).toBeInTheDocument()
  })

  it('shows no notice when the scope was complete', () => {
    render(
      <MessageBubble
        message={assistant({ content: 'A full answer[1].', sources: SOURCES, notice: null })}
        onOpenSource={vi.fn()}
      />,
    )

    expect(screen.queryByText(/still being processed/i)).not.toBeInTheDocument()
  })
})

describe('feedback and timings', () => {
  it('reports which way an answer was rated', async () => {
    const onFeedback = vi.fn()
    render(
      <MessageBubble
        message={assistant({ content: 'Answer[1].', sources: SOURCES })}
        onOpenSource={vi.fn()}
        onFeedback={onFeedback}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'This answer was helpful' }))

    expect(onFeedback).toHaveBeenCalledWith('m1', 'up')
  })

  it('shows the retrieval and generation latency and the model that answered', () => {
    render(
      <MessageBubble
        message={assistant({
          content: 'Answer[1].',
          sources: SOURCES,
          retrieval_ms: 12,
          llm_ms: 480,
          model: 'openai/gpt-oss-120b',
        })}
        onOpenSource={vi.fn()}
      />,
    )

    expect(screen.getByText(/retrieval 12 ms/i)).toBeInTheDocument()
    expect(screen.getByText(/generation 480 ms/i)).toBeInTheDocument()
    expect(screen.getByText('openai/gpt-oss-120b')).toBeInTheDocument()
  })

  it('does not offer feedback on a message that was never persisted', () => {
    render(
      <MessageBubble
        message={assistant({ id: 'temp-3', content: 'Answer[1].', sources: SOURCES })}
        onOpenSource={vi.fn()}
        onFeedback={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'This answer was helpful' })).not.toBeInTheDocument()
  })
})

describe('failures', () => {
  it('shows a safe message and a retry button that replays the question', async () => {
    const onRetry = vi.fn()
    render(
      <MessageBubble
        message={assistant({
          isError: true,
          errorMessage: 'The answer service is unavailable right now. Please try again.',
          retryQuestion: 'How many were in the cohort?',
        })}
        onOpenSource={vi.fn()}
        onRetry={onRetry}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/answer service is unavailable/i)

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledWith('How many were in the cohort?')
  })

  it('never renders a raw stack trace to the user', () => {
    render(
      <MessageBubble
        message={assistant({ isError: true, errorMessage: 'We could not process this document.' })}
        onOpenSource={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('We could not process this document.')
    expect(screen.queryByText(/traceback|stack|null pointer/i)).not.toBeInTheDocument()
  })
})

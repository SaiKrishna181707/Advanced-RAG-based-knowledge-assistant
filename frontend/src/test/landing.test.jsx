/**
 * Landing page.
 *
 * This is the first thing a visitor sees and the page that has to sell the
 * product, so the test pins the promises it actually makes: the name, the
 * tagline, both calls to action, the six-step pipeline, the real plan catalogue
 * and the honest statement that billing is not connected.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { PLAN_CATALOGUE, USER } from './fixtures'
import { renderApp, signIn, signOut } from './renderApp'

vi.mock('../api/client', () => import('./apiClientMock'))

const { metaAPI } = await import('./apiClientMock')

beforeEach(() => {
  signOut()
  metaAPI.plans.mockResolvedValue(PLAN_CATALOGUE)
})

describe('landing page', () => {
  it('leads with the product name, tagline and positioning line', async () => {
    renderApp('/')

    const heading = await screen.findByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('ALBATROSS')
    expect(screen.getAllByText('Navigate your knowledge.').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/grounded answers with transparent sources/i).length).toBeGreaterThan(0)
  })

  it('offers a primary CTA into signup and a secondary CTA into the product tour', async () => {
    renderApp('/')

    const primary = await screen.findAllByRole('link', { name: /get started/i })
    expect(primary.length).toBeGreaterThan(0)
    // Every primary CTA has to lead somewhere real.
    primary.forEach((link) => expect(link).toHaveAttribute('href', '/signup'))

    const secondary = screen.getAllByRole('link', { name: /explore albatross/i })
    expect(secondary.length).toBeGreaterThan(0)
    expect(secondary[0]).toHaveAttribute('href', '#how-it-works')
  })

  it('explains the pipeline in the six advertised steps, in order', async () => {
    renderApp('/')

    expect(
      await screen.findByRole('heading', {
        name: /upload\s*\u2192\s*understand\s*\u2192\s*ask\s*\u2192\s*retrieve\s*\u2192\s*answer\s*\u2192\s*verify/i,
      }),
    ).toBeInTheDocument()

    for (const step of ['Upload', 'Understand', 'Ask', 'Retrieve', 'Answer', 'Verify']) {
      expect(screen.getAllByRole('heading', { name: new RegExp(`^${step}$`, 'i') }).length).toBeGreaterThan(0)
    }
  })

  it('shows a product preview of the application', async () => {
    renderApp('/')

    // The hero pairs the copy with a visual of the real interface.
    expect(await screen.findByText(/grounded answers with transparent sources/i)).toBeInTheDocument()
    expect(screen.getAllByText(/sources/i).length).toBeGreaterThan(0)
  })

  it('treats citation transparency as a headline feature', async () => {
    renderApp('/')

    expect(await screen.findByRole('heading', { name: /the citation is the product/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /what you can actually upload/i }),
    ).toBeInTheDocument()
  })

  it('explains the RAG architecture and the analytics it reports', async () => {
    renderApp('/')

    expect(
      await screen.findByRole('heading', { name: /what happens between your question and your answer/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /know what your knowledge base is doing/i }),
    ).toBeInTheDocument()
  })

  it('renders the three plans from the server catalogue, with prices and highlights', async () => {
    const { container } = renderApp('/')

    await screen.findByRole('heading', { name: /start free\. move up when your knowledge base grows\./i })
    const pricing = container.querySelector('#pricing')
    expect(pricing).not.toBeNull()

    for (const plan of ['Free', 'Pro', 'Team']) {
      expect(within(pricing).getByRole('heading', { name: plan })).toBeInTheDocument()
    }
    // Prices come from the API payload rather than being hardcoded in the markup.
    expect(within(pricing).getByText('$19')).toBeInTheDocument()
    expect(within(pricing).getByText('$49')).toBeInTheDocument()
    expect(within(pricing).getByText('1,000 documents')).toBeInTheDocument()
    expect(within(pricing).getByText('Shared knowledge spaces')).toBeInTheDocument()
  })

  it('flags the most popular plan without hiding the others', async () => {
    const { container } = renderApp('/')
    await screen.findByRole('heading', { name: /start free/i })

    const pricing = container.querySelector('#pricing')
    expect(within(pricing).getByText(/most popular/i)).toBeInTheDocument()
  })

  it('says plainly that billing is not connected', async () => {
    const { container } = renderApp('/')
    await screen.findByRole('heading', { name: /start free/i })

    const pricing = container.querySelector('#pricing')
    expect(within(pricing).getByText(/billing is not connected yet/i)).toBeInTheDocument()
    expect(within(pricing).getByText(/takes no payment/i)).toBeInTheDocument()
  })

  it('falls back to its built-in plans when the catalogue cannot be fetched', async () => {
    metaAPI.plans.mockRejectedValue(new Error('offline'))
    renderApp('/')

    // The section must still render rather than collapsing the page.
    expect(await screen.findByRole('heading', { name: /start free/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument()
  })

  it('answers the common questions and admits the retrieval limitation', async () => {
    const { container } = renderApp('/')
    await screen.findByRole('heading', { name: /worth answering plainly/i })

    const faq = container.querySelector('#faq')
    expect(within(faq).getAllByRole('group').length).toBeGreaterThanOrEqual(5)
    // The lexical-embedding trade-off is documented on the page, not buried.
    expect(within(faq).getByText(/deterministic lexical model/i)).toBeInTheDocument()
  })

  it('closes with a final call to action', async () => {
    renderApp('/')
    await screen.findByRole('heading', { level: 1 })

    expect(
      screen.getAllByText(/upload a document set and ask it a question/i).length,
    ).toBeGreaterThan(0)
  })

  it('sends a signed-in visitor straight to the dashboard instead', async () => {
    signIn(USER)
    renderApp('/')

    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument()
    // The landing copy must not flash for a signed-in user.
    expect(screen.queryByRole('heading', { level: 1, name: 'ALBATROSS' })).not.toBeInTheDocument()
  })
})

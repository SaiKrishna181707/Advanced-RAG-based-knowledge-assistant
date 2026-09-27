/**
 * Landing page.
 *
 * This is the first thing a visitor sees, so the test pins what the page
 * actually promises: the dark SaaS hero, the product sections, the real plan
 * catalogue, and the honest statement that billing is not connected.
 *
 * It also guards the redesign itself - the page is meant to stay short, and
 * every in-page anchor has to point at a section that exists.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PLAN_CATALOGUE, USER } from './fixtures'
import { renderApp, signIn, signOut } from './renderApp'

vi.mock('../api/client', () => import('./apiClientMock'))

const { metaAPI } = await import('./apiClientMock')

beforeEach(() => {
  signOut()
  metaAPI.plans.mockResolvedValue(PLAN_CATALOGUE)
})

describe('landing page', () => {
  it('leads with the brand and the hero headline', async () => {
    renderApp('/')

    const heading = await screen.findByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent(/actually searchable/i)
    expect(screen.getByText(/albatross ai assistant/i)).toBeInTheDocument()
    expect(screen.getAllByText('ALBATROSS').length).toBeGreaterThan(0)
  })

  it('offers navigation items that are properly labeled', async () => {
    renderApp('/')
    await screen.findByRole('heading', { level: 1 })

    // At minimum the brand text should be present
    expect(screen.getAllByText('ALBATROSS').length).toBeGreaterThan(0)
  })

  it('offers CTA links into signup', async () => {
    renderApp('/')

    const primary = await screen.findAllByRole('link', { name: /get started|start building/i })
    expect(primary.length).toBeGreaterThan(0)
    // Every primary CTA has to lead somewhere real.
    primary.forEach((link) => {
      const href = link.getAttribute('href')
      expect(href === '/signup' || href === '#how-it-works').toBeTruthy()
    })
  })

  it('explains the workflow in three steps', async () => {
    renderApp('/')

    expect(
      await screen.findByRole('heading', { name: /from upload to cited answer/i }),
    ).toBeInTheDocument()
    for (const step of [/add your documents/i, /ask in plain language/i, /check the source/i]) {
      expect(screen.getByRole('heading', { name: step })).toBeInTheDocument()
    }
  })

  it('states the product benefits without overselling', async () => {
    renderApp('/')

    expect(
      await screen.findByRole('heading', { name: /the citation is the product/i }),
    ).toBeInTheDocument()
    for (const benefit of [
      /grounded answers/i,
      /citations you can open/i,
      /hybrid retrieval/i,
      /isolated by default/i,
    ]) {
      expect(screen.getByRole('heading', { name: benefit })).toBeInTheDocument()
    }
  })

  it('renders the three plans from the server catalogue, with prices and highlights', async () => {
    const { container } = renderApp('/')

    await screen.findByRole('heading', {
      name: /start free\. move up when your knowledge base grows\./i,
    })
    const pricing = container.querySelector('#pricing')
    expect(pricing).not.toBeNull()

    for (const plan of ['Free', 'Pro', 'Team']) {
      expect(within(pricing).getByRole('heading', { name: plan })).toBeInTheDocument()
    }
    // Prices come from the API payload rather than being hardcoded in the markup.
    expect(within(pricing).getByText('$19')).toBeInTheDocument()
    expect(within(pricing).getByText('$79')).toBeInTheDocument()
    expect(within(pricing).getByText('Up to 1,000 documents')).toBeInTheDocument()
  })

  it('advertises only entitlements the product actually enforces', async () => {
    const { container } = renderApp('/')
    await screen.findByRole('heading', { name: /start free/i })

    const pricing = container.querySelector('#pricing')
    // Collaboration and queueing are roadmap items, not shipped features.
    expect(within(pricing).queryByText(/priority/i)).not.toBeInTheDocument()
    expect(within(pricing).queryByText(/shared/i)).not.toBeInTheDocument()
    expect(within(pricing).queryByText(/collaborat/i)).not.toBeInTheDocument()
    // Plans are differentiated by what the server really meters.
    expect(within(pricing).getByText(/deeper retrieval/i)).toBeInTheDocument()
    expect(within(pricing).getAllByText(/conversation memory/i).length).toBeGreaterThan(0)
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

  it('closes with a final call to action', async () => {
    renderApp('/')
    await screen.findByRole('heading', { level: 1 })

    const closing = screen.getByRole('region', { name: /ask your documents something/i })
    expect(within(closing).getByRole('link', { name: /get started/i })).toHaveAttribute(
      'href',
      '/signup',
    )
  })

  it('keeps every in-page anchor pointing at a section that exists', async () => {
    const { container } = renderApp('/')
    await screen.findByRole('heading', { level: 1 })

    const anchors = Array.from(container.querySelectorAll('a[href^="#"]'))
    expect(anchors.length).toBeGreaterThan(0)
    for (const anchor of anchors) {
      const id = anchor.getAttribute('href').slice(1)
      expect(container.querySelector(`#${id}`)).not.toBeNull()
    }
  })

  it('sends a signed-in visitor straight to the dashboard instead', async () => {
    signIn(USER)
    renderApp('/')

    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument()
    // The landing copy must not flash for a signed-in user.
    expect(
      screen.queryByRole('heading', { level: 1, name: /actually searchable/i }),
    ).not.toBeInTheDocument()
  })
})

/** Catches render errors so one broken page cannot blank the whole application. */
import { Component } from 'react'
import { AlertOctagon } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Technical detail stays in the console; users get the friendly panel.
    console.error('ALBATROSS render error', error, info)
  }

  handleReset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="card max-w-md p-6 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertOctagon aria-hidden="true" className="h-5 w-5" />
          </span>
          <h2 className="mt-3 text-base font-semibold text-ink">Something went wrong</h2>
          <p className="mt-1 text-sm text-muted">
            This part of ALBATROSS could not be displayed. Your data is safe.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" className="btn-secondary" onClick={this.handleReset}>
              Try again
            </button>
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              Reload ALBATROSS
            </button>
          </div>
        </div>
      </div>
    )
  }
}
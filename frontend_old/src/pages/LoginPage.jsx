import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import FieldError from '../components/auth/FieldError'
import { Button } from '../components/ui/Primitives'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((state) => state.login)
  const isSubmitting = useAuthStore((state) => state.isSubmitting)
  const serverError = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)

  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    clearError()
  }, [clearError])

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (!values.email.trim()) next.email = 'Enter your email address.'
    if (!values.password) next.password = 'Enter your password.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return
    try {
      await login({ email: values.email.trim(), password: values.password })
      const from = location.state?.from
      navigate(from && from.startsWith('/app') ? from : '/app', { replace: true })
    } catch {
      /* the store already holds a safe message */
    }
  }

  return (
    <AuthLayout
      title="Sign in to ALBATROSS"
      subtitle="Continue to your knowledge base."
      footer={
        <>
          New to ALBATROSS?{' '}
          <Link to="/signup" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && (
          <div role="alert" className="rounded-input border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {serverError}
          </div>
        )}

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            className="input"
            value={values.email}
            onChange={update('email')}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            placeholder="you@example.com"
          />
          <FieldError id="email-error">{errors.email}</FieldError>
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="input"
            value={values.password}
            onChange={update('password')}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            placeholder="Your password"
          />
          <FieldError id="password-error">{errors.password}</FieldError>
        </div>

        <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
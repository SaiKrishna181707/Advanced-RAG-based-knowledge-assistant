import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import FieldError from '../components/auth/FieldError'
import { Button } from '../components/ui/Primitives'
import { useAuthStore } from '../store/authStore'

/** Mirrors the server rules in routes/auth.py so the user is not surprised on submit. */
function passwordProblem(password) {
  if (!password) return 'Choose a password.'
  if (password.length < 8) return 'Use at least 8 characters.'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Include at least one letter and one number.'
  }
  return null
}

export default function SignupPage() {
  const navigate = useNavigate()
  const signup = useAuthStore((state) => state.signup)
  const isSubmitting = useAuthStore((state) => state.isSubmitting)
  const serverError = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)

  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    clearError()
  }, [clearError])

  const strength = useMemo(() => {
    const password = values.password
    if (!password) return null
    let score = 0
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1
    if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1
    return Math.min(score, 4)
  }, [values.password])

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (values.name.trim().length < 2) next.name = 'Enter your name (at least 2 characters).'
    if (!/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(values.email.trim())) {
      next.email = 'Enter a valid email address.'
    }
    const problem = passwordProblem(values.password)
    if (problem) next.password = problem
    if (values.confirm !== values.password) next.confirm = 'The passwords do not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return
    try {
      await signup({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      navigate('/app', { replace: true })
    } catch {
      /* the store already holds a safe message */
    }
  }

  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']

  return (
    <AuthLayout
      title="Create your ALBATROSS account"
      subtitle="Start with the Free plan. No card required."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
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
          <label htmlFor="name" className="label">
            Name
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            className="input"
            value={values.name}
            onChange={update('name')}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            placeholder="Ada Lovelace"
          />
          <FieldError id="name-error">{errors.name}</FieldError>
        </div>

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
            autoComplete="new-password"
            required
            className="input"
            value={values.password}
            onChange={update('password')}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-hint password-error"
            placeholder="At least 8 characters"
          />
          {strength !== null && (
            <div className="mt-2 flex items-center gap-2" aria-hidden="true">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={
                      index < strength
                        ? strength <= 1
                          ? 'h-1 flex-1 rounded-full bg-danger'
                          : strength === 2
                            ? 'h-1 flex-1 rounded-full bg-caution'
                            : 'h-1 flex-1 rounded-full bg-positive'
                        : 'h-1 flex-1 rounded-full bg-line'
                    }
                  />
                ))}
              </div>
              <span className="text-2xs text-muted">{strengthLabels[strength]}</span>
            </div>
          )}
          <p id="password-hint" className="mt-1.5 text-xs text-muted">
            At least 8 characters, with one letter and one number.
          </p>
          <FieldError id="password-error">{errors.password}</FieldError>
        </div>

        <div>
          <label htmlFor="confirm" className="label">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            name="confirm"
            autoComplete="new-password"
            required
            className="input"
            value={values.confirm}
            onChange={update('confirm')}
            aria-invalid={Boolean(errors.confirm)}
            aria-describedby={errors.confirm ? 'confirm-error' : undefined}
          />
          <FieldError id="confirm-error">{errors.confirm}</FieldError>
        </div>

        <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full">
          Create account
        </Button>

        <p className="text-xs text-muted">
          Your documents stay private to your account. You can export or delete everything from
          Settings at any time.
        </p>
      </form>
    </AuthLayout>
  )
}
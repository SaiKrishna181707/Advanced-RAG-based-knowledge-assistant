/**
 * Settings: profile, appearance, AI behaviour, knowledge defaults and account.
 *
 * Limits shown here (max retrieval depth, plan name) come from the server's
 * preference options and usage summary, so the UI cannot advertise more than the
 * account is allowed.
 */
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CreditCard,
  Download,
  Files,
  KeyRound,
  Monitor,
  Moon,
  Palette,
  Sun,
  User,
} from 'lucide-react'
import clsx from 'clsx'
import { Badge, Button, Card, SectionHeader, UsageMeter } from '../components/ui/Primitives'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { useStore } from '../store'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/theme'
import { authAPI, metaAPI } from '../api/client'
import { formatDate, initials } from '../lib/format'

const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'ai', label: 'AI', icon: Check },
  { key: 'knowledge', label: 'Knowledge', icon: Files },
  { key: 'account', label: 'Account', icon: CreditCard },
]

function Feedback({ tone = 'success', children }) {
  return (
    <p
      role="status"
      className={clsx(
        'rounded-input border px-3 py-2 text-sm',
        tone === 'success'
          ? 'border-positive/40 bg-positive/10 text-positive'
          : 'border-danger/40 bg-danger/10 text-danger',
      )}
    >
      {children}
    </p>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState('profile')

  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const logout = useAuthStore((state) => state.logout)

  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)

  const usage = useStore((state) => state.usage)
  const loadUsage = useStore((state) => state.loadUsage)
  const loadOverview = useStore((state) => state.loadOverview)
  const preferences = useStore((state) => state.preferences)
  const preferenceOptions = useStore((state) => state.preferenceOptions)
  const loadPreferences = useStore((state) => state.loadPreferences)
  const savePreferences = useStore((state) => state.savePreferences)
  const changePlan = useStore((state) => state.changePlan)
  const collections = useStore((state) => state.collections)
  const loadCollections = useStore((state) => state.loadCollections)
  const addToast = useStore((state) => state.addToast)

  const [profile, setProfile] = useState({ name: '', avatar_color: '#0d7d70' })
  const [profileError, setProfileError] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)

  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' })
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [prefs, setPrefs] = useState(null)
  const [prefsError, setPrefsError] = useState(null)
  const [prefsSaving, setPrefsSaving] = useState(false)

  const [plans, setPlans] = useState([])
  const [deleting, setDeleting] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadUsage()
    loadPreferences()
    loadCollections()
    metaAPI.plans().then((data) => setPlans(data.plans || [])).catch(() => {})
  }, [loadUsage, loadPreferences, loadCollections])

  useEffect(() => {
    if (user) setProfile({ name: user.name || '', avatar_color: user.avatar_color || '#0d7d70' })
  }, [user])

  useEffect(() => {
    if (preferences) setPrefs(preferences)
  }, [preferences])

  const saveProfile = async (event) => {
    event.preventDefault()
    setProfileSaving(true)
    setProfileError(null)
    try {
      const data = await authAPI.updateProfile(profile)
      setUser(data.user)
      addToast('Profile updated.', 'success')
    } catch (error) {
      setProfileError(error.message)
    } finally {
      setProfileSaving(false)
    }
  }

  const savePassword = async (event) => {
    event.preventDefault()
    setPasswordSaving(true)
    setPasswordError(null)
    try {
      await authAPI.changePassword(passwords)
      setPasswords({ current_password: '', new_password: '' })
      addToast('Password updated.', 'success')
    } catch (error) {
      setPasswordError(error.message)
    } finally {
      setPasswordSaving(false)
    }
  }

  const savePrefs = async (changes) => {
    setPrefsSaving(true)
    setPrefsError(null)
    try {
      const updated = await savePreferences(changes)
      setPrefs(updated)
      addToast('Preferences saved.', 'success')
    } catch (error) {
      setPrefsError(error.message)
    } finally {
      setPrefsSaving(false)
    }
  }

  const applyPlan = async (key) => {
    try {
      await changePlan(key)
      await loadOverview()
    } catch (error) {
      addToast(error.message, 'error')
    }
  }

  const deleteAccount = async () => {
    setBusy(true)
    setDeleteError(null)
    try {
      await authAPI.deleteAccount(deletePassword)
      setDeleting(false)
      logout()
    } catch (error) {
      setDeleteError(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Settings"
        description="Your profile, how ALBATROSS answers, and what your plan allows."
      />

      <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-1 border-b border-line pb-3">
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={clsx(
              'rounded-input px-3 py-1.5 text-sm font-medium transition-colors',
              tab === item.key ? 'bg-accent/12 text-accent-ink' : 'text-muted hover:bg-raised hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <SectionHeader title="Profile" description="How your account is identified." />
            <form onSubmit={saveProfile} className="mt-4 space-y-4">
              {profileError && <Feedback tone="error">{profileError}</Feedback>}

              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: profile.avatar_color }}
                >
                  {initials(profile.name || user?.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
                  <p className="truncate text-xs text-muted">{user?.email}</p>
                </div>
              </div>

              <div>
                <label htmlFor="profile-name" className="label">
                  Name
                </label>
                <input
                  id="profile-name"
                  className="input"
                  value={profile.name}
                  maxLength={80}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </div>

              <div>
                <label htmlFor="profile-avatar" className="label">
                  Avatar colour
                </label>
                <input
                  id="profile-avatar"
                  type="color"
                  className="h-9 w-16 cursor-pointer rounded-input border border-line bg-surface"
                  value={profile.avatar_color}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, avatar_color: event.target.value }))
                  }
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="label">
                  Email
                </label>
                <input id="profile-email" className="input" value={user?.email || ''} disabled />
                <p className="mt-1.5 text-xs text-muted">
                  Your email is your sign-in identity and cannot be changed here.
                </p>
              </div>

              <Button type="submit" variant="primary" loading={profileSaving}>
                Save profile
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Password" description="Change the password used to sign in." />
            <form onSubmit={savePassword} className="mt-4 space-y-4">
              {passwordError && <Feedback tone="error">{passwordError}</Feedback>}

              <div>
                <label htmlFor="current-password" className="label">
                  Current password
                </label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  className="input"
                  value={passwords.current_password}
                  onChange={(event) =>
                    setPasswords((current) => ({ ...current, current_password: event.target.value }))
                  }
                />
              </div>

              <div>
                <label htmlFor="new-password" className="label">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  value={passwords.new_password}
                  onChange={(event) =>
                    setPasswords((current) => ({ ...current, new_password: event.target.value }))
                  }
                />
                <p className="mt-1.5 text-xs text-muted">
                  At least 8 characters, including one letter and one number.
                </p>
              </div>

              <Button type="submit" variant="primary" loading={passwordSaving} icon={KeyRound}>
                Update password
              </Button>
            </form>
          </Card>
        </div>
      )}

      {tab === 'appearance' && (
        <Card className="p-5">
          <SectionHeader
            title="Appearance"
            description="Applies immediately, and is saved to your account preferences."
          />
          <fieldset className="mt-4">
            <legend className="sr-only">Theme</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { key: 'light', label: 'Light', icon: Sun },
                { key: 'dark', label: 'Dark', icon: Moon },
                { key: 'system', label: 'System', icon: Monitor },
              ].map((option) => (
                <label
                  key={option.key}
                  className={clsx(
                    'flex cursor-pointer items-center gap-3 rounded-card border p-4 transition-colors',
                    theme === option.key ? 'border-accent/50 bg-accent/5' : 'border-line hover:bg-raised',
                  )}
                >
                  <input
                    type="radio"
                    name="theme"
                    className="sr-only"
                    checked={theme === option.key}
                    onChange={() => {
                      setTheme(option.key)
                      savePrefs({ theme: option.key })
                    }}
                  />
                  <option.icon aria-hidden="true" className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-ink">{option.label}</span>
                  {theme === option.key && <Check aria-hidden="true" className="ml-auto h-4 w-4 text-accent" />}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>
      )}

      {tab === 'ai' && (
        <Card className="p-5">
          <SectionHeader
            title="AI settings"
            description="How answers are written and how much context is retrieved."
          />
          {prefsError && <div className="mt-4"><Feedback tone="error">{prefsError}</Feedback></div>}

          {!prefs ? (
            <div className="mt-4 space-y-3">
              <div className="skeleton h-10" />
              <div className="skeleton h-10" />
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              <div>
                <label htmlFor="response-style" className="label">
                  Response style
                </label>
                <select
                  id="response-style"
                  className="input sm:max-w-xs"
                  value={prefs.response_style}
                  disabled={prefsSaving}
                  onChange={(event) =>
                    setPrefs((current) => ({ ...current, response_style: event.target.value }))
                  }
                >
                  {(preferenceOptions?.response_styles || []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-muted">
                  Concise answers are the default. Ask for detail in the question when you want it.
                </p>
              </div>

              <div>
                <label htmlFor="retrieval-count" className="label">
                  Passages retrieved per question
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="retrieval-count"
                    type="range"
                    min={1}
                    max={preferenceOptions?.max_retrieval_count || 4}
                    value={prefs.retrieval_count}
                    disabled={prefsSaving}
                    onChange={(event) =>
                      setPrefs((current) => ({ ...current, retrieval_count: Number(event.target.value) }))
                    }
                    className="w-full max-w-xs accent-[rgb(var(--accent))]"
                  />
                  <span className="w-8 text-sm font-medium tabular-nums text-ink">
                    {prefs.retrieval_count}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  More passages give the model more to work with, up to{' '}
                  {preferenceOptions?.max_retrieval_count} on your plan.
                </p>
              </div>

              <div className="rounded-card border border-line bg-raised/60 p-4">
                <p className="text-xs font-medium text-ink">Model</p>
                <dl className="mt-2 space-y-1 text-xs text-muted">
                  <div className="flex justify-between gap-4">
                    <dt>Provider</dt>
                    <dd className="text-ink">{preferenceOptions?.model?.provider || 'groq'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Model</dt>
                    <dd className="font-mono text-ink">{preferenceOptions?.model?.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Configured</dt>
                    <dd className="text-ink">{preferenceOptions?.model?.configured ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Embeddings</dt>
                    <dd className="text-ink">
                      {preferenceOptions?.embedding?.provider} ({preferenceOptions?.embedding?.dimension}d)
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Vector backend</dt>
                    <dd className="text-ink">{preferenceOptions?.embedding?.vector_backend}</dd>
                  </div>
                </dl>
              </div>

              <Button
                variant="primary"
                loading={prefsSaving}
                onClick={() =>
                  savePrefs({
                    response_style: prefs.response_style,
                    retrieval_count: prefs.retrieval_count,
                  })
                }
              >
                Save AI settings
              </Button>
            </div>
          )}
        </Card>
      )}

      {tab === 'knowledge' && (
        <Card className="p-5">
          <SectionHeader
            title="Knowledge defaults"
            description="What new conversations search by default."
          />
          {prefsError && <div className="mt-4"><Feedback tone="error">{prefsError}</Feedback></div>}

          {!prefs ? (
            <div className="mt-4 space-y-3">
              <div className="skeleton h-10" />
              <div className="skeleton h-10" />
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              <div>
                <label htmlFor="default-scope" className="label">
                  Default retrieval scope
                </label>
                <select
                  id="default-scope"
                  className="input sm:max-w-xs"
                  value={prefs.default_scope}
                  disabled={prefsSaving}
                  onChange={(event) =>
                    setPrefs((current) => ({ ...current, default_scope: event.target.value }))
                  }
                >
                  <option value="all">All documents</option>
                  <option value="collection">One collection</option>
                </select>
              </div>

              <div>
                <label htmlFor="default-collection" className="label">
                  Default collection
                </label>
                <select
                  id="default-collection"
                  className="input sm:max-w-xs"
                  value={prefs.default_collection_id || ''}
                  disabled={prefsSaving}
                  onChange={(event) =>
                    setPrefs((current) => ({
                      ...current,
                      default_collection_id: event.target.value || null,
                    }))
                  }
                >
                  <option value="">None</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="primary"
                loading={prefsSaving}
                onClick={() =>
                  savePrefs({
                    default_scope: prefs.default_scope,
                    default_collection_id: prefs.default_collection_id,
                  })
                }
              >
                Save knowledge settings
              </Button>
            </div>
          )}
        </Card>
      )}

      {tab === 'account' && (
        <div className="space-y-6">
          <Card className="p-5">
            <SectionHeader
              title="Subscription"
              description="Plans are product entitlements. Billing is not connected."
              actions={usage ? <Badge tone={usage.plan === 'free' ? 'neutral' : 'accent'}>{usage.plan_name}</Badge> : null}
            />
            {usage && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <UsageMeter label="Documents" percent={usage.documents.percent} detail={usage.documents.label} />
                  <UsageMeter label="Questions" percent={usage.questions.percent} detail={usage.questions.label} />
                  <UsageMeter label="Storage" percent={usage.storage.percent} detail={usage.storage.label} />
                </div>
                <p className="text-xs text-muted">
                  Status: {usage.subscription_status} · Period {usage.period} · Up to{' '}
                  {usage.limits.retrieval_top_k} passages per question, {usage.limits.history_turns}{' '}
                  earlier turns of context, {usage.limits.max_file_size_mb} MB per file.
                </p>
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {plans.map((plan) => {
                const current = usage?.plan === plan.key
                return (
                  <div
                    key={plan.key}
                    className={clsx(
                      'rounded-card border p-4',
                      current ? 'border-accent/50 bg-accent/5' : 'border-line',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{plan.name}</p>
                      {current && <Badge tone="accent">Current</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted">{plan.price_label} / month</p>
                    <Button
                      size="sm"
                      variant={current ? 'secondary' : 'primary'}
                      className="mt-3 w-full"
                      disabled={current}
                      onClick={() => applyPlan(plan.key)}
                    >
                      {current ? 'Current plan' : `Switch to ${plan.name}`}
                    </Button>
                  </div>
                )
              })}
            </div>

            <p className="mt-4 flex items-start gap-2 rounded-input border border-line bg-raised/60 p-3 text-xs text-muted">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-caution" />
              Switching a plan changes your limits only. No payment is taken, because no billing
              provider is connected yet.
            </p>
          </Card>

          <Card className="p-5">
            <SectionHeader
              title="Your data"
              description="Export a copy of your documents' metadata, conversations and usage."
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={Download}
                onClick={async () => {
                  try {
                    const data = await (await import('../api/client')).meAPI.exportData()
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = 'albatross-export.json'
                    link.click()
                    URL.revokeObjectURL(url)
                    addToast('Export downloaded.', 'success')
                  } catch (error) {
                    addToast(error.message, 'error')
                  }
                }}
              >
                Download JSON export
              </Button>
            </div>
          </Card>

          <Card className="border-danger/40 p-5">
            <SectionHeader
              title="Delete account"
              description="Removes your documents, conversations and settings permanently."
            />
            <div className="mt-4 max-w-sm space-y-3">
              {deleteError && <Feedback tone="error">{deleteError}</Feedback>}
              <div>
                <label htmlFor="delete-password" className="label">
                  Confirm with your password
                </label>
                <input
                  id="delete-password"
                  type="password"
                  className="input"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                />
              </div>
              <Button
                variant="danger"
                disabled={!deletePassword}
                onClick={() => {
                  setDeleteError(null)
                  setDeleting(true)
                }}
              >
                Delete my account
              </Button>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={deleteAccount}
        loading={busy}
        title="Delete your account?"
        description="Every document, collection, conversation and message will be removed."
        confirmLabel="Delete everything"
      />
    </div>
  )
}
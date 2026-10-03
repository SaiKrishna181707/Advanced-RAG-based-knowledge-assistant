import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, User, FileText, Target, Activity, Briefcase, CheckCircle2, Upload } from 'lucide-react'
import { Button, Card, SectionHeader } from '../components/ui/Primitives'
import EmptyState from '../components/ui/EmptyState'
import { useAuthStore } from '../store/authStore'
import { useCareerStore } from '../store/careerStore'

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const name = (user?.name || '').split(' ')[0]

  const profile = useCareerStore((s) => s.profile)
  const loadProfile = useCareerStore((s) => s.loadProfile)
  const resumes = useCareerStore((s) => s.resumes)
  const loadResumes = useCareerStore((s) => s.loadResumes)

  useEffect(() => {
    loadProfile()
    loadResumes()
  }, [loadProfile, loadResumes])

  // Time of day greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  // Derive real profile completeness
  const profileSections = ['personal', 'education', 'skills', 'experience']
  const filledSections = profileSections.filter(s => {
    const val = profile?.[s]
    if (Array.isArray(val)) return val.length > 0
    if (typeof val === 'object' && val) return Object.values(val).some(Boolean)
    return Boolean(val)
  })
  const hasProfile = filledSections.length > 0
  const profileLabel = hasProfile
    ? `${filledSections.length} of ${profileSections.length} core sections complete`
    : null

  // Derive real resume readiness
  const hasResumes = resumes.length > 0
  const processedResumes = resumes.filter(r => r.status === 'review_required' || r.status === 'completed')

  // Derive target role
  const targetRoles = profile?.target_roles || []
  const primaryTarget = targetRoles.length > 0 ? targetRoles[0] : null

  // Derive recommended action
  const getRecommendation = () => {
    if (!hasProfile) return { text: 'Upload a resume to auto-fill your Career Profile, or build it manually.', cta: 'Upload Resume', to: '/app/resumes' }
    if (!hasResumes) return { text: 'Upload a resume so ALBATROSS can extract your career data.', cta: 'Upload Resume', to: '/app/resumes' }
    if (processedResumes.length === 0) return { text: 'Process your uploaded resume to extract structured career data.', cta: 'Go to Resumes', to: '/app/resumes' }
    if (targetRoles.length === 0) return { text: 'Set a target role in your Career Profile for personalized recommendations.', cta: 'Edit Profile', to: '/app/profile' }
    return { text: 'Your career workspace is set up. Keep your profile updated as you gain new skills.', cta: 'View Profile', to: '/app/profile' }
  }
  const recommendation = getRecommendation()

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {greeting}{name ? `, ${name}` : ''}.
          </h1>
          <p className="mt-1 text-sm text-muted">
            Welcome to your ALBATROSS career workspace.
          </p>
        </div>
        {!hasProfile ? (
          <Link to="/app/resumes" className="btn-primary text-sm">
            <Upload aria-hidden="true" className="h-4 w-4" />
            Upload Resume
          </Link>
        ) : (
          <Link to="/app/profile" className="btn-primary text-sm">
            <User aria-hidden="true" className="h-4 w-4" />
            Edit Profile
          </Link>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* Career Profile Completion */}
          <Card className="p-5">
            <SectionHeader
              title="Career Profile"
              description="Your single source of truth for applications."
              actions={
                <Link to="/app/profile" className="btn-ghost text-xs">
                  Edit Profile
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="mt-4">
              {hasProfile ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm text-ink">{profileLabel}</span>
                  </div>
                  {/* Section indicators */}
                  <div className="flex gap-1.5">
                    {profileSections.map(s => {
                      const filled = filledSections.includes(s)
                      return (
                        <div key={s} className={`h-1.5 flex-1 rounded-full ${filled ? 'bg-accent' : 'bg-line'}`} title={s} />
                      )
                    })}
                  </div>
                  {profile?.personal?.name && (
                    <p className="text-xs text-muted">{profile.personal.name}{profile?.personal?.location ? ` · ${profile.personal.location}` : ''}</p>
                  )}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={User}
                  title="Complete your profile"
                  description="Upload a resume to auto-populate, or add your information manually."
                  action={
                    <Button variant="secondary" size="sm" onClick={() => navigate('/app/resumes')}>
                      Upload Resume
                    </Button>
                  }
                />
              )}
            </div>
          </Card>

          {/* Current Target Role */}
          <Card className="p-5">
            <SectionHeader
              title="Current Target Role"
              description="The role you are actively pursuing."
              actions={
                <Link to="/app/profile" className="btn-ghost text-xs">
                  Update
                </Link>
              }
            />
            <div className="mt-4">
              {primaryTarget ? (
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium text-ink">{primaryTarget}</span>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={Target}
                  title="No target role set"
                  description="Set a target role to get personalized recommendations and gap analysis."
                />
              )}
            </div>
          </Card>

          {/* Applications */}
          <Card className="p-5">
            <SectionHeader
              title="Applications"
              actions={
                <Link to="/app/applications" className="btn-ghost text-xs">
                  View all
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="mt-4">
              <EmptyState
                compact
                icon={Briefcase}
                title="No applications yet"
                description="Track your job applications here once you start applying."
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Resume Readiness */}
          <Card className="p-5">
            <SectionHeader
              title="Resume Readiness"
              actions={
                <Link to="/app/resumes" className="btn-ghost text-xs">
                  Manage Resumes
                </Link>
              }
            />
            <div className="mt-4">
              {hasResumes ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" />
                    <span className="text-sm text-ink">{resumes.length} resume{resumes.length > 1 ? 's' : ''} uploaded</span>
                  </div>
                  {processedResumes.length > 0 && (
                    <p className="text-xs text-muted">{processedResumes.length} processed and ready for review</p>
                  )}
                  <ul className="space-y-1.5">
                    {resumes.slice(0, 3).map(r => (
                      <li key={r.id} className="flex items-center gap-2 text-xs text-muted">
                        <span className={`h-1.5 w-1.5 rounded-full ${r.status === 'completed' || r.status === 'review_required' ? 'bg-success' : r.status === 'failed' ? 'bg-danger' : 'bg-warning'}`} />
                        <span className="truncate text-ink">{r.original_filename}</span>
                        <span className="capitalize ml-auto">{r.status.replace('_', ' ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={FileText}
                  title="Upload your first resume"
                  description="Upload a resume so ALBATROSS can extract and structure your career data."
                  action={
                    <Button variant="secondary" size="sm" onClick={() => navigate('/app/resumes')}>
                      Upload Resume
                    </Button>
                  }
                />
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-5">
            <SectionHeader title="Recent Activity" />
            <div className="mt-4">
              <EmptyState
                compact
                icon={Activity}
                title="No recent activity"
                description="Your recent profile updates, tailored resumes, and matches will appear here."
              />
            </div>
          </Card>

          {/* Recommended Next Action */}
          <Card className="p-5 border-accent/40 bg-accent/5">
            <SectionHeader title="Recommended Next Action" />
            <div className="mt-3">
              <p className="text-sm text-ink mb-3">
                {recommendation.text}
              </p>
              <Button variant="primary" className="w-full" onClick={() => navigate(recommendation.to)}>
                {recommendation.cta}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
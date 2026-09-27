/** Consistent landing-page section frame: eyebrow, heading, lede, content.
 *
 * Updated for dark landing palette. Uses hardcoded dark colors inside
 * .albatross-landing to prevent light theme leakage.
 */
import clsx from 'clsx'

export function Section({ id, children, className, tone = 'base', divider = false, ...rest }) {
  const bgMap = {
    base: '#0a0a0f',
    elevated: '#0f1017',
    raised: '#15161e',
  }

  return (
    <section
      id={id}
      className={clsx('scroll-mt-20', className)}
      style={{
        padding: '64px 20px',
        background: bgMap[tone] || bgMap.base,
        borderTop: divider ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}
      {...rest}
    >
      <div style={{ maxWidth: '72rem', width: '100%', margin: '0 auto' }}>{children}</div>
    </section>
  )
}

export function SectionIntro({ eyebrow, title, lede, align = 'left', className }) {
  return (
    <div
      className={clsx(className)}
      style={{
        maxWidth: align === 'center' ? '42rem' : '42rem',
        margin: align === 'center' ? '0 auto' : undefined,
        textAlign: align === 'center' ? 'center' : 'left',
      }}
    >
      {eyebrow && (
        <p
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: '#2dd4bf',
          }}
        >
          {eyebrow}
        </p>
      )}
      <h2
        style={{
          marginTop: '10px',
          fontSize: 'clamp(1.5rem, 3vw, 1.875rem)',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: '#f5f5f7',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      {lede && (
        <p
          style={{
            marginTop: '12px',
            fontSize: '1rem',
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          {lede}
        </p>
      )}
    </div>
  )
}

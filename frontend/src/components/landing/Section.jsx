/** Consistent landing-page section frame: eyebrow, heading, lede, content. */
import clsx from 'clsx'

export function Section({ id, children, className, tone = 'canvas', divider = false, ...rest }) {
  return (
    <section
      id={id}
      className={clsx(
        'scroll-mt-16 px-5 py-16 sm:px-8 sm:py-20',
        tone === 'surface' ? 'bg-surface' : '',
        divider && 'border-t border-line',
        className,
      )}
      {...rest}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  )
}

export function SectionIntro({ eyebrow, title, lede, align = 'left', className }) {
  return (
    <div className={clsx(align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl', className)}>
      {eyebrow && (
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
      )}
      <h2 className="mt-2.5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
      {lede && <p className="mt-3 text-base leading-relaxed text-muted">{lede}</p>}
    </div>
  )
}

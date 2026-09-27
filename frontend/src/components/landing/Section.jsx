import clsx from 'clsx'

export function Section({ id, children, className, tone = 'base', divider = false, ...rest }) {
  const bgMap = {
    base: 'bg-canvas',
    surface: 'bg-surface',
    elevated: 'bg-raised',
  }

  return (
    <section
      id={id}
      className={clsx(
        'scroll-mt-24 py-20 sm:py-32 px-5 sm:px-8',
        bgMap[tone] || bgMap.base,
        divider && 'border-t border-line',
        className
      )}
      {...rest}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  )
}

export function SectionIntro({ eyebrow, title, lede, align = 'left', className }) {
  return (
    <div
      className={clsx(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className
      )}
    >
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {lede && (
        <p className="mt-4 text-lg leading-relaxed text-muted">
          {lede}
        </p>
      )}
    </div>
  )
}

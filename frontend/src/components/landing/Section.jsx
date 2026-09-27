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
        'scroll-mt-24 py-16 sm:py-24 px-5 sm:px-8',
        bgMap[tone] || bgMap.base,
        // Using very subtle dividing lines instead of harsh borders, or no lines at all
        divider && 'border-t border-line/40',
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-5xl">
        {title}
      </h2>
      {lede && (
        <p className="mt-4 text-lg leading-relaxed text-muted sm:text-xl">
          {lede}
        </p>
      )}
    </div>
  )
}

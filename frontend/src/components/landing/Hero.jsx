/**
 * Landing hero — full-viewport dark SaaS hero for ALBATROSS.
 *
 * Features:
 * - Full 100svh dark background (#0a0a0f)
 * - Ambient indigo/violet radial glow (upper 30-40%)
 * - "INTERFACE SYSTEMS" eyebrow
 * - Large metallic-gradient "Everything above the fold" headline
 * - Responsive clamp() typography
 * - Centered flex layout with proper header clearance
 */

const EASE = [0.16, 1, 0.3, 1]

export default function Hero() {
  return (
    <section
      className="albatross-hero"
      style={{
        position: 'relative',
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: [
            'radial-gradient(ellipse 55% 50% at 20% 10%, rgba(43,58,143,0.22), transparent 70%)',
            'radial-gradient(ellipse 55% 50% at 80% 10%, rgba(91,42,134,0.20), transparent 70%)',
            'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(60,50,140,0.10), transparent 70%)',
          ].join(', '),
        }}
      />

      {/* Hero copy — centered in viewport */}
      <div
        className="albatross-hero-copy"
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 24px',
          maxWidth: '1200px',
          width: '100%',
        }}
      >
        {/* Eyebrow */}
        <p
          className="albatross-eyebrow"
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.25em',
            color: 'rgba(255,255,255,0.45)',
            marginBottom: '28px',
          }}
        >
          INTERFACE SYSTEMS
        </p>

        {/* Headline with metallic gradient */}
        <h1
          style={{
            fontSize: 'clamp(52px, 9vw, 138px)',
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: '-0.03em',
            fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
            background: 'linear-gradient(180deg, #ffffff 0%, #f2f3f6 45%, #858b96 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            margin: 0,
            padding: 0,
            maxWidth: '12ch',
          }}
        >
          Everything above the fold
        </h1>
      </div>
    </section>
  )
}
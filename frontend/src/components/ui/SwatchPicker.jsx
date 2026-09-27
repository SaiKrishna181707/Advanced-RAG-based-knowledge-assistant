/**
 * Colour chooser shared by the profile and collection forms.
 *
 * A row of curated swatches, with the native picker offered as an extra tile so
 * an arbitrary colour is still reachable without an OS dialog being the only
 * affordance.
 */
import { Pipette } from 'lucide-react'
import clsx from 'clsx'
import { ACCENT_SWATCHES, isAccentSwatch } from '../../lib/palette'

const TILE = 'relative h-7 w-7 rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-105'

export default function SwatchPicker({ value, onChange, name = 'colour' }) {
  const selected = String(value || '').toLowerCase()
  const custom = Boolean(selected) && !isAccentSwatch(selected)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ACCENT_SWATCHES.map((swatch) => (
        <button
          key={swatch}
          type="button"
          onClick={() => onChange(swatch)}
          aria-label={`Use colour ${swatch}`}
          aria-pressed={selected === swatch}
          className={clsx(TILE, selected === swatch ? 'ring-2 ring-ink' : 'ring-1 ring-line')}
          style={{ backgroundColor: swatch }}
        />
      ))}

      <label
        className={clsx(
          TILE,
          'flex cursor-pointer items-center justify-center bg-raised',
          custom ? 'ring-2 ring-ink' : 'ring-1 ring-line',
        )}
        style={custom ? { backgroundColor: value } : undefined}
      >
        <span className="sr-only">Custom {name}</span>
        {custom ? null : <Pipette aria-hidden="true" className="h-3.5 w-3.5 text-muted" />}
        <input
          type="color"
          value={selected || ACCENT_SWATCHES[0]}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}
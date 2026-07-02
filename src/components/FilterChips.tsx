export interface ChipOption {
  key: string
  label: string
  color?: string
  count?: number
}

interface Props {
  options: ChipOption[]
  value: string
  onChange: (key: string) => void
}

/** A single-select row of filter pills (with an "All" option supplied by the caller). */
export default function FilterChips({ options, value, onChange }: Props) {
  return (
    <div className="filter-bar" role="group">
      {options.map((o) => {
        const active = o.key === value
        const style =
          active && o.color
            ? { background: `${o.color}1f`, color: o.color, borderColor: `${o.color}55` }
            : undefined
        return (
          <button
            key={o.key}
            type="button"
            className={`filter-chip${active ? ' active' : ''}`}
            style={style}
            onClick={() => onChange(o.key)}
          >
            {o.color && <span className="chip-dot" style={{ background: o.color }} />}
            {o.label}
            {o.count != null && <span className="chip-count">{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

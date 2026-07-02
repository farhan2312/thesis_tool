interface Props {
  step: string // A / B / C / D
  title: string
  tag: string // e.g. "Component A"
  desc: string
}

/** Numbered section header used on each analytics card to convey the pipeline order. */
export default function CardHead({ step, title, tag, desc }: Props) {
  return (
    <div className="card-head">
      <span className={`step-badge step-${step}`}>{step}</span>
      <div className="card-head-text">
        <h2 className="card-title">{title}</h2>
        <p className="card-sub">{desc}</p>
      </div>
      <span className="component-tag">{tag}</span>
    </div>
  )
}

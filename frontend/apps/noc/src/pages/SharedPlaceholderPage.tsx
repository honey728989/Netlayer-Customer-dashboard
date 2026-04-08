interface SharedPlaceholderPageProps {
  title: string
  description: string
  primaryHref?: string
  primaryLabel?: string
}

export function SharedPlaceholderPage({
  title,
  description,
  primaryHref,
  primaryLabel,
}: SharedPlaceholderPageProps) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="card max-w-lg p-8 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-dim">Netlayer</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-muted">{description}</p>
        {primaryHref && primaryLabel ? (
          <a href={primaryHref} className="btn-primary mx-auto mt-5 inline-flex">
            {primaryLabel}
          </a>
        ) : null}
      </div>
    </div>
  )
}

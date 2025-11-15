export default function ValueCard(props: { icon: string; title: string; description: string }) {
  const { icon, title, description } = props
  return (
    <div className="rounded-xl border border-ink-300 bg-white/90 p-6 shadow-sm hover:shadow-subtle hover:-translate-y-0.5 transition">
      <div className="h-9 w-9 grid place-items-center rounded-lg bg-brand-50 text-brand-600 border border-brand-200 text-xl">
        {icon}
      </div>
      <div className="mt-3 font-semibold text-ink-900">{title}</div>
      <div className="mt-2 text-sm text-ink-500 whitespace-pre-line">{description}</div>
    </div>
  )
}



export default function PlaceholderPage({ title, body }) {
  return (
    <div className="rounded-lg border bg-card p-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{body}</p>
    </div>
  )
}

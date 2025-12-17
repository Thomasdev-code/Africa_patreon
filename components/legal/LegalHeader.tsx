interface LegalHeaderProps {
  title: string
  subtitle?: string
}

export function LegalHeader({ title, subtitle }: LegalHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
      {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
    </div>
  )
}


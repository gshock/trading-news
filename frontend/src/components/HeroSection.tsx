interface HeroSectionProps {
  heading: string;
  description: string;
}

export function HeroSection({ heading, description }: HeroSectionProps) {
  return (
    <div className="mb-10">
      <p className="text-[10px] font-bold tracking-[0.25em] text-blue-500 uppercase mb-4">
        Daily Chart Digest
      </p>
      <h1 className="text-[2rem] font-bold text-(--text-heading) leading-tight tracking-tight mb-3">
        {heading}
      </h1>
      <p className="text-sm text-(--text-secondary) leading-relaxed">
        {description}
      </p>
    </div>
  );
}

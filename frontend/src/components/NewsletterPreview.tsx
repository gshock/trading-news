const SECTIONS = [
  {
    title: "Pre-Market Briefing",
    time: "5:30 AM",
    images: [
      { src: "/newsletter-previews/am1.png", alt: "Pre-Market Briefing page 1" },
      { src: "/newsletter-previews/am2.png", alt: "Pre-Market Briefing page 2" },
    ],
  },
  {
    title: "Opening Range Bias",
    time: "9:45 AM / 10:00 AM",
    images: [
      { src: "/newsletter-previews/orb1.png", alt: "Opening Range Bias page 1" },
      { src: "/newsletter-previews/orb2.png", alt: "Opening Range Bias page 2" },
    ],
  },
];

export function NewsletterPreview() {
  return (
    <section className="mt-12 mb-4">
      <p className="text-[10px] font-bold tracking-[0.25em] text-blue-500 uppercase mb-3">
        Newsletter Preview
      </p>
      <h2 className="text-lg font-bold text-(--text-heading) tracking-tight mb-6">
        SEE WHAT'S IN YOUR INBOX.
      </h2>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-sm font-semibold text-(--text-heading)">
                {section.title}
              </span>
              <span className="text-xs text-(--text-secondary)">
                {section.time}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {section.images.map((img) => (
                <img
                  key={img.src}
                  src={img.src}
                  alt={img.alt}
                  className="w-full rounded-lg border border-(--border-color) shadow-sm object-cover"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

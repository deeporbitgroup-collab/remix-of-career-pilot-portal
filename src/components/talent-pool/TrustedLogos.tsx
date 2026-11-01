/**
 * TrustedLogos — slow, seamless, black & white logo marquee shown on the Talent Pool
 * landing (below the role buttons / CPA). Logos are normalised to solid white via a CSS
 * filter so they read as one monochrome row on the dark CareerBoost background, dim at rest
 * and brightening on hover. The whole strip pauses when hovered. The track is rendered three
 * times and translated by one third, so the loop is seamless at any width.
 */

const LOGOS: { name: string; src: string }[] = [
  { name: "Assist Digital", src: "/talent-logos/assistdigital.png" },
  { name: "Fante", src: "/talent-logos/fante.png" },
  { name: "Cravero & Associati", src: "/talent-logos/cravero.png" },
  { name: "J.P. Morgan", src: "/talent-logos/jpmorgan.png" },
  { name: "BlackRock", src: "/talent-logos/blackrock.svg" },
  { name: "Goldman Sachs", src: "/talent-logos/goldmansachs.png" },
  { name: "Piper Sandler", src: "/talent-logos/pipersandler.png" },
  { name: "Bain & Company", src: "/talent-logos/bain.png" },
  { name: "Deloitte", src: "/talent-logos/deloitte.png" },
  { name: "Accenture", src: "/talent-logos/accenture.png" },
];

const TrustedLogos = ({ label }: { label?: string }) => {
  // Three copies so translateX(-33.333%) loops seamlessly.
  const track = [...LOGOS, ...LOGOS, ...LOGOS];

  return (
    <div className="group mt-4 md:mt-5">
      {label && (
        <p className="text-center text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.25em] text-cbslate-400/70 mb-2.5 md:mb-3">
          {label}
        </p>
      )}
      <div
        className="relative overflow-hidden"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
          maskImage:
            "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
        }}
      >
        <div
          className="flex w-max items-center gap-10 md:gap-16 animate-scroll-carousel group-hover:[animation-play-state:paused]"
          style={{ animationDuration: "45s" }}
        >
          {track.map((logo, i) => (
            <img
              key={`${logo.name}-${i}`}
              src={logo.src}
              alt={logo.name}
              draggable={false}
              className="h-4 md:h-5 w-auto shrink-0 select-none opacity-50 transition-opacity duration-300 hover:opacity-90"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrustedLogos;

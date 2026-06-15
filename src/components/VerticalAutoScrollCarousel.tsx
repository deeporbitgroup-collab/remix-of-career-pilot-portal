interface CarouselItem {
  name: string;
  logo: string;
}

interface VerticalAutoScrollCarouselProps {
  items: CarouselItem[];
  speed?: number;
  reverse?: boolean;
}

const VerticalAutoScrollCarousel = ({ items, speed = 35, reverse = false }: VerticalAutoScrollCarouselProps) => {
  const tripleItems = [...items, ...items, ...items];

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Top fade mask */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background to-transparent z-10" />
      {/* Bottom fade mask */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent z-10" />

      <div
        className="flex flex-col gap-3 animate-scroll-carousel-vertical"
        style={{
          animationDuration: `${speed}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {tripleItems.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className="flex-shrink-0 flex flex-col items-center justify-center bg-card rounded-xl p-3 shadow-md border border-primary/20 hover:border-primary/60 hover:shadow-lg transition-all"
          >
            <img
              src={item.logo}
              alt={item.name}
              className="h-14 w-14 object-contain mb-1.5"
              loading="lazy"
            />
            <span className="text-[10px] text-center text-foreground font-semibold line-clamp-2 leading-tight">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VerticalAutoScrollCarousel;

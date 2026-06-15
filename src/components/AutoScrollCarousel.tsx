interface CarouselItem {
  name: string;
  logo: string;
}

interface AutoScrollCarouselProps {
  items: CarouselItem[];
  speed?: number;
}

const AutoScrollCarousel = ({ items, speed = 30 }: AutoScrollCarouselProps) => {
  // Triple the items for seamless infinite scroll
  const tripleItems = [...items, ...items, ...items];

  return (
    <div className="relative w-full overflow-hidden">
      <div
        className="flex gap-4 md:gap-5 animate-scroll-carousel"
        style={{
          animationDuration: `${speed}s`,
        }}
      >
        {tripleItems.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className="flex-shrink-0 flex flex-col items-center justify-center bg-card rounded-lg p-2 md:p-2.5 min-w-[100px] md:min-w-[105px] hover:bg-muted/50 transition-colors"
          >
            <img
              src={item.logo}
              alt={item.name}
              className="h-10 w-10 md:h-11 md:w-11 object-contain mb-1"
            />
            <span className="text-[10px] md:text-[11px] text-center text-muted-foreground font-medium line-clamp-2">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AutoScrollCarousel;

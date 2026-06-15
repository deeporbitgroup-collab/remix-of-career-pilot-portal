import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const TestimonialsCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const { language } = useLanguage();
  
  // Scroll animations
  const titleAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 100 });
  const carouselAnimation = useScrollAnimation({ animationClass: 'animate-scale-up', delay: 200 });
  
  const testimonials = language === 'it' ? [
    {
      name: "Matteo",
      flag: "🇮🇹",
      rating: 5,
      review: "Un'esperienza davvero utile: i mentor si sono dimostrati preparati, disponibili e capaci di fornire indicazioni pratiche e concrete. Grazie al loro supporto ho affrontato con maggiore serenità il percorso di ammissione, avendo sempre chiari i passaggi da seguire."
    },
    {
      name: "Hannah",
      flag: "🇨🇭",
      rating: 5,
      review: "Mi hanno messo in contatto con una ragazza che lavora in una delle migliori aziende del settore di mio interesse: oltre a darmi consigli pratici su come entrarci, ha pianificato per me un percorso chiaro e dettagliato, passo dopo passo, su misura."
    },
    {
      name: "Francesco",
      flag: "🇮🇹",
      rating: 5,
      review: "Un aiuto pratico e concreto: mi hanno supportato nella scelta dell'università mettendomi in contatto con due studenti delle università a cui ero interessato. Ho ricevuto sia insights quantitativi che qualitativi: un mix perfetto di qualità, serietà e prezzo."
    },
    {
      name: "Lavinia",
      flag: "🇮🇹",
      rating: 4,
      review: "Volevo entrare nella mia università target e il supporto è stato decisivo: uno studente già iscritto mi ha creato una timeline personalizzata con scadenze, studio, materiali e link scontati. Ogni volta che serviva, era disponibile con consulenze aggiuntive."
    },
    {
      name: "Friedrich",
      flag: "🇩🇪",
      rating: 4.5,
      review: "Si sono dimostrati seri e professionali, dal meeting gratuito per capire i miei obiettivi fino alla realizzazione del progetto personalizzato per me."
    }
  ] : [
    {
      name: "Matteo",
      flag: "🇮🇹",
      rating: 5,
      review: "A truly valuable experience: the mentors proved to be prepared, available, and capable of providing practical and concrete guidance. Thanks to their support, I faced the admission process with greater peace of mind, always having clear steps to follow."
    },
    {
      name: "Hannah",
      flag: "🇨🇭",
      rating: 5,
      review: "They connected me with a girl working at one of the best companies in my field of interest: besides giving me practical advice on how to get in, she planned a clear and detailed path for me, step by step, tailored to my needs."
    },
    {
      name: "Francesco",
      flag: "🇮🇹",
      rating: 5,
      review: "Practical and concrete help: they supported me in choosing a university by connecting me with two students from the universities I was interested in. I received both quantitative and qualitative insights: a perfect mix of quality, seriousness, and value."
    },
    {
      name: "Lavinia",
      flag: "🇮🇹",
      rating: 4,
      review: "I wanted to get into my target university and the support was decisive: a student already enrolled created a personalized timeline for me with deadlines, study materials, and discounted links. Whenever needed, they were available for additional consultations."
    },
    {
      name: "Friedrich",
      flag: "🇩🇪",
      rating: 4.5,
      review: "They proved to be serious and professional, from the free meeting to understand my goals to the realization of the personalized project for me."
    }
  ];

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  // Touch/Mouse handlers for swipe functionality
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setDragStartX(clientX);
    setDragOffset(0);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    
    const diff = clientX - dragStartX;
    const maxDrag = 150;
    
    // Add resistance at edges
    if ((activeIndex === 0 && diff > 0) || 
        (activeIndex === testimonials.length - 1 && diff < 0)) {
      setDragOffset(diff * 0.3);
    } else {
      setDragOffset(Math.max(-maxDrag, Math.min(maxDrag, diff)));
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    
    const threshold = 50;
    
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0) {
        prevTestimonial();
      } else {
        nextTestimonial();
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleEnd();
    }
  };

  // Auto-rotate testimonials (pause when dragging)
  useEffect(() => {
    if (isDragging) return;
    
    const timer = setInterval(() => {
      nextTestimonial();
    }, 6000); // Change every 6 seconds

    return () => clearInterval(timer);
  }, [activeIndex, isDragging]);

  const getCardPosition = (index: number) => {
    const diff = (index - activeIndex + testimonials.length) % testimonials.length;
    
    if (diff === 0) return 'center';
    if (diff === 1 || diff === testimonials.length - 1) {
      return diff === 1 ? 'right' : 'left';
    }
    return 'hidden';
  };

  const getCardStyles = (position: string) => {
    switch (position) {
      case 'center':
        return 'scale-100 opacity-100 z-20 shadow-xl';
      case 'left':
        return 'scale-90 opacity-70 -translate-x-16 md:-translate-x-24 z-10';
      case 'right':
        return 'scale-90 opacity-70 translate-x-16 md:translate-x-24 z-10';
      default:
        return 'hidden';
    }
  };

  return (
    <div id="testimonials" className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Title */}
        <div ref={titleAnimation.ref} className={`text-center mb-8 md:mb-10 ${titleAnimation.className}`}>
          <h3 className="text-2xl md:text-3xl font-bold text-primary mb-2">
            {language === 'it' ? 'Cosa dicono di noi' : 'What our clients say'}
          </h3>
          <p className="text-steel-gray text-sm md:text-base">
            {language === 'it' ? 'Le esperienze dei nostri clienti' : 'Experiences from our clients'}
          </p>
        </div>

        {/* Carousel Container */}
        <div ref={carouselAnimation.ref} className={`relative max-w-5xl mx-auto ${carouselAnimation.className}`}>
          {/* Navigation Buttons - Hidden on mobile */}
          <button
            onClick={prevTestimonial}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-30 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 items-center justify-center group"
            aria-label={language === 'it' ? 'Recensione precedente' : 'Previous review'}
          >
            <ChevronLeft className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          </button>

          <button
            onClick={nextTestimonial}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-30 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 items-center justify-center group"
            aria-label={language === 'it' ? 'Recensione successiva' : 'Next review'}
          >
            <ChevronRight className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          </button>

          {/* Cards Container */}
          <div 
            className="relative h-[280px] md:h-[240px] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {testimonials.map((testimonial, index) => {
              const position = getCardPosition(index);
              const styles = getCardStyles(position);
              
              return (
                <Card
                  key={index}
                  className={`absolute transition-all ${isDragging ? 'duration-100' : 'duration-500'} ease-in-out transform ${styles} 
                    ${position === 'center' ? 'w-[90%] md:w-[500px]' : 'w-[90%] md:w-[450px]'}
                    bg-white border-gray-100`}
                  style={{
                    maxWidth: position === 'center' ? '500px' : '450px',
                    transform: `translateX(${position === 'center' ? dragOffset : position === 'left' ? dragOffset - 64 : position === 'right' ? dragOffset + 64 : 0}px) ${styles.includes('scale-90') ? 'scale(0.9)' : 'scale(1)'}`,
                    opacity: styles.includes('opacity-70') ? 0.7 : 1,
                  }}
                >
                  <CardContent className="p-6 md:p-8">
                    {/* Header with Name and Stars */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl md:text-2xl font-bold text-primary">
                          {testimonial.name}
                        </h4>
                        <span className="text-lg">{testimonial.flag}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => {
                          const isFilled = i < Math.floor(testimonial.rating);
                          const isHalf = i === Math.floor(testimonial.rating) && testimonial.rating % 1 !== 0;
                          
                          return (
                            <span 
                              key={i} 
                              className="text-xl relative"
                            >
                              {isHalf ? (
                                <>
                                  <span style={{ color: '#E0E0E0', position: 'absolute' }}>★</span>
                                  <span style={{ 
                                    color: '#FFD700', 
                                    clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)',
                                    position: 'relative'
                                  }}>★</span>
                                </>
                              ) : (
                                <span style={{ color: isFilled ? '#FFD700' : '#E0E0E0' }}>★</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Review Text */}
                    <p className="text-steel-gray leading-relaxed text-sm md:text-base">
                      {testimonial.review}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6 md:mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  activeIndex === index 
                    ? 'bg-primary w-8' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`${language === 'it' ? 'Vai alla recensione' : 'Go to review'} ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialsCarousel;
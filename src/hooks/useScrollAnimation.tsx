import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  animationClass?: string;
  delay?: number;
  stagger?: boolean;
  staggerDelay?: number;
  parallax?: boolean;
  parallaxSpeed?: number;
}

export const useScrollAnimation = (
  options: UseScrollAnimationOptions = {}
) => {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    animationClass = 'animate-fade-up',
    delay = 0,
    stagger = false,
    staggerDelay = 100,
    parallax = false,
    parallaxSpeed = 0.5
  } = options;

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [parallaxOffset, setParallaxOffset] = useState(0);
  // Intersection Observer for visibility
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // On mobile, show immediately and skip observer to avoid hidden content
    if (isMobile) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, delay, isVisible, isMobile]);

  // Parallax effect
  useEffect(() => {
    if (!parallax || isMobile || !elementRef.current) return;

    const handleScroll = () => {
      const element = elementRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const speed = parallaxSpeed;
      const yPos = -(rect.top * speed);
      setParallaxOffset(yPos);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [parallax, parallaxSpeed]);

  const getClassName = (index?: number) => {
    const baseClass = `transition-all duration-700 ease-out`;
    const visibleNow = isVisible || isMobile;
    const visibilityClass = visibleNow 
      ? `opacity-100 translate-y-0 scale-100` 
      : 'opacity-0 translate-y-8 scale-95';
    
    const staggerClass = stagger && index !== undefined && visibleNow
      ? `animation-delay-${index * staggerDelay}`
      : '';
    
    const animClass = visibleNow && !isMobile ? animationClass : '';
    
    return `${baseClass} ${visibilityClass} ${animClass} ${staggerClass}`.trim();
  };

  const style = parallax ? {
    transform: `translateY(${parallaxOffset}px)`
  } : {};

  return {
    ref: elementRef,
    className: getClassName(),
    getClassName,
    style,
    isVisible
  };
};

// Hook for staggered animations
export const useStaggeredAnimation = (
  itemCount: number,
  options: UseScrollAnimationOptions = {}
) => {
  const animation = useScrollAnimation({ ...options, stagger: true });
  
  const getItemProps = (index: number) => ({
    className: animation.getClassName(index),
    style: {
      ...animation.style,
      animationDelay: `${index * (options.staggerDelay || 100)}ms`
    }
  });

  return {
    containerRef: animation.ref,
    containerClassName: animation.className,
    getItemProps,
    isVisible: animation.isVisible
  };
};
import { useState, useEffect, useRef, TouchEvent } from 'react';

interface UseKpiCarouselProps {
  totalItems: number;
}

export const useKpiCarousel = ({ totalItems }: UseKpiCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTouchStart = (e: TouchEvent) => {
    setIsDragging(true);
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    
    // Add resistance at edges
    if ((currentIndex === 0 && diff > 0) || 
        (currentIndex === totalItems - 1 && diff < 0)) {
      setDragOffset(diff * 0.3); // Resistance effect
    } else {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const diff = touchStartX.current - touchCurrentX.current;
    const threshold = 50;
    const velocity = Math.abs(diff);

    // Use lower threshold for faster swipes
    const effectiveThreshold = velocity > 100 ? 30 : threshold;

    if (Math.abs(diff) > effectiveThreshold) {
      if (diff > 0 && currentIndex < totalItems - 1) {
        // Swipe left - next card
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - previous card
        setCurrentIndex(currentIndex - 1);
      }
    }
    
    // Reset drag offset
    setDragOffset(0);
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
  };

  return {
    currentIndex,
    isMobile,
    isDragging,
    dragOffset,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    goToIndex,
    setCurrentIndex
  };
};
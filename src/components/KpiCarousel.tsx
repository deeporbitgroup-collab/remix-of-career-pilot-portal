import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useKpiCarousel } from '@/hooks/useKpiCarousel';
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";

interface KPIData {
  definition: {
    id: string;
    key: string;
    label: string;
    description: string | null;
    chart_type: 'number' | 'bar' | 'pie';
  };
  value: number;
  updated_at: string;
}

interface KpiCarouselProps {
  kpiData: KPIData[];
  language?: string;
  updateLabel?: string;
}

export const KpiCarousel = ({ kpiData, language = 'it', updateLabel = 'Aggiornato' }: KpiCarouselProps) => {
  const numberKpis = kpiData.filter(kpi => kpi.definition.chart_type === 'number');
  const { 
    currentIndex, 
    isMobile, 
    isDragging,
    dragOffset,
    handleTouchStart, 
    handleTouchMove, 
    handleTouchEnd, 
    goToIndex 
  } = useKpiCarousel({ totalItems: numberKpis.length });

  const locale = language === 'en' ? enUS : it;

  if (numberKpis.length === 0) return null;

  // Calculate transform based on current index and drag offset
  const getTransform = () => {
    if (!isMobile) return 'none';
    
    const baseOffset = currentIndex * 100;
    const dragPercentage = dragOffset / window.innerWidth * 100;
    return `translateX(-${baseOffset - dragPercentage}%)`;
  };

  return (
    <div className="relative mb-8">
      <div className="overflow-hidden">
        <div 
          className={`${
            isMobile ? 'flex' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          } ${isDragging ? '' : 'transition-transform duration-300 ease-in-out'}`}
          style={{ 
            transform: getTransform(),
            cursor: isMobile ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
          onTouchStart={isMobile ? handleTouchStart : undefined}
          onTouchMove={isMobile ? handleTouchMove : undefined}
          onTouchEnd={isMobile ? handleTouchEnd : undefined}
          onMouseDown={isMobile ? (e: any) => {
            // Support mouse drag on desktop for testing
            const mouseStartX = e.clientX;
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const fakeTouchEvent = {
                touches: [{ clientX: moveEvent.clientX }]
              } as any;
              handleTouchMove(fakeTouchEvent);
            };
            const handleMouseUp = () => {
              handleTouchEnd();
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            handleTouchStart({ touches: [{ clientX: mouseStartX }] } as any);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          } : undefined}
        >
          {numberKpis.map(kpi => (
            <Card key={kpi.definition.id} className={isMobile ? "min-w-full select-none" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.definition.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-3xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {updateLabel}: {format(new Date(kpi.updated_at), 'dd MMM yyyy', { locale })}
                  </p>
                  {kpi.definition.description && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {kpi.definition.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Dots indicator for mobile */}
      {isMobile && numberKpis.length > 1 && (
        <div className="flex justify-center gap-2 mt-4 md:hidden">
          {numberKpis.map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 touch-manipulation ${
                index === currentIndex 
                  ? 'bg-primary scale-110' 
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50 active:bg-muted-foreground/70'
              }`}
              aria-label={`${language === 'it' ? 'Vai alla scheda' : 'Go to card'} ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import Pathways from "@/pages/platforms/Pathways";

interface PathwaysOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const PathwaysOverlay = ({ isOpen, onClose }: PathwaysOverlayProps) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <h2 className="text-2xl font-bold text-primary">Pathways</h2>
          </div>
        </div>
      </div>
      
      {/* Exit Button - Fixed Top Left */}
      <Button
        onClick={onClose}
        className="fixed top-6 left-6 z-20 bg-primary hover:bg-primary/90 text-white shadow-lg gap-2"
      >
        <ArrowLeft className="h-5 w-5" />
        {language === 'it' ? 'Torna al Sito Principale' : 'Back to Main Site'}
      </Button>
      
      {/* Content */}
      <div className="h-[calc(100vh-100px)] overflow-y-auto">
        <Pathways />
      </div>
    </div>
  );
};

export default PathwaysOverlay;

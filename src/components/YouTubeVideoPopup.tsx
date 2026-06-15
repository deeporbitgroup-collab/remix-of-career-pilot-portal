import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface YouTubeVideoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
}

const YouTubeVideoPopup = ({ isOpen, onClose, videoId }: YouTubeVideoPopupProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] p-0 bg-black border-none overflow-hidden rounded-xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-50 bg-white hover:bg-gray-100 text-black rounded-full p-2 shadow-lg transition-all hover:scale-110"
          aria-label="Close video"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          {isOpen && (
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&vq=hd1080&hd=1&quality=hd1080&modestbranding=1`}
              title="CareerPilot Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="eager"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default YouTubeVideoPopup;

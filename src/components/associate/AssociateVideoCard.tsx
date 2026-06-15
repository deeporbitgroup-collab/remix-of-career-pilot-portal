import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Video } from "lucide-react";

interface Props {
  isEn: boolean;
  title: string;
  description: string;
  src: string;
  allowFullscreen?: boolean;
  compact?: boolean;
  minimal?: boolean;
}

const AssociateVideoCard = ({ isEn, title, description, src, allowFullscreen, compact, minimal }: Props) => {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setPlaying(true);
    setPaused(false);
    setTimeout(() => videoRef.current?.play(), 50);
  };

  const handleResume = () => {
    setPaused(false);
    videoRef.current?.play();
  };

  const videoBlock = (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        src={src}
        controls
        controlsList={allowFullscreen ? "nodownload noremoteplayback" : "nofullscreen nodownload noremoteplayback"}
        disablePictureInPicture={!allowFullscreen}
        onPause={() => setPaused(true)}
        onPlay={() => setPaused(false)}
        onDoubleClick={(e) => {
          if (!allowFullscreen) e.preventDefault();
        }}
        className="w-full h-full object-cover"
      />
      {paused && (
        <div className="absolute inset-0 bg-black flex items-center justify-center group">
          <Button
            onClick={handleResume}
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            {isEn ? 'Continue' : 'Continua'}
          </Button>
        </div>
      )}
    </div>
  );

  const watchBtn = (
    <Button onClick={handlePlay} size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
      <Play className="h-3.5 w-3.5" fill="currentColor" />
      {isEn ? 'Watch video' : 'Guarda il video'}
    </Button>
  );

  if (minimal) {
    if (playing) {
      return (
        <div className="w-full max-w-md mx-auto rounded-lg overflow-hidden border bg-background aspect-video">
          {videoBlock}
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={handlePlay}
        className="group inline-flex items-center gap-3 px-6 py-3.5 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-shadow duration-200"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/15 group-hover:bg-primary-foreground/25 transition-colors">
          <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
        </span>
        <span className="text-sm md:text-base tracking-wide">
          {isEn ? 'Watch video' : 'Guarda il video'}
        </span>
      </button>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Video className="h-4 w-4 text-primary" />
          <span className="font-medium">{title}</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">— {description}</span>
        </div>
        {!playing ? watchBtn : (
          <div className="w-full mt-2 rounded-lg overflow-hidden border bg-background aspect-video max-w-md">
            {videoBlock}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="max-w-md border-dashed bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Video className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{description}</p>

            <div className="mt-3 rounded-lg overflow-hidden border bg-background aspect-video">
              {playing ? videoBlock : (
                <button
                  onClick={handlePlay}
                  className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 transition-colors group"
                  type="button"
                >
                  <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
                  </div>
                </button>
              )}
            </div>

            {!playing && <div className="mt-3">{watchBtn}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssociateVideoCard;

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Play, Pause } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

const InlineVideoCard = ({ label, src }: { label: string; src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
    } else {
      v.pause();
    }
  };

  return (
    <div className="relative w-40 rounded-lg overflow-hidden border border-primary/30 bg-black shadow-sm">
      <div className="aspect-video">
        <video
          ref={videoRef}
          src={src}
          controlsList="nofullscreen nodownload noremoteplayback"
          disablePictureInPicture
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onClick={toggle}
          onDoubleClick={(e) => e.preventDefault()}
          className="w-full h-full object-cover cursor-pointer"
        />
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className="absolute inset-0 flex items-center justify-center group"
      >
        <span
          className={`h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg transition-opacity ${
            playing ? 'opacity-0 group-hover:opacity-90' : 'opacity-95 group-hover:scale-110'
          }`}
        >
          {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
        </span>
      </button>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pointer-events-none">
        <p className="text-[10px] font-medium text-white leading-tight line-clamp-2">{label}</p>
      </div>
    </div>
  );
};

const UsefulContacts = () => {
  return (
    <Card className="backdrop-blur-sm bg-background/90 shadow-lg border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Useful Contacts
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button
          asChild
          variant="outline"
          className="gap-2 hover:bg-green-50 hover:border-green-500 hover:text-green-600 transition-colors"
        >
          <a href="https://wa.me/447826932893" target="_blank" rel="noopener noreferrer">
            <FaWhatsapp className="h-5 w-5 text-green-500" />
            +44 7826 932893
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          className="gap-2 hover:bg-primary/5 hover:border-primary transition-colors"
        >
          <a href="mailto:CareerPilot.team@gmail.com">
            <Mail className="h-5 w-5 text-primary" />
            CareerPilot.team@gmail.com
          </a>
        </Button>

        {/* Intro videos — desktop only (hidden on mobile to keep the area tidy) */}
        <div className="hidden md:flex flex-wrap gap-2 ml-auto">
          <InlineVideoCard label="Welcome to your personal area!" src="/videos/client-welcome.mp4" />
          <InlineVideoCard label="Get to know better your area" src="/videos/client-getknow.mp4" />
        </div>
      </CardContent>
    </Card>
  );
};

export default UsefulContacts;

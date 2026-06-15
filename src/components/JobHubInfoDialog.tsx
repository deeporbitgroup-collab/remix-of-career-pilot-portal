import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Newspaper, MessageCircle, Check } from "lucide-react";

interface JobHubInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const WHATSAPP_URL = "https://wa.me/447826932893";

const JobHubInfoDialog = ({ isOpen, onClose }: JobHubInfoDialogProps) => {
  const { language } = useLanguage();
  const it = language === "it";

  const bullets = it
    ? [
        "Posizioni aperte e nuove opportunità di stage selezionate ogni settimana",
        "Programmi di recruiting, spring weeks e off-cycle nei top employer",
        "Deadline, eventi di networking e career fair da non perdere",
        "Consigli pratici e aggiornamenti dal team Career Pilot",
      ]
    : [
        "Curated job openings and internship opportunities every week",
        "Recruiting programs, spring weeks and off-cycle roles at top employers",
        "Key deadlines, networking events and career fairs you can't miss",
        "Practical tips and updates from the Career Pilot team",
      ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md z-[200]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
              <Newspaper className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-left">
                {it ? "Job Updates Hub" : "Job Updates Hub"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {it ? "Gruppo WhatsApp esclusivo" : "Exclusive WhatsApp group"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {it
              ? "Job Updates Hub è il gruppo WhatsApp curato dal team Career Pilot dove condividiamo, in tempo reale, le migliori opportunità professionali per studenti e giovani professionisti."
              : "Job Updates Hub is the WhatsApp group curated by the Career Pilot team where we share, in real time, the best professional opportunities for students and young professionals."}
          </p>

          <ul className="space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            {it
              ? "Per richiedere l'accesso, contatta il team su WhatsApp."
              : "To request access, contact the team on WhatsApp."}
          </p>

          <Button
            asChild
            className="w-full bg-gradient-to-r from-[#25D366] to-[#1ea952] hover:from-[#1ea952] hover:to-[#128C47] text-white shadow-md"
          >
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-2" />
              {it ? "Contact Us" : "Contact Us"}
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobHubInfoDialog;

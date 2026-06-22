import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Mail, Plane, User, MessageSquare, Phone } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface BookingPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const BookingPopup = ({ isOpen, onClose }: BookingPopupProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !phone || !service || !date || !time) {
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: language === 'it' ? "Compila tutti i campi richiesti" : "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data, error } = await supabase.functions.invoke('send-booking-email', {
        body: {
          name,
          email,
          phone,
          service,
          date,
          time,
          notes
        }
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }

      // Check if there's an error in the response data
      if (data?.error) {
        console.error("Email service error:", data.error);
        throw new Error((language === 'it' ? "Errore nell'invio email: " : "Error sending email: ") + data.error.error);
      }

      toast({
        title: language === 'it' ? "Check-in Prenotato!" : "Check-in Booked!",
        description: language === 'it' 
          ? "La tua prenotazione è stata inviata con successo. Riceverai una conferma via email entro 24 ore."
          : "Your booking has been successfully sent. You will receive confirmation via email within 24 hours.",
      });
      
      // Reset form and close
      setName("");
      setEmail("");
      setPhone("");
      setService("");
      setDate("");
      setTime("");
      setNotes("");
      onClose();
    } catch (error: any) {
      console.error("Error submitting booking:", error);
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: language === 'it' 
          ? "Si è verificato un errore durante l'invio. Riprova più tardi."
          : "An error occurred while sending. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[92vw] max-w-[400px] mx-auto max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl overflow-hidden">
        {/* Gradient header band — compact + reassuring */}
        <div className="bg-gradient-sky px-5 py-4 text-white">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-white text-lg font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Plane className="h-4 w-4" />
              </span>
              {language === 'it' ? 'Check-in Gratuito' : 'Free Check-in'}
            </DialogTitle>
            <p className="text-[12px] leading-snug text-white/85">
              {language === 'it'
                ? 'Una call 1:1 gratuita per fare il punto sul tuo piano. Nessun impegno.'
                : 'A free 1:1 call to map out your plan. No commitment.'}
            </p>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-steel-gray flex items-center gap-1.5 text-xs font-medium">
              <User className="h-3.5 w-3.5" />
              {language === 'it' ? 'Nome' : 'Name'}
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'it' ? 'Il tuo nome completo' : 'Your full name'}
              required
              className="h-10 rounded-lg text-[16px]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email" className="text-steel-gray flex items-center gap-1.5 text-xs font-medium">
              <Mail className="h-3.5 w-3.5" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={language === 'it' ? 'il.tuo@email.com' : 'youremail@gmail.com'}
              required
              className="h-10 rounded-lg text-[16px]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone" className="text-steel-gray flex items-center gap-1.5 text-xs font-medium">
              <Phone className="h-3.5 w-3.5" />
              {language === 'it' ? 'Telefono' : 'Phone'}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={language === 'it' ? '+39 123 456 7890' : '+1 234 567 8900'}
              required
              className="h-10 rounded-lg text-[16px]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="service" className="text-steel-gray text-xs font-medium">
              {language === 'it' ? 'Servizio' : 'Service'}
            </Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger className="h-10 rounded-lg text-[16px]">
                <SelectValue placeholder={language === 'it' ? 'Scegli il tuo volo...' : 'Choose your flight...'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="takeoff">
                  {language === 'it'
                    ? '✈️ Takeoff - Ingresso Universitario'
                    : '✈️ Takeoff - University Admission'}
                </SelectItem>
                <SelectItem value="layover">
                  {language === 'it'
                    ? '🔄 Layover - Trasferimento'
                    : '🔄 Layover - Transfer'}
                </SelectItem>
                <SelectItem value="altitude">
                  {language === 'it'
                    ? '🚀 Altitude - Stage & Carriera'
                    : '🚀 Altitude - Internship & Career'}
                </SelectItem>
                <SelectItem value="summit">
                  {language === 'it'
                    ? '🎓 Summit - Università → Master'
                    : '🎓 Summit - University → Master'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="date" className="text-steel-gray flex items-center gap-1.5 text-xs font-medium">
                <Calendar className="h-3.5 w-3.5" />
                {language === 'it' ? 'Data' : 'Date'}
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className="h-10 rounded-lg text-[16px]"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="time" className="text-steel-gray text-xs font-medium whitespace-nowrap">
                {language === 'it' ? 'Orario (Milano, Italia)' : 'Time (Milan, Italy)'}
              </Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="h-10 rounded-lg text-[16px]">
                  <SelectValue placeholder={language === 'it' ? 'Ora' : 'Hour'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="09:00">09:00</SelectItem>
                  <SelectItem value="10:00">10:00</SelectItem>
                  <SelectItem value="11:00">11:00</SelectItem>
                  <SelectItem value="14:00">14:00</SelectItem>
                  <SelectItem value="15:00">15:00</SelectItem>
                  <SelectItem value="16:00">16:00</SelectItem>
                  <SelectItem value="17:00">17:00</SelectItem>
                  <SelectItem value="18:00">18:00</SelectItem>
                  <SelectItem value="19:00">19:00</SelectItem>
                  <SelectItem value="20:00">20:00</SelectItem>
                  <SelectItem value="21:00">21:00</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-steel-gray flex items-center gap-1.5 text-xs font-medium">
              <MessageSquare className="h-3.5 w-3.5" />
              {language === 'it' ? 'Note (opzionale)' : 'Notes (optional)'}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'it'
                ? 'Eventuali note o richieste...'
                : 'Any notes or requests...'}
              className="min-h-[52px] rounded-lg text-[16px]"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 px-4 text-[15px]"
            >
              {language === 'it' ? 'Annulla' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-11 text-[15px] font-semibold bg-gradient-sky text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting
                ? (language === 'it' ? 'Invio...' : 'Sending...')
                : (language === 'it' ? 'Prenota Check-in' : 'Book Check-in')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingPopup;
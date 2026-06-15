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
      <DialogContent className="w-[92vw] max-w-[92vw] sm:max-w-md mx-auto max-h-[88vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-primary text-base sm:text-xl">
            <Plane className="h-4 w-4 sm:h-5 sm:w-5" />
            {language === 'it' ? 'Prenota il tuo Check-in Gratuito' : 'Book Your Free Check-in'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-4">
          <div>
            <Label htmlFor="name" className="text-steel-gray flex items-center gap-2 text-[13px] sm:text-base">
              <User className="h-3.5 w-3.5 md:h-4 md:w-4" />
              {language === 'it' ? 'Nome' : 'Name'}
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'it' ? 'Il tuo nome completo' : 'Your full name'}
              required
              className="h-10 sm:min-h-[44px] text-[14px] sm:text-[16px]"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-steel-gray flex items-center gap-2 text-[13px] sm:text-base">
              <Mail className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={language === 'it' ? 'il.tuo@email.com' : 'youremail@gmail.com'}
              required
              className="h-10 sm:min-h-[44px] text-[14px] sm:text-[16px]"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="text-steel-gray flex items-center gap-2 text-[13px] sm:text-base">
              <Phone className="h-3.5 w-3.5 md:h-4 md:w-4" />
              {language === 'it' ? 'Telefono' : 'Phone'}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={language === 'it' ? '+39 123 456 7890' : '+1 234 567 8900'}
              required
              className="h-10 sm:min-h-[44px] text-[14px] sm:text-[16px]"
            />
          </div>
          
          <div>
            <Label htmlFor="service" className="text-steel-gray text-[13px] sm:text-base">
              {language === 'it' ? 'Seleziona Servizio' : 'Select Service'}
            </Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger className="h-10 sm:min-h-[44px] text-[14px] sm:text-[16px]">
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
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date" className="text-steel-gray flex items-center gap-2 text-[13px] sm:text-base">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {language === 'it' ? 'Data' : 'Date'}
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className="h-10 sm:min-h-[44px] text-[14px] sm:text-[16px]"
              />
            </div>
            
            <div>
              <Label htmlFor="time" className="text-steel-gray text-[13px] sm:text-base">
                {language === 'it' ? 'Orario (Londra)' : 'Time (London)'}
              </Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="h-10 sm:min-h-[44px] text-[14px] sm:text-[16px]">
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

          <div>
            <Label htmlFor="notes" className="text-steel-gray flex items-center gap-2 text-[13px] sm:text-base">
              <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
              {language === 'it' ? 'Note (opzionale)' : 'Notes (optional)'}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'it' 
                ? 'Eventuali note o richieste specifiche...' 
                : 'Any notes or specific requests...'}
              className="min-h-[64px] sm:min-h-[80px] text-[14px] sm:text-[16px]"
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-10 sm:min-h-[48px] text-[14px] sm:text-[16px]"
            >
              {language === 'it' ? 'Annulla' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-10 sm:min-h-[48px] text-[14px] sm:text-[16px] bg-gradient-sky text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting 
                ? (language === 'it' ? 'Invio in corso...' : 'Sending...') 
                : (language === 'it' ? 'Prenota Check-in' : 'Book Check-in')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingPopup;
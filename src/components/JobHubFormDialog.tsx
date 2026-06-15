import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface JobHubFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const JobHubFormDialog = ({ isOpen, onClose }: JobHubFormDialogProps) => {
  const { language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    sectors: [] as string[],
  });

  const sectors = [
    { id: "investment-banking", label: "Investment Banking" },
    { id: "wealth-asset", label: "Wealth & Asset Management" },
    { id: "consulting", label: "Consulting" },
    { id: "private-equity", label: "Private Equity & Hedge Funds" },
    { id: "luxury", label: "Luxury Goods & Lifestyle" },
  ];

  const handleSectorToggle = (sectorId: string) => {
    setFormData(prev => ({
      ...prev,
      sectors: prev.sectors.includes(sectorId)
        ? prev.sectors.filter(s => s !== sectorId)
        : [...prev.sectors, sectorId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.email || formData.sectors.length === 0) {
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: language === 'it' 
          ? "Compila tutti i campi e seleziona almeno un settore" 
          : "Fill in all fields and select at least one sector",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const sectorLabels = formData.sectors.map(id => 
        sectors.find(s => s.id === id)?.label || id
      ).join(", ");

      const { error } = await supabase.functions.invoke('send-job-hub-request', {
        body: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          sectors: sectorLabels,
        }
      });

      if (error) throw error;

      toast({
        title: language === 'it' ? "Richiesta inviata!" : "Request sent!",
        description: language === 'it' 
          ? "Grazie per aver richiesto l'accesso! Verrai contattato entro le prossime 12 ore direttamente dal team Career Pilot." 
          : "Thank you for requesting access! You will be contacted within the next 12 hours directly by the Career Pilot team.",
      });

      setFormData({ name: "", phone: "", email: "", sectors: [] });
      onClose();
    } catch (error) {
      console.error('Error submitting job hub request:', error);
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: language === 'it' 
          ? "Si è verificato un errore. Riprova." 
          : "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">
            {language === 'it' ? 'Richiedi Accesso - Job Updates Hub' : 'Request Access - Job Updates Hub'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">
              {language === 'it' ? 'Nome e Cognome' : 'Full Name'}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">
              {language === 'it' ? 'Numero di telefono (con prefisso internazionale)' : 'Phone Number (with international prefix)'}
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+39 ..."
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label className="mb-3 block">
              {language === 'it' ? 'Settori di interesse (seleziona uno o più)' : 'Sectors of Interest (select one or more)'}
            </Label>
            <div className="space-y-2">
              {sectors.map((sector) => (
                <div key={sector.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={sector.id}
                    checked={formData.sectors.includes(sector.id)}
                    onCheckedChange={() => handleSectorToggle(sector.id)}
                  />
                  <label
                    htmlFor={sector.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {sector.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB]"
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? (language === 'it' ? 'Invio...' : 'Sending...') 
              : (language === 'it' ? 'Invia Richiesta' : 'Send Request')
            }
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JobHubFormDialog;

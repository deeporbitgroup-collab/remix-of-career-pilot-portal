import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

const sb = supabase as any;

interface AssociateAvailabilityRequestProps {
  cartItems: any[];
  clientId: string;
  clientName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AssociateAvailabilityRequest = ({ 
  cartItems, 
  clientId, 
  clientName,
  onClose, 
  onSuccess 
}: AssociateAvailabilityRequestProps) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendRequests = async () => {
    if (!message.trim()) {
      toast.error("Please add a message for the associates");
      return;
    }

    setLoading(true);

    try {
      // Get associates from cart items
      const associatesRequests = cartItems
        .filter(item => item.associate_id)
        .map(item => ({
          client_id: clientId,
          service_id: item.service_id,
          associate_id: item.associate_id,
          university: item.university,
          sector: item.sector,
          message: message.trim(),
          status: 'pending'
        }));

      if (associatesRequests.length === 0) {
        toast.error("No associates selected");
        return;
      }

      // Insert requests into database
      const { data: insertedRequests, error: insertError } = await sb
        .from('client_associate_requests')
        .insert(associatesRequests)
        .select();

      if (insertError) throw insertError;

      // Send notifications to each associate
      for (const request of insertedRequests) {
        // Get associate details
        const { data: associate, error: associateError } = await sb
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', request.associate_id)
          .single();

        if (associateError) {
          console.error('Error fetching associate:', associateError);
          continue;
        }

        // Get service details
        const { data: service, error: serviceError } = await sb
          .from('client_services')
          .select('name')
          .eq('id', request.service_id)
          .single();

        if (serviceError) {
          console.error('Error fetching service:', serviceError);
          continue;
        }

        // Send email notification
        await sb.functions.invoke('send-associate-request-notification', {
          body: {
            associateEmail: associate.email,
            associateName: `${associate.first_name} ${associate.last_name}`,
            clientName: clientName,
            serviceName: service.name,
          },
        });
      }

      toast.success(`Availability requests sent to ${associatesRequests.length} associate(s)!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error sending requests:', error);
      toast.error("Failed to send requests");
    } finally {
      setLoading(false);
    }
  };

  const associatesCount = cartItems.filter(item => item.associate_id).length;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Request Availability from Associates
          </DialogTitle>
          <DialogDescription>
            You're about to send availability requests to {associatesCount} associate(s).
            They will respond with their available time slots within 48 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="font-semibold">Selected Associates:</p>
            {cartItems
              .filter(item => item.associate)
              .map((item, idx) => (
                <div key={idx} className="text-sm">
                  • {item.associate.first_name} {item.associate.last_name} - {item.service.name}
                </div>
              ))}
          </div>

          <div>
            <Label>Your Message (Required)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself and explain what you're looking for. Associates will use this to prepare for your session..."
              className="mt-2 min-h-[120px]"
              maxLength={1000}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {message.length}/1000 characters
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">What happens next?</p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 list-disc list-inside">
              <li>Each associate receives your request via email and dashboard notification</li>
              <li>Associates respond within 48 hours with at least 4 available time slots</li>
              <li>You review all responses and select your preferred associate and time</li>
              <li>After payment confirmation, a Google Meet link is automatically generated</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSendRequests} 
              disabled={loading || !message.trim()}
              className="flex-1"
            >
              {loading ? "Sending..." : `Send Requests to ${associatesCount} Associate(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssociateAvailabilityRequest;

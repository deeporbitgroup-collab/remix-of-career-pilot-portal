import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, Euro } from "lucide-react";

interface AdditionalCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    service?: {
      category: string;
      name: string;
    };
    associate?: {
      id: string;
      first_name: string;
      last_name: string;
    } | null;
  };
  onConfirm: (reason: string) => void;
  isProcessing: boolean;
}

const TIER_PRICES: Record<string, number> = {
  'Layover': 40,
  'Take Off': 40,
  'Summit': 50,
  'Altitude': 60,
};

const AdditionalCallDialog = ({ 
  open, 
  onOpenChange, 
  project, 
  onConfirm,
  isProcessing 
}: AdditionalCallDialogProps) => {
  const [reason, setReason] = useState("");
  
  const category = project.service?.category || 'Summit';
  const price = TIER_PRICES[category] || 50;
  const associateName = project.associate 
    ? `${project.associate.first_name} ${project.associate.last_name}` 
    : 'your Associate';

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5" />
            Book an Additional Call
          </DialogTitle>
          <DialogDescription>
            Schedule an extra session with {associateName} to discuss further questions about your project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pricing info */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">Service Tier</p>
              <p className="text-xs text-muted-foreground">{category}</p>
            </div>
            <Badge variant="secondary" className="text-base px-3 py-1">
              <Euro className="h-4 w-4 mr-1" />
              {price}
            </Badge>
          </div>

          {/* Reason input */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for the Additional Call <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Please describe the reason for this additional call and the topics/questions you would like to discuss..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This helps your Associate prepare for the session.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || isProcessing}
          >
            {isProcessing ? "Processing..." : `Continue to Checkout (€${price})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdditionalCallDialog;

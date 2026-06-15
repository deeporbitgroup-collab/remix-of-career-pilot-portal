import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Users, 
  ClipboardCheck, 
  Handshake,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NextStepSelectorProps {
  studentId: string;
  studentName: string;
  studentEmail: string;
  companyId: string;
  companyName: string;
  companyEmail: string;
  onComplete?: () => void;
}

const NEXT_STEP_OPTIONS = [
  {
    value: 'INTERVIEW',
    label: 'Interview',
    description: 'Schedule an interview with the student',
    icon: Users
  },
  {
    value: 'ONLINE_ASSESSMENT',
    label: 'Online Assessment',
    description: 'Send an online assessment or test',
    icon: ClipboardCheck
  },
  {
    value: 'DIRECT_HIRING',
    label: 'Direct Hiring',
    description: 'Proceed directly with a job/internship offer',
    icon: Handshake
  }
];

export const NextStepSelector = ({
  studentId,
  studentName,
  studentEmail,
  companyId,
  companyName,
  companyEmail,
  onComplete
}: NextStepSelectorProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [processCreated, setProcessCreated] = useState(false);

  const handleConfirm = async () => {
    if (!selectedStep) {
      toast({
        title: "Selection required",
        description: "Please select a next step",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Check if process already exists
      const { data: existing } = await supabase
        .from('recruiting_processes')
        .select('id')
        .eq('student_id', studentId)
        .eq('company_id', companyId)
        .eq('status', 'ACTIVE')
        .single();

      if (existing) {
        toast({
          title: "Process exists",
          description: "An active recruiting process already exists for this student",
          variant: "destructive"
        });
        setOpen(false);
        return;
      }

      // Create recruiting process
      const { error: insertError } = await supabase
        .from('recruiting_processes')
        .insert([{
          student_id: studentId,
          company_id: companyId,
          next_step: selectedStep as 'INTERVIEW' | 'ONLINE_ASSESSMENT' | 'DIRECT_HIRING',
          status: 'ACTIVE' as 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
        }]);

      if (insertError) throw insertError;

      // Send notification emails
      await supabase.functions.invoke('send-recruiting-next-step', {
        body: {
          studentId,
          studentName,
          studentEmail,
          companyId,
          companyName,
          companyEmail,
          nextStep: selectedStep
        }
      });

      toast({
        title: "Success! 🎉",
        description: `Recruiting process started with ${studentName}. All parties have been notified.`,
        duration: 5000
      });

      setProcessCreated(true);
      setOpen(false);
      onComplete?.();
    } catch (error: any) {
      console.error('Error creating recruiting process:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create recruiting process",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (processCreated) {
    return (
      <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Active Recruiting
      </Badge>
    );
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-primary hover:bg-primary/90 flex items-center gap-2"
      >
        <Target className="h-4 w-4" />
        Choose Next Step
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Choose Next Step
            </DialogTitle>
            <DialogDescription>
              How would you like to proceed with <strong>{studentName}</strong>?
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={selectedStep}
            onValueChange={setSelectedStep}
            className="space-y-3 py-4"
          >
            {NEXT_STEP_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Label
                  key={option.value}
                  htmlFor={option.value}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedStep === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{option.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>

          <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p>After confirmation:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>{studentName} will be notified</li>
              <li>Career Pilot will be notified</li>
              <li>A shared "Active Recruiting" space will be created</li>
            </ul>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedStep || submitting}>
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Confirming...
                </>
              ) : (
                'Confirm & Notify'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NextStepSelector;

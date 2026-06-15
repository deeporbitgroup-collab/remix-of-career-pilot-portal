import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Star } from "lucide-react";
const sb = supabase as any;

interface ClientFeedbackProps {
  clientId: string;
}

const ClientFeedback = ({ clientId }: ClientFeedbackProps) => {
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    setIsSubmitting(true);
    try {
      const ratingValue = parseInt(rating);
      
      const { error } = await sb
        .from('client_feedback')
        .insert({
          client_id: clientId,
          rating: ratingValue,
          comment: comment.trim(),
        });

      if (error) throw error;

      // Send confirmation email
      try {
        await sb.functions.invoke('send-client-feedback-confirmation', {
          body: {
            clientId,
            rating: ratingValue
          }
        });
      } catch (emailError) {
        console.error('Error sending feedback confirmation email:', emailError);
        // Don't fail the whole operation if email fails
      }

      toast.success("Thank you for your feedback!");
      setComment("");
      setRating("5");
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>How would you rate our service?</Label>
          <RadioGroup value={rating} onValueChange={setRating} className="flex gap-4 mt-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <div key={value} className="flex items-center space-x-2">
                <RadioGroupItem value={value.toString()} id={`rating-${value}`} />
                <Label htmlFor={`rating-${value}`} className="flex items-center gap-1 cursor-pointer">
                  {value}
                  <Star className="h-4 w-4 fill-primary" />
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label>Your Feedback</Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with Career Pilot..."
            className="min-h-[150px] mt-2"
          />
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ClientFeedback;

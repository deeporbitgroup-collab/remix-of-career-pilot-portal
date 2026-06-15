import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Calendar, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface AvailabilityReviewProps {
  clientId: string;
}

interface RequestWithAvailability {
  id: string;
  associate_id: string;
  service_id: string;
  status: string;
  proposed_timeslots: string | any[];
  associate: {
    first_name: string;
    last_name: string;
    photo_url: string;
    university: string;
    sector: string;
  };
  service: {
    name: string;
    price: number;
  };
}

const AvailabilityReview = ({ clientId }: AvailabilityReviewProps) => {
  const [requests, setRequests] = useState<RequestWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{ requestId: string; slot: any } | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchAvailabilities();
  }, [clientId]);

  const fetchAvailabilities = async () => {
    try {
      const { data, error } = await supabase
        .from('client_associate_requests')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'availability_provided' as any);

      if (error) throw error;
      
      // Fetch associated data separately
      const enrichedData = await Promise.all(
        (data || []).map(async (req) => {
          // Get associate details
          const { data: associate } = await supabase
            .from('profiles')
            .select('first_name, last_name, photo_url, university, sector')
            .eq('id', req.associate_id)
            .single();

          // Get service details
          const { data: service } = await supabase
            .from('client_services')
            .select('name, price')
            .eq('id', req.service_id)
            .single();

          return {
            ...req,
            associate: associate || { first_name: '', last_name: '', photo_url: '', university: '', sector: '' },
            service: service || { name: '', price: 0 },
            proposed_timeslots: typeof req.proposed_timeslots === 'string' 
              ? JSON.parse(req.proposed_timeslots)
              : (Array.isArray(req.proposed_timeslots) ? req.proposed_timeslots : [])
          };
        })
      );
      
      setRequests(enrichedData as any);
    } catch (error: any) {
      console.error('Error fetching availabilities:', error);
      toast.error("Failed to load availabilities");
    } finally {
      setLoading(false);
    }
  };

  const confirmSelection = async () => {
    if (!selectedSlot) return;

    setConfirming(true);

    try {
      // Update request with selected timeslot
      const { error: updateError } = await supabase
        .from('client_associate_requests')
        .update({
          selected_timeslot: JSON.stringify(selectedSlot.slot) as any,
          status: 'awaiting_payment' as any
        })
        .eq('id', selectedSlot.requestId);

      if (updateError) throw updateError;

      toast.success("Time slot confirmed! Please proceed to payment.");
      fetchAvailabilities();
      setSelectedSlot(null);
    } catch (error: any) {
      console.error('Error confirming selection:', error);
      toast.error("Failed to confirm selection");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No availability responses yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Associates will respond within 48 hours
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Time Slots</CardTitle>
          <CardDescription>
            Review and select your preferred time slot for each associate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {requests.map((request) => (
            <Card key={request.id} className="border-primary/20">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={request.associate.photo_url} />
                    <AvatarFallback>
                      {request.associate.first_name[0]}{request.associate.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {request.associate.first_name} {request.associate.last_name}
                    </CardTitle>
                    <CardDescription>{request.service.name}</CardDescription>
                    <div className="flex gap-2 mt-2">
                      {request.associate.university && (
                        <Badge variant="secondary" className="text-xs">
                          {request.associate.university}
                        </Badge>
                      )}
                      {request.associate.sector && (
                        <Badge variant="outline" className="text-xs">
                          {request.associate.sector}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className="text-lg">€{request.service.price}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Available Time Slots
                </h4>
                <div className="grid gap-2">
                  {Array.isArray(request.proposed_timeslots) && request.proposed_timeslots.map((slot: any, index: number) => {
                    const isSelected = selectedSlot?.requestId === request.id && 
                                     selectedSlot?.slot === slot;
                    return (
                      <Button
                        key={index}
                        variant={isSelected ? "default" : "outline"}
                        className="justify-start h-auto py-3"
                        onClick={() => setSelectedSlot({ requestId: request.id, slot })}
                      >
                        <div className="text-left">
                          <div className="font-semibold">
                            {format(new Date(slot.date), 'EEEE, MMMM d, yyyy')}
                          </div>
                          <div className="text-sm">
                            {slot.startTime} - {slot.endTime}
                          </div>
                        </div>
                        {isSelected && <CheckCircle className="ml-auto h-5 w-5" />}
                      </Button>
                    );
                  })}
                </div>
                {selectedSlot?.requestId === request.id && (
                  <Button
                    onClick={confirmSelection}
                    disabled={confirming}
                    className="w-full mt-4"
                  >
                    {confirming ? "Confirming..." : "Confirm & Proceed to Payment"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AvailabilityReview;

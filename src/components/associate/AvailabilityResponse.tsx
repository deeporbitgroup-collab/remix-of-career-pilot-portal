import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";

interface AvailabilityResponseProps {
  associateId: string;
}

interface PendingRequest {
  id: string;
  client_id: string;
  service_id: string;
  message: string;
  created_at: string;
  service: {
    name: string;
  };
  client: {
    first_name: string;
    last_name: string;
  };
}

interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
}

const AvailabilityResponse = ({ associateId }: AvailabilityResponseProps) => {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingRequests();
  }, [associateId]);

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('client_associate_requests')
        .select(`
          *,
          service:client_services(name),
          client:client_users(first_name, last_name)
        `)
        .eq('associate_id', associateId)
        .eq('status', 'pending');

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = () => {
    if (!selectedDate || !startTime || !endTime) {
      toast.error("Please select date and time");
      return;
    }

    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }

    setTimeSlots([...timeSlots, { date: selectedDate, startTime, endTime }]);
    setStartTime("");
    setEndTime("");
    toast.success("Time slot added");
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const submitAvailability = async () => {
    if (timeSlots.length < 4) {
      toast.error("Please provide at least 4 time slots");
      return;
    }

    if (!selectedRequest) return;

    setSubmitting(true);

    try {
      // Update request with proposed timeslots
      const { error: updateError } = await supabase
        .from('client_associate_requests')
        .update({
          proposed_timeslots: JSON.stringify(timeSlots) as any,
          status: 'availability_provided' as any
        })
        .eq('id', selectedRequest);

      if (updateError) throw updateError;

      // Get request details for notifications
      const request = requests.find(r => r.id === selectedRequest);
      if (!request) throw new Error("Request not found");

      // Send notifications
      await supabase.functions.invoke('send-availability-notifications', {
        body: {
          requestId: selectedRequest,
          associateId,
          clientId: request.client_id,
          serviceName: request.service.name,
          timeslots: timeSlots
        }
      });

      toast.success("Availability submitted successfully!");
      setTimeSlots([]);
      setSelectedRequest(null);
      fetchPendingRequests();
    } catch (error: any) {
      console.error('Error submitting availability:', error);
      toast.error("Failed to submit availability");
    } finally {
      setSubmitting(false);
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
          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No pending availability requests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Availability Requests</CardTitle>
          <CardDescription>
            Provide at least 4 available time slots for each request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="border-primary/20">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {request.service.name}
                    </CardTitle>
                    <CardDescription>
                      From: {request.client.first_name} {request.client.last_name}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-1">Client's message:</p>
                  <p className="text-sm text-muted-foreground">{request.message}</p>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setSelectedRequest(request.id)}
                  className="w-full"
                  disabled={selectedRequest !== null}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Provide Availability
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {selectedRequest && (
        <Card>
          <CardHeader>
            <CardTitle>Provide Your Availability</CardTitle>
            <CardDescription>
              Add at least 4 available time slots (minimum 1 hour each)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Date</label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <Button onClick={addTimeSlot} className="w-full">
                  Add Time Slot
                </Button>
              </div>
            </div>

            {timeSlots.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">
                  Added Time Slots ({timeSlots.length}/4 minimum)
                </h4>
                <div className="space-y-2">
                  {timeSlots.map((slot, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="text-sm">
                        {format(slot.date, 'PPP')} • {slot.startTime} - {slot.endTime}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTimeSlot(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null);
                  setTimeSlots([]);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={submitAvailability}
                disabled={timeSlots.length < 4 || submitting}
                className="flex-1"
              >
                {submitting ? "Submitting..." : "Submit Availability"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AvailabilityResponse;

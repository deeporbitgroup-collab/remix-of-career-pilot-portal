import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

const AdminClientFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await sb
        .from('client_feedback')
        .select(`
          *,
          client_users!inner(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error: any) {
      console.error('Error fetching feedbacks:', error);
      toast.error("Failed to load feedbacks");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Feedbacks</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading feedbacks...</p>
        ) : feedbacks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No feedbacks yet</p>
        ) : (
          <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbacks.map((feedback) => (
                <TableRow key={feedback.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {feedback.client_users.first_name} {feedback.client_users.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{feedback.client_users.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">{renderStars(feedback.rating)}</div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2">{feedback.comment}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(feedback.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminClientFeedback;
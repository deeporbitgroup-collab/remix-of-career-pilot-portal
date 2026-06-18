import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Filter, User, Download, Calendar, Eye, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format, startOfWeek, addDays } from "date-fns";
import { it } from "date-fns/locale";

interface Associate {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  company_name: string | null;
  status: string;
  created_at: string;
}

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

export default function Associates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [filteredAssociates, setFilteredAssociates] = useState<Associate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [availabilitySheet, setAvailabilitySheet] = useState<{open: boolean; userId: string | null}>({ open: false, userId: null });
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  useEffect(() => {
    fetchAssociates();
  }, []);

  useEffect(() => {
    filterAssociatesList();
  }, [associates, searchQuery, filterStatus]);

  const fetchAssociates = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "ASSOCIATE")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssociates(data || []);
    } catch (error) {
      console.error("Error fetching associates:", error);
      toast({
        title: "Error",
        description: "Unable to load associates",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterAssociatesList = () => {
    let filtered = [...associates];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (associate) =>
          associate.first_name?.toLowerCase().includes(query) ||
          associate.last_name?.toLowerCase().includes(query) ||
          associate.email.toLowerCase().includes(query) ||
          associate.company_name?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((associate) => associate.status === filterStatus);
    }

    setFilteredAssociates(filtered);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      approved: "default",
      pending: "secondary",
      rejected: "destructive",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status === 'approved' ? 'Approved' : status === 'pending' ? 'Pending' : status === 'rejected' ? 'Rejected' : status}
      </Badge>
    );
  };

  const getDisplayName = (associate: Associate) => {
    if (associate.first_name || associate.last_name) {
      return `${associate.first_name || ""} ${associate.last_name || ""}`.trim();
    }
    return associate.email;
  };

  const handleDownloadCV = async (e: React.MouseEvent, userId: string, userName: string) => {
    e.stopPropagation();
    try {
      const { data: latest, error: rpcError } = await supabase.rpc('doc_latest', { 
        _user_id: userId, 
        _type: 'CV' 
      });

      if (rpcError) throw rpcError;

      if (latest && latest.storage_path) {
        const { data: signed, error: signedError } = await supabase.storage
          .from('documents')
          .createSignedUrl(latest.storage_path, 300); // 5 minuti

        if (signedError) throw signedError;

        const fullUrl = signed?.signedUrl?.startsWith('http') 
          ? signed.signedUrl 
          : `https://gqmmgyoviwhgqvzqbbja.supabase.co/storage/v1${signed?.signedUrl}`;
        if (!fullUrl) throw new Error('URL not generated');

        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error('Download failed');
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = latest.filename || 'cv.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      } else {
        toast({
          title: "CV not available",
          description: `${userName} has not uploaded a CV yet`,
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error("Error downloading CV:", error);
      toast({
        title: "Error",
        description: error.message || "Unable to download the CV",
        variant: "destructive"
      });
    }
  };

  const handleViewAvailability = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    setLoadingAvailability(true);
    
    try {
      const todayISO = new Date().toISOString().slice(0, 10);
      const { data: slots, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('user_id', userId)
        .gte('date', todayISO)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      setAvailabilitySlots(slots || []);
      setAvailabilitySheet({ open: true, userId });
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast({
        title: "Error",
        description: "Unable to load availability",
        variant: "destructive"
      });
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleOpenProfile = (e: React.MouseEvent, associateId: string) => {
    e.stopPropagation();
    navigate(`/app/admin/associates/${associateId}`);
  };

  const renderAvailabilityCalendar = () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2">
          {weekDays.map(day => {
            const dayISO = day.toISOString().slice(0, 10);
            const daySlots = availabilitySlots.filter(slot => slot.date === dayISO);
            
            return (
              <div key={dayISO} className="border rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2">
                  {format(day, "EEEE d MMMM", { locale: it })}
                </h4>
                {daySlots.length > 0 ? (
                  <div className="space-y-1">
                    {daySlots.map(slot => (
                      <div key={slot.id} className="text-sm text-muted-foreground">
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not available</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/app/admin")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Associates Management</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all registered associates
          </p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredAssociates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No associates found matching the specified search criteria
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssociates.map((associate) => (
              <Card 
                key={associate.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/app/admin/associates/${associate.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {getDisplayName(associate)}
                        </CardTitle>
                        {associate.company_name && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {associate.company_name}
                          </p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(associate.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{associate.email}</span>
                    </div>
                    {associate.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{associate.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="flex gap-2 w-full">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => handleOpenProfile(e, associate.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Profile
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => handleDownloadCV(e, associate.id, getDisplayName(associate))}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      CV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => handleViewAvailability(e, associate.id)}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Avail.
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Sheet open={availabilitySheet.open} onOpenChange={(open) => setAvailabilitySheet({ open, userId: null })}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Weekly availability</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {loadingAvailability ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : availabilitySlots.length > 0 ? (
              renderAvailabilityCalendar()
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No availability recorded
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
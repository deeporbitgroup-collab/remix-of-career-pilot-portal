import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  CheckCircle, XCircle, User, Building, Mail, Phone,
  Clock, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface PendingUser {
  id: string;
  email: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  role: 'ASSOCIATE' | 'PARTNER' | 'ADMIN';
  created_at: string;
}

interface PendingApprovalsProps {
  onUpdate?: () => void;
  roleFilter?: 'ASSOCIATE' | 'PARTNER';
}

const PendingApprovals = ({ onUpdate, roleFilter }: PendingApprovalsProps) => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingUsers();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('pending-approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'status=eq.pending'
        },
        () => {
          fetchPendingUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending');
      
      if (roleFilter) {
        query = query.eq('role', roleFilter);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare le richieste in attesa"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setProcessingId(userId);
    
    try {
      // Get user details
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Get current admin user
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      
      // Update user status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Send approval email
      if (userData) {
        await supabase.functions.invoke('send-approval-email', {
          body: {
            email: userData.email,
            name: userData.first_name && userData.last_name 
              ? `${userData.first_name} ${userData.last_name}`
              : userData.company_name || userData.email,
            approved: true
          }
        });
      }

      // Log the activity
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          actor_admin_id: adminUser?.id,
          action: 'USER_APPROVED',
          target_type: 'USER',
          target_id: userId,
          meta: { approved_at: new Date().toISOString() }
        });

      if (logError) console.error('Error logging activity:', logError);

      // Create notification for the user
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Account Approvato',
          message: 'Il tuo account è stato approvato. Ora puoi accedere alla tua area riservata.',
          type: 'approval'
        });

      if (notifError) console.error('Error creating notification:', notifError);

      toast({
        title: "Utente approvato",
        description: "L'utente può ora accedere alla piattaforma"
      });

      fetchPendingUsers();
      onUpdate?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setProcessingId(userId);
    
    try {
      // Get user details
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Get current admin user
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      
      // Update user status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Send rejection email
      if (userData) {
        await supabase.functions.invoke('send-approval-email', {
          body: {
            email: userData.email,
            name: userData.first_name && userData.last_name 
              ? `${userData.first_name} ${userData.last_name}`
              : userData.company_name || userData.email,
            approved: false
          }
        });
      }

      // Log the activity
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          actor_admin_id: adminUser?.id,
          action: 'USER_REJECTED',
          target_type: 'USER',
          target_id: userId,
          meta: { rejected_at: new Date().toISOString() }
        });

      if (logError) console.error('Error logging activity:', logError);

      toast({
        title: "Richiesta rifiutata",
        description: "L'utente è stato informato del rifiuto"
      });

      fetchPendingUsers();
      onUpdate?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (pendingUsers.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Nessuna richiesta in attesa</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingUsers.map((user) => (
        <Card key={user.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {user.role === 'ASSOCIATE' ? (
                    <User className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Building className="h-4 w-4 text-green-500" />
                  )}
                  <CardTitle className="text-lg">
                    {user.role === 'ASSOCIATE' 
                      ? `${user.first_name || ''} ${user.last_name || ''}`
                      : user.company_name}
                  </CardTitle>
                  <Badge variant={user.role === 'ASSOCIATE' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {format(new Date(user.created_at), 'dd MMM yyyy HH:mm', { locale: it })}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{user.phone}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={() => handleApprove(user.id)}
                disabled={processingId === user.id}
              >
                {processingId === user.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Approva
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => handleReject(user.id)}
                disabled={processingId === user.id}
              >
                {processingId === user.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Rifiuta
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PendingApprovals;
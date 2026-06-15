import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, UserCheck, UserX, Clock, Activity
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface ActivityLog {
  id: string;
  actor_admin_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  meta: any;
  created_at: string;
  actor?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

const ActivityLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          actor:profiles!activity_logs_actor_admin_id_fkey(email, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch(action) {
      case 'USER_APPROVED':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'USER_REJECTED':
        return <UserX className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch(action) {
      case 'USER_APPROVED':
        return 'Utente Approvato';
      case 'USER_REJECTED':
        return 'Utente Rifiutato';
      case 'KPI_UPDATED':
        return 'KPI Aggiornato';
      default:
        return action;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Log Attività Recenti
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            Nessuna attività registrata
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                {getActionIcon(log.action)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getActionLabel(log.action)}</span>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: it })}
                    </Badge>
                  </div>
                  {log.actor && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Eseguito da: {log.actor.first_name} {log.actor.last_name} ({log.actor.email})
                    </p>
                  )}
                  {log.meta && Object.keys(log.meta).length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {JSON.stringify(log.meta, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLogs;
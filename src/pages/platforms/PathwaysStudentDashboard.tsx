import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePathwaysAuth } from '@/contexts/PathwaysAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { FileText, CheckCircle, XCircle, LogOut, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PathwaysStudentDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = usePathwaysAuth();
  const { language } = useI18n();
  const { toast } = useToast();

  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'STUDENT') {
      navigate('/platforms/pathways');
      return;
    }
    loadApplications();

    // Subscribe to real-time application updates
    const applicationsChannel = supabase
      .channel('pathways_applications_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pathways_applications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Application updated:', payload);
          loadApplications();
          
          // Show toast notification
          if (payload.new.status === 'accepted' || payload.new.status === 'rejected') {
            toast({
              title: payload.new.status === 'accepted' 
                ? (language === 'it' ? '🎉 Candidatura Accettata!' : '🎉 Application Accepted!')
                : (language === 'it' ? 'Candidatura Rifiutata' : 'Application Rejected'),
              description: payload.new.status === 'accepted'
                ? (language === 'it' ? 'La tua candidatura è stata accettata. Verrai contattato presto!' : 'Your application has been accepted. You will be contacted soon!')
                : (language === 'it' ? 'La tua candidatura non è stata accettata.' : 'Your application was not accepted.'),
              variant: payload.new.status === 'accepted' ? 'default' : 'destructive',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(applicationsChannel);
    };
  }, [user, navigate, language]);

  const loadApplications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pathways_applications')
      .select(`
        *,
        provider:pathways_providers(name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    setApplications(data || []);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; color: string; label: string }> = {
      submitted: {
        icon: Clock,
        color: 'bg-yellow-100 text-yellow-800',
        label: language === 'it' ? 'In attesa' : 'Pending',
      },
      in_review: {
        icon: Clock,
        color: 'bg-blue-100 text-blue-800',
        label: language === 'it' ? 'In revisione' : 'In Review',
      },
      accepted: {
        icon: CheckCircle,
        color: 'bg-green-100 text-green-800',
        label: language === 'it' ? 'Accettata' : 'Accepted',
      },
      rejected: {
        icon: XCircle,
        color: 'bg-red-100 text-red-800',
        label: language === 'it' ? 'Rifiutata' : 'Rejected',
      },
    };

    const { icon: Icon, color, label } = config[status] || config.submitted;

    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const pendingApplications = applications.filter(app => 
    app.status === 'submitted' || app.status === 'in_review'
  );
  const resultApplications = applications.filter(app => 
    app.status === 'accepted' || app.status === 'rejected'
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/platforms/pathways/catalog')}
            >
              ← {language === 'it' ? 'Catalogo' : 'Catalog'}
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">
              {language === 'it' ? 'La Mia Dashboard' : 'My Dashboard'}
            </h1>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              logout();
              navigate('/platforms/pathways');
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {language === 'it' ? 'Esci' : 'Logout'}
          </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl p-6">
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="applications">
              <FileText className="mr-2 h-4 w-4" />
              {language === 'it' ? 'Le Mie Candidature' : 'My Applications'}
            </TabsTrigger>
            <TabsTrigger value="results">
              <CheckCircle className="mr-2 h-4 w-4" />
              {language === 'it' ? 'Esiti' : 'Application Results'}
            </TabsTrigger>
          </TabsList>

          {/* My Applications Tab */}
          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'it' ? 'Candidature Inviate' : 'Submitted Applications'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingApplications.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      {language === 'it' 
                        ? 'Non hai ancora inviato candidature' 
                        : 'You haven\'t submitted any applications yet'}
                    </p>
                    <Button 
                      className="mt-4" 
                      onClick={() => navigate('/platforms/pathways/catalog')}
                    >
                      {language === 'it' ? 'Vai al Catalogo' : 'Go to Catalog'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApplications.map((app) => (
                      <Card key={app.id} className="border-l-4 border-l-primary">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {app.organization_name || app.provider?.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {language === 'it' ? 'Inviata il' : 'Submitted on'}{' '}
                                {new Date(app.created_at).toLocaleDateString(
                                  language === 'it' ? 'it-IT' : 'en-US'
                                )}
                              </p>
                            </div>
                            {getStatusBadge(app.status)}
                          </div>
                          <div className="grid md:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium">
                                {language === 'it' ? 'Periodo:' : 'Period:'}
                              </span>{' '}
                              {app.period_from} → {app.period_to}
                            </div>
                            <div>
                              <span className="font-medium">
                                {language === 'it' ? 'Categoria:' : 'Category:'}
                              </span>{' '}
                              {app.category}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Application Results Tab */}
          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'it' ? 'Esiti delle Candidature' : 'Application Results'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resultApplications.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      {language === 'it' 
                        ? 'Nessun esito disponibile al momento' 
                        : 'No results available at the moment'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {resultApplications.map((app) => (
                      <Card 
                        key={app.id} 
                        className={`border-l-4 ${
                          app.status === 'accepted' 
                            ? 'border-l-green-500' 
                            : 'border-l-red-500'
                        }`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {app.organization_name || app.provider?.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {language === 'it' ? 'Inviata il' : 'Submitted on'}{' '}
                                {new Date(app.created_at).toLocaleDateString(
                                  language === 'it' ? 'it-IT' : 'en-US'
                                )}
                              </p>
                            </div>
                            {getStatusBadge(app.status)}
                          </div>
                          <div className="grid md:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium">
                                {language === 'it' ? 'Periodo:' : 'Period:'}
                              </span>{' '}
                              {app.period_from} → {app.period_to}
                            </div>
                            <div>
                              <span className="font-medium">
                                {language === 'it' ? 'Categoria:' : 'Category:'}
                              </span>{' '}
                              {app.category}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PathwaysStudentDashboard;

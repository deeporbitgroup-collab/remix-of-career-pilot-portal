import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Clock, FileText, Upload, Video, ChevronDown, ChevronUp, User, Download, Eye, Link as LinkIcon, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import SharedDocuments from "@/components/client-portal/SharedDocuments";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PrimaryUnavailableDialog from "@/components/associate/PrimaryUnavailableDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const sb = supabase as any;

interface AssociateClientProjectsProps {
  associateId: string;
  language: string;
  mode?: 'all' | 'active' | 'completed';
}

const statusLabels: Record<string, { label: string; labelIt: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", labelIt: "In attesa", variant: "outline" },
  slots_proposed: { label: "Select Time Slot", labelIt: "Seleziona orario", variant: "default" },
  scheduled: { label: "Scheduled", labelIt: "Schedulato", variant: "secondary" },
  in_progress: { label: "In Progress", labelIt: "In corso", variant: "default" },
  review: { label: "In Review", labelIt: "In revisione", variant: "secondary" },
  completed: { label: "Completed", labelIt: "Completato", variant: "secondary" },
};

const AssociateClientProjects = ({ associateId, language, mode = 'all' }: AssociateClientProjectsProps) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [clientFilter, setClientFilter] = useState<string>('all');

  useEffect(() => {
    fetchProjects();

    // Real-time subscription
    const subscription = sb
      .channel('associate_projects_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'client_projects', filter: `associate_id=eq.${associateId}` },
        () => fetchProjects()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [associateId]);

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error } = await sb
        .from('client_projects')
        .select(`
          *,
          service:client_services(id, name, price, category, subcategory),
          order:client_orders(id, created_at, payment_status),
          client:client_users(id, first_name, last_name, student_status, cv_url, linkedin_url, photo_url, brief_overview)
        `)
        .eq('associate_id', associateId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with meeting slots
      const enrichedProjects = await Promise.all(
        (projectsData || []).map(async (project: any) => {
          const { data: slots } = await sb
            .from('client_meeting_slots')
            .select('*')
            .eq('project_id', project.id)
            .order('proposed_time', { ascending: true });

          return {
            ...project,
            meetingSlots: slots || [],
          };
        })
      );

      setProjects(enrichedProjects);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error(language === 'it' ? "Errore nel caricamento progetti" : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = async (projectId: string, slotId: string, slotTime: string) => {
    try {
      const { error } = await sb.functions.invoke('handle-primary-response', {
        body: { projectId, action: 'select_original', slotId },
      });
      if (error) throw error;
      toast.success(language === 'it' ? "Orario confermato!" : "Time slot confirmed!");
      fetchProjects();
    } catch (error: any) {
      console.error('Error selecting slot:', error);
      toast.error(language === 'it' ? "Errore nella selezione" : "Failed to select time slot");
    }
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{language === 'it' ? 'I miei progetti' : 'My Client Projects'}</CardTitle>
          <CardDescription>
            {language === 'it' 
              ? 'I progetti assegnati appariranno qui' 
              : 'Your assigned client projects will appear here'}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground">
            {language === 'it' ? 'Nessun progetto assegnato' : 'No assigned projects yet'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const uniqueClients = Array.from(
    new Map(
      projects.filter((p) => p.client).map((p) => [p.client.id, p.client])
    ).values()
  );

  const filteredProjects = clientFilter === 'all'
    ? projects
    : projects.filter((p) => p.client?.id === clientFilter);

  const activeProjects = filteredProjects.filter(p => p.status !== 'completed');
  const completedProjects = filteredProjects.filter(p => p.status === 'completed');

  const showActive = mode === 'all' || mode === 'active';
  const showCompleted = mode === 'all' || mode === 'completed';

  // Split per-component projects into package groups (kept together) + singles,
  // so each client's package reads as one tidy block instead of scattered cards.
  const splitByPackage = (list: any[]) => {
    const packageGroups: { key: string; name: string; projects: any[] }[] = [];
    const singles: any[] = [];
    const index = new Map<string, number>();
    list.forEach((p) => {
      const name = p.package_name as string | null;
      if (!name) {
        singles.push(p);
        return;
      }
      const key = `${p.client?.id || "x"}:${name}`;
      if (index.has(key)) {
        packageGroups[index.get(key)!].projects.push(p);
      } else {
        index.set(key, packageGroups.length);
        packageGroups.push({ key, name, projects: [p] });
      }
    });
    return { packageGroups, singles };
  };

  const renderProjectGrid = (list: any[], renderCard: (project: any) => JSX.Element) => {
    const { packageGroups, singles } = splitByPackage(list);
    return (
      <div className="space-y-4">
        {packageGroups.map((group) => (
          <div key={group.key} className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-primary">{group.name}</span>
              {group.projects[0]?.client && (
                <span className="text-xs text-muted-foreground">
                  · {group.projects[0].client.first_name} {group.projects[0].client.last_name}
                </span>
              )}
              <Badge variant="outline" className="ml-auto text-xs">
                {group.projects.length} {language === 'it' ? 'servizi' : 'services'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.projects.map(renderCard)}
            </div>
          </div>
        ))}
        {singles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {singles.map(renderCard)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {uniqueClients.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">
            {language === 'it' ? 'Filtra per cliente:' : 'Filter by client:'}
          </span>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {language === 'it' ? 'Tutti i clienti' : 'All clients'}
              </SelectItem>
              {uniqueClients.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {clientFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setClientFilter('all')}>
              {language === 'it' ? 'Cancella filtro' : 'Clear filter'}
            </Button>
          )}
        </div>
      )}
      {showActive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              {language === 'it' ? 'Progetti Attivi' : 'Active Projects'}
            </CardTitle>
            <CardDescription>
              {language === 'it'
                ? 'Gestisci i tuoi progetti con i clienti'
                : 'Manage your ongoing client projects'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeProjects.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {language === 'it' ? 'Nessun progetto attivo' : 'No active projects'}
              </p>
            ) : (
              renderProjectGrid(activeProjects, (project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  associateId={associateId}
                  language={language}
                  onSelectSlot={handleSelectSlot}
                  isExpanded={expandedProjects.has(project.id)}
                  onToggle={() => toggleProject(project.id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed Projects */}
      {showCompleted && (
        <Card>
          <CardHeader>
            <CardTitle>{language === 'it' ? 'Progetti Completati' : 'Completed Projects'}</CardTitle>
            <CardDescription>
              {language === 'it' ? 'Storico dei progetti chiusi' : 'History of closed projects'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {completedProjects.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {language === 'it' ? 'Nessun progetto completato' : 'No completed projects yet'}
              </p>
            ) : (
              renderProjectGrid(completedProjects, (project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  associateId={associateId}
                  language={language}
                  onSelectSlot={handleSelectSlot}
                  isExpanded={expandedProjects.has(project.id)}
                  onToggle={() => toggleProject(project.id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface ProjectCardProps {
  project: any;
  associateId: string;
  language: string;
  onSelectSlot: (projectId: string, slotId: string, slotTime: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const ProjectCard = ({ project, associateId, language, onSelectSlot, isExpanded, onToggle }: ProjectCardProps) => {
  const statusConfig = statusLabels[project.status] || { label: project.status, labelIt: project.status, variant: "outline" as const };
  const statusLabel = language === 'it' ? statusConfig.labelIt : statusConfig.label;

  const [associateProfile, setAssociateProfile] = useState<any>(null);
  const [briefOverviewOpen, setBriefOverviewOpen] = useState(false);
  const [unavailableOpen, setUnavailableOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', associateId)
        .single();
      setAssociateProfile(data);
    };
    fetchProfile();
  }, [associateId]);

  const handleDownloadCV = async () => {
    if (!project.client?.cv_url) {
      toast.error(language === 'it' ? 'CV non disponibile' : 'CV not available');
      return;
    }
    
    try {
      // Extract the storage path from the URL
      const url = project.client.cv_url;
      let storagePath = '';
      
      if (url.includes('/storage/v1/object/public/')) {
        storagePath = url.split('/storage/v1/object/public/')[1];
      } else if (url.includes('/storage/v1/object/sign/')) {
        storagePath = url.split('/storage/v1/object/sign/')[1].split('?')[0];
      } else {
        // Assume it's already a relative path
        storagePath = url;
      }
      
      const bucketName = storagePath.split('/')[0];
      const filePath = storagePath.replace(`${bucketName}/`, '');
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath);
      
      if (error) throw error;
      
      const blob = new Blob([data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `CV_${project.client.first_name}_${project.client.last_name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success(language === 'it' ? 'CV scaricato!' : 'CV downloaded!');
    } catch (error) {
      console.error('Error downloading CV:', error);
      toast.error(language === 'it' ? 'Errore nel download del CV' : 'Failed to download CV');
    }
  };

  const renderBriefOverview = () => {
    let brief: any = project.client?.brief_overview;
    if (!brief) return null;

    // brief_overview was sometimes stored as a JSON string — parse if needed
    if (typeof brief === 'string') {
      try {
        brief = JSON.parse(brief);
      } catch (e) {
        return (
          <p className="text-sm text-muted-foreground">
            {language === 'it' ? 'Brief overview non leggibile' : 'Brief overview unreadable'}
          </p>
        );
      }
    }

    const isHighSchool = brief.type === 'high_school';
    const isUniversity = brief.type === 'university';
    const data = brief.data;
    
    if (!data) {
      return (
        <p className="text-sm text-muted-foreground">
          {language === 'it' ? 'Nessun brief overview disponibile' : 'No brief overview available'}
        </p>
      );
    }

    // Helper to format date ranges
    const formatDateRange = (start: string, end: string) => {
      if (!start && !end) return '';
      if (!end) return start;
      return `${start} — ${end}`;
    };

    // High School Brief Overview
    if (isHighSchool) {
      const hsData = data as any;
      return (
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
          {/* Education Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-primary border-b pb-1">
              {language === 'it' ? 'Informazioni Scolastiche' : 'School Information'}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">{language === 'it' ? 'Scuola' : 'School'}</p>
                <p className="font-medium">{hsData.schoolName || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{language === 'it' ? 'Anno Corrente' : 'Current Year'}</p>
                <p className="font-medium">{hsData.currentYear || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{language === 'it' ? 'Laurea Prevista' : 'Expected Graduation'}</p>
                <p className="font-medium">{hsData.expectedGraduation || '—'}</p>
              </div>
            </div>
          </div>

          {/* Grades Section */}
          {hsData.grades && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">
                {language === 'it' ? 'Voti' : 'Grades'}
              </h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">{language === 'it' ? '3° Anno' : '3rd Year'}</p>
                  <p className="font-medium">{hsData.grades.year3 || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {language === 'it' ? '4° Anno' : '4th Year'} {hsData.grades.year4IsExpected && '(Expected)'}
                  </p>
                  <p className="font-medium">{hsData.grades.year4 || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {language === 'it' ? '5° Anno' : '5th Year'} {hsData.grades.year5IsExpected && '(Expected)'}
                  </p>
                  <p className="font-medium">{hsData.grades.year5 || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Target Universities */}
          {hsData.targetUniversities && hsData.targetUniversities.length > 0 && hsData.targetUniversities.some((u: string) => u) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">
                {language === 'it' ? 'Università Target' : 'Target Universities'}
              </h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                {hsData.targetUniversities.filter((u: string) => u).map((uni: string, i: number) => (
                  <li key={i}>{uni}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Courses of Interest */}
          {hsData.coursesOfInterest && (hsData.coursesOfInterest.primary || hsData.coursesOfInterest.secondary) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">
                {language === 'it' ? 'Corsi di Interesse' : 'Courses of Interest'}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">{language === 'it' ? 'Primario' : 'Primary'}</p>
                  <p className="font-medium">{hsData.coursesOfInterest.primary || '—'}</p>
                </div>
                {hsData.coursesOfInterest.secondary && (
                  <div>
                    <p className="text-muted-foreground text-xs">{language === 'it' ? 'Secondario' : 'Secondary'}</p>
                    <p className="font-medium">{hsData.coursesOfInterest.secondary}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Certifications */}
          {hsData.certifications && hsData.certifications.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">
                {language === 'it' ? 'Certificazioni' : 'Certifications'}
              </h3>
              <div className="space-y-2">
                {hsData.certifications.map((cert: any, i: number) => (
                  <div key={i} className="bg-muted/30 p-2 rounded text-sm">
                    <p className="font-medium">{cert.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {cert.date}{cert.expiryDate && ` — ${language === 'it' ? 'Scade' : 'Expires'}: ${cert.expiryDate}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracurriculars */}
          {hsData.extracurriculars && hsData.extracurriculars.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">
                {language === 'it' ? 'Attività Extracurricolari' : 'Extracurricular Activities'}
              </h3>
              <div className="space-y-2">
                {hsData.extracurriculars.map((ext: any, i: number) => (
                  <div key={i} className="bg-muted/30 p-2 rounded text-sm">
                    <p className="font-medium">{ext.organization}</p>
                    <p className="text-muted-foreground text-xs">{formatDateRange(ext.startDate, ext.endDate)}</p>
                    {ext.description && <p className="mt-1">{ext.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {hsData.languages && hsData.languages.length > 0 && hsData.languages.some((l: any) => l.language) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">
                {language === 'it' ? 'Lingue' : 'Languages'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {hsData.languages.filter((l: any) => l.language).map((lang: any, i: number) => (
                  <span key={i} className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                    {lang.language} ({lang.level})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Three Adjectives */}
          {hsData.threeAdjectives && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">
                {language === 'it' ? 'Tre Aggettivi' : 'Three Adjectives'}
              </h3>
              <p className="text-sm italic">{hsData.threeAdjectives}</p>
            </div>
          )}
        </div>
      );
    }

    // University Brief Overview
    if (isUniversity) {
      const uniData = data as any;
      return (
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
          {/* Education Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-primary border-b pb-1">
              {language === 'it' ? 'Informazioni Universitarie' : 'University Information'}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">{language === 'it' ? 'Università' : 'University'}</p>
                <p className="font-medium">{uniData.universityName || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{language === 'it' ? 'Corso' : 'Course'}</p>
                <p className="font-medium">{uniData.courseName || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{language === 'it' ? 'Anno Corrente' : 'Current Year'}</p>
                <p className="font-medium">{uniData.currentYear || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{language === 'it' ? 'Voto Attuale' : 'Current Grade'}</p>
                <p className="font-medium">{uniData.currentGrade || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{language === 'it' ? 'Laurea Prevista' : 'Expected Graduation'}</p>
                <p className="font-medium">{uniData.expectedGraduation || '—'}</p>
              </div>
            </div>
          </div>

          {/* High School Background */}
          {(uniData.highSchoolName || uniData.diplomaGrade) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">
                {language === 'it' ? 'Background Scuola Superiore' : 'High School Background'}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">{language === 'it' ? 'Scuola' : 'School'}</p>
                  <p className="font-medium">{uniData.highSchoolName || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{language === 'it' ? 'Voto Diploma' : 'Diploma Grade'}</p>
                  <p className="font-medium">{uniData.diplomaGrade || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Career Interests */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-primary border-b pb-1">
              {language === 'it' ? 'Interessi Lavorativi' : 'Career Interests'}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">{language === 'it' ? 'Settore di Interesse' : 'Work Interest'}</p>
                <p className="font-medium">{uniData.workInterest || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{language === 'it' ? 'Tipo di Stage' : 'Internship Type'}</p>
                <p className="font-medium">{uniData.internshipType || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{language === 'it' ? 'Preferenza Retribuzione' : 'Payment Preference'}</p>
                <p className="font-medium capitalize">{uniData.internshipPaid || '—'}</p>
              </div>
            </div>
          </div>

          {/* Preferred Cities */}
          {uniData.preferredCities && (uniData.preferredCities.primary || uniData.preferredCities.secondary) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">
                {language === 'it' ? 'Città Preferite' : 'Preferred Cities'}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">{language === 'it' ? 'Primaria' : 'Primary'}</p>
                  <p className="font-medium">{uniData.preferredCities.primary || '—'}</p>
                </div>
                {uniData.preferredCities.secondary && (
                  <div>
                    <p className="text-muted-foreground text-xs">{language === 'it' ? 'Secondaria' : 'Secondary'}</p>
                    <p className="font-medium">{uniData.preferredCities.secondary}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Work Experiences */}
          {uniData.workExperiences && uniData.workExperiences.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">
                {language === 'it' ? 'Esperienze Lavorative' : 'Work Experiences'}
              </h3>
              <div className="space-y-2">
                {uniData.workExperiences.map((exp: any, i: number) => (
                  <div key={i} className="bg-muted/30 p-2 rounded text-sm">
                    <p className="font-medium">{exp.position}</p>
                    <p className="text-muted-foreground">{exp.company}</p>
                    <p className="text-muted-foreground text-xs">{formatDateRange(exp.startDate, exp.endDate)}</p>
                    {exp.description && <p className="mt-1">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {uniData.projects && uniData.projects.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">
                {language === 'it' ? 'Progetti' : 'Projects'}
              </h3>
              <div className="space-y-2">
                {uniData.projects.map((proj: any, i: number) => (
                  <div key={i} className="bg-muted/30 p-2 rounded text-sm">
                    <p className="font-medium">{proj.role}</p>
                    <p className="text-muted-foreground">{proj.organization}</p>
                    <p className="text-muted-foreground text-xs">{formatDateRange(proj.startDate, proj.endDate)}</p>
                    {proj.description && <p className="mt-1">{proj.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {uniData.languages && uniData.languages.length > 0 && uniData.languages.some((l: any) => l.language) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">
                {language === 'it' ? 'Lingue' : 'Languages'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {uniData.languages.filter((l: any) => l.language).map((lang: any, i: number) => (
                  <span key={i} className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                    {lang.language} ({lang.level})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Three Adjectives */}
          {uniData.threeAdjectives && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">
                {language === 'it' ? 'Tre Aggettivi' : 'Three Adjectives'}
              </h3>
              <p className="text-sm italic">{uniData.threeAdjectives}</p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const scheduledSlot = (project.meetingSlots || []).find((s: any) => s.status === 'selected');
  const needsAction =
    project.status === 'slots_proposed' &&
    project.scheduling_status !== 'primary_proposed_new' &&
    project.scheduling_status !== 'confirmed' &&
    (project.meetingSlots || []).some(
      (s: any) =>
        s.associate_id === associateId &&
        (s.slot_role === 'client_for_primary' || s.slot_role === 'client_for_backup') &&
        s.status === 'proposed'
    );

  return (
    <>
      <Card
        onClick={onToggle}
        className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all h-full flex flex-col"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug line-clamp-2">{project.service?.name}</CardTitle>
            {needsAction && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0 mt-1.5" title={language === 'it' ? 'Azione richiesta' : 'Action required'} />
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex-1 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {project.client?.photo_url ? (
              <img
                src={project.client.photo_url}
                alt=""
                className="h-8 w-8 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="text-sm font-medium truncate">
              {project.client?.first_name} {project.client?.last_name}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant={statusConfig.variant} className="text-xs">{statusLabel}</Badge>
            {project.order?.payment_status && (
              <Badge variant={project.order.payment_status === 'verified' ? 'default' : 'secondary'} className="text-xs">
                {project.order.payment_status === 'verified'
                  ? (language === 'it' ? 'Pagato' : 'Paid')
                  : (language === 'it' ? 'Pagamento in attesa' : 'Payment pending')}
              </Badge>
            )}
          </div>

          {scheduledSlot && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-auto">
              <Calendar className="h-3 w-3" />
              {scheduledSlot.proposed_time}
            </div>
          )}

          {project.service?.category && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{project.service.category}</span>
              {project.service.subcategory && (
                <span> · {project.service.subcategory}</span>
              )}
            </div>
          )}

          <Button variant="ghost" size="sm" className="mt-auto justify-start text-primary hover:text-primary -ml-2">
            {language === 'it' ? 'Vedi dettagli' : 'View details'} →
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isExpanded} onOpenChange={onToggle}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {project.service?.name}
              <Badge variant={statusConfig.variant}>{statusLabel}</Badge>
              {project.order?.payment_status && (
                <Badge variant={project.order.payment_status === 'verified' ? 'default' : 'secondary'}>
                  {project.order.payment_status === 'verified'
                    ? (language === 'it' ? 'Pagato' : 'Paid')
                    : (language === 'it' ? 'Pagamento in attesa' : 'Payment pending')}
                </Badge>
              )}
            </DialogTitle>
            <CardDescription>
              <span className="font-medium">{project.client?.first_name} {project.client?.last_name}</span>
              {project.service?.category && <> • {project.service.category}{project.service.subcategory ? ` · ${project.service.subcategory}` : ''}</>}
            </CardDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Client Info */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                {language === 'it' ? 'Informazioni Cliente' : 'Client Information'}
              </h4>
              <div className="flex items-start gap-4">
                {project.client?.photo_url && (
                  <img
                    src={project.client.photo_url}
                    alt={`${project.client.first_name} ${project.client.last_name}`}
                    className="h-16 w-16 rounded-full object-cover border border-border shrink-0"
                  />
                )}
                <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 flex-1">
                  <div>
                    <p className="text-muted-foreground text-xs">{language === 'it' ? 'Nome' : 'Name'}</p>
                    <p className="font-medium">{project.client?.first_name} {project.client?.last_name}</p>
                  </div>
                  {project.client?.student_status && (
                    <div>
                      <p className="text-muted-foreground text-xs">{language === 'it' ? 'Stato Studente' : 'Student Status'}</p>
                      <p className="font-medium">{project.client.student_status}</p>
                    </div>
                  )}
                  {project.client?.linkedin_url && (
                    <div className="sm:col-span-2">
                      <p className="text-muted-foreground text-xs">LinkedIn</p>
                      <a
                        href={project.client.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <LinkIcon className="h-3 w-3" />
                        {language === 'it' ? 'Apri profilo' : 'Open profile'}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {project.additional_call_reason && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <h5 className="text-sm font-medium mb-1 text-primary">
                    {language === 'it' ? 'Motivo della chiamata aggiuntiva' : 'Reason for Additional Call'}
                  </h5>
                  <p className="text-sm bg-primary/5 p-2 rounded italic">{project.additional_call_reason}</p>
                </div>
              )}

              {project.specific_request && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <h5 className="text-sm font-medium mb-1 text-primary">
                    {project.service?.name === 'Associate Office Hours'
                      ? (language === 'it' ? 'Motivo della chiamata' : 'Reason for Call')
                      : (language === 'it' ? 'Focus della sessione' : 'Session Focus / Specific Request')}
                  </h5>
                  <p className="text-sm bg-primary/5 p-2 rounded italic">{project.specific_request}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border/50">
                <h5 className="text-sm font-medium mb-2">
                  {language === 'it' ? 'Documenti Cliente' : 'Client Documents'}
                </h5>
                <div className="flex flex-wrap gap-2">
                  {project.client?.cv_url && (
                    <Button variant="outline" size="sm" onClick={handleDownloadCV}>
                      <Download className="h-4 w-4 mr-2" />
                      {language === 'it' ? 'Scarica CV' : 'Download CV'}
                    </Button>
                  )}
                  {project.client?.brief_overview && (
                    <Button variant="outline" size="sm" onClick={() => setBriefOverviewOpen(true)}>
                      <Eye className="h-4 w-4 mr-2" />
                      {language === 'it' ? 'Visualizza Brief' : 'View Brief'}
                    </Button>
                  )}
                  {!project.client?.cv_url && !project.client?.brief_overview && (
                    <p className="text-sm text-muted-foreground">
                      {language === 'it' ? 'Nessun documento disponibile' : 'No documents available'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Brief Overview Dialog */}
            <Dialog open={briefOverviewOpen} onOpenChange={setBriefOverviewOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {language === 'it' ? 'Profilo Cliente' : 'Client Profile'} — {project.client?.first_name} {project.client?.last_name}
                  </DialogTitle>
                </DialogHeader>
                {renderBriefOverview()}
              </DialogContent>
            </Dialog>

            {/* Meeting Slots */}
            {(() => {
              const myClientSlots = (project.meetingSlots || []).filter(
                (s: any) =>
                  s.associate_id === associateId &&
                  (s.slot_role === 'client_for_primary' || s.slot_role === 'client_for_backup') &&
                  s.status === 'proposed'
              );
              const isAwaitingThisAssociate =
                project.status === 'slots_proposed' &&
                project.scheduling_status !== 'primary_proposed_new' &&
                project.scheduling_status !== 'confirmed' &&
                myClientSlots.length > 0;
              const isPrimaryAndCanDecline =
                isAwaitingThisAssociate &&
                project.active_associate_id === associateId &&
                (project.scheduling_status === 'awaiting_primary' || project.scheduling_status === 'awaiting_backup');

              if (project.scheduling_status === 'primary_proposed_new' && project.active_associate_id === associateId) {
                return (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-1">
                      {language === 'it' ? 'In attesa del cliente' : 'Waiting for client'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {language === 'it'
                        ? 'Hai proposto 2 nuove fasce orarie. Il cliente sta valutando.'
                        : 'You proposed 2 alternative slots. The client is reviewing.'}
                    </p>
                  </div>
                );
              }

              if (!isAwaitingThisAssociate) return null;

              return (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {language === 'it' ? 'Seleziona Orario Preferito (UK time)' : 'Select Preferred Time (UK time)'}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {language === 'it'
                      ? 'Il cliente ha proposto questi orari. Seleziona quello preferito.'
                      : 'The client proposed these time slots. Select your preferred one.'}
                  </p>
                  <div className="grid gap-2">
                    {myClientSlots.map((slot: any) => (
                      <Button
                        key={slot.id}
                        variant="outline"
                        className="justify-between h-auto py-3"
                        onClick={() => onSelectSlot(project.id, slot.id, slot.proposed_time)}
                      >
                        <span>{slot.proposed_time}</span>
                        <Calendar className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                  {isPrimaryAndCanDecline && (
                    <Button
                      variant="ghost"
                      className="w-full mt-3 text-destructive hover:text-destructive"
                      onClick={() => setUnavailableOpen(true)}
                    >
                      {language === 'it'
                        ? "Non sono disponibile per nessuno di questi slot"
                        : "I'm not available for any of these slots"}
                    </Button>
                  )}
                  <PrimaryUnavailableDialog
                    open={unavailableOpen}
                    onOpenChange={setUnavailableOpen}
                    projectId={project.id}
                    language={language}
                    onDone={() => { /* realtime subscription will refresh */ }}
                  />
                </div>
              );
            })()}

            {project.status === 'scheduled' && project.meetingSlots.find((s: any) => s.status === 'selected') && (
              <div className="bg-primary/5 p-4 rounded-lg">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {language === 'it' ? 'Meeting Confermato' : 'Meeting Confirmed'}
                </h4>
                <p className="text-sm">
                  {project.meetingSlots.find((s: any) => s.status === 'selected')?.proposed_time}
                </p>
              </div>
            )}

            {project.google_meet_link && (
              <div className="bg-primary/5 p-4 rounded-lg">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Meeting Link
                </h4>
                <Button asChild className="w-full">
                  <a href={project.google_meet_link} target="_blank" rel="noopener noreferrer">
                    Join Google Meet
                  </a>
                </Button>
              </div>
            )}

            <SharedDocuments
              projectId={project.id}
              uploaderId={associateId}
              uploaderType="associate"
              uploaderName={associateProfile ? `${associateProfile.first_name} ${associateProfile.last_name}` : 'Associate'}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AssociateClientProjects;

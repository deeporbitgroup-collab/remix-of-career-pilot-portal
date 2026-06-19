import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calendar, Clock, FileText, Download, Video, ChevronDown, ChevronUp, PhoneCall, CheckCircle2, Layers } from "lucide-react";
import { format } from "date-fns";
import AssociateCard from "./AssociateCard";
import SharedDocuments from "./SharedDocuments";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AdditionalCallDialog from "./AdditionalCallDialog";

const sb = supabase as any;

interface MyProjectsSectionProps {
  clientId: string;
  clientName: string;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", variant: "outline" },
  slots_proposed: { label: "Select Time Slot", variant: "default" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  review: { label: "In Review", variant: "secondary" },
  completed: { label: "Completed", variant: "secondary" },
};

const MyProjectsSection = ({ clientId, clientName }: MyProjectsSectionProps) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [additionalCallProject, setAdditionalCallProject] = useState<any | null>(null);
  const [isProcessingCall, setIsProcessingCall] = useState(false);

  useEffect(() => {
    fetchProjects();

    const subscription = sb
      .channel('my_projects_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'client_projects', filter: `client_id=eq.${clientId}` },
        () => fetchProjects()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [clientId]);

  const fetchProjects = async () => {
    try {
      // Fetch projects with related data
      const { data: projectsData, error } = await sb
        .from('client_projects')
        .select(`
          *,
          service:client_services(id, name, price, category),
          order:client_orders(id, created_at, outreach_cv_url, outreach_cover_letter_url, outreach_custom_email)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with associate details and meeting slots
      const enrichedProjects = await Promise.all(
        (projectsData || []).map(async (project: any) => {
          // Fetch associate details
          let associate = null;
          if (project.associate_id) {
            const { data: assocData } = await sb
              .from('profiles')
              .select('id, first_name, last_name, photo_url, university, master_program, sector, company_name, linkedin_url, overview_url')
              .eq('id', project.associate_id)
              .single();
            
            if (assocData) {
              // Fetch CV storage path if no overview
              if (!assocData.overview_url) {
                const { data: cvDoc } = await sb
                  .from('documents')
                  .select('storage_path')
                  .eq('user_id', assocData.id)
                  .eq('type', 'CV')
                  .order('version', { ascending: false })
                  .limit(1)
                  .single();
                assocData.cv_storage_path = cvDoc?.storage_path || null;
              }
              associate = assocData;
            }
          }

          // Fetch meeting slots
          const { data: slots } = await sb
            .from('client_meeting_slots')
            .select('*')
            .eq('project_id', project.id)
            .order('proposed_time', { ascending: true });

          return {
            ...project,
            associate,
            meetingSlots: slots || [],
          };
        })
      );

      setProjects(enrichedProjects);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = async (projectId: string, slotId: string) => {
    try {
      const { error } = await sb
        .from('client_projects')
        .update({ 
          selected_slot_id: slotId,
          status: 'scheduled',
        })
        .eq('id', projectId);

      if (error) throw error;

      toast.success("Meeting time selected! Google Meet link will be generated.");
      fetchProjects();
    } catch (error: any) {
      console.error('Error selecting slot:', error);
      toast.error("Failed to select time slot");
    }
  };

  const handleAcceptCounter = async (projectId: string, slotId: string) => {
    try {
      const { error } = await sb.functions.invoke('handle-client-counter-response', {
        body: { projectId, action: 'accept', slotId },
      });
      if (error) throw error;
      toast.success("Time slot confirmed!");
      fetchProjects();
    } catch (e: any) {
      toast.error(e.message || "Failed to confirm");
    }
  };

  const handleRejectCounter = async (projectId: string) => {
    if (!confirm("Reject both proposals and switch to the backup associate?")) return;
    try {
      const { data, error } = await sb.functions.invoke('handle-client-counter-response', {
        body: { projectId, action: 'reject_all' },
      });
      if (error) throw error;
      if ((data as any)?.noBackup) {
        toast.success("Career Pilot team has been notified.");
      } else {
        toast.success("Switched to backup associate.");
      }
      fetchProjects();
    } catch (e: any) {
      toast.error(e.message || "Failed");
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

  // Tier-based pricing for additional calls
  const TIER_PRICES: Record<string, number> = {
    'Layover': 40,
    'Take Off': 40,
    'Summit': 50,
    'Altitude': 60,
  };

  const handleBookAdditionalCall = async (reason: string) => {
    if (!additionalCallProject || !additionalCallProject.associate) return;

    setIsProcessingCall(true);

    try {
      const category = additionalCallProject.service?.category || 'Summit';
      const price = TIER_PRICES[category] || 50;

      // Find the appropriate additional call service
      const { data: additionalCallService, error: serviceError } = await sb
        .from('client_services')
        .select('*')
        .eq('name', 'Additional Call with Associate')
        .eq('category', category)
        .single();

      if (serviceError || !additionalCallService) {
        throw new Error('Additional call service not found');
      }

      // Create a guest cart item and redirect to checkout
      const cartItem = {
        id: `additional-call-${Date.now()}`,
        service: additionalCallService,
        associate: {
          id: additionalCallProject.associate.id,
          first_name: additionalCallProject.associate.first_name,
          last_name: additionalCallProject.associate.last_name,
        },
        additionalCallReason: reason,
        originalProjectId: additionalCallProject.id,
      };

      // Save to guest cart
      localStorage.setItem('guest_cart', JSON.stringify([cartItem]));

      toast.success("Redirecting to checkout...");
      navigate('/client-portal/checkout');
    } catch (error: any) {
      console.error('Error booking additional call:', error);
      toast.error("Failed to book additional call");
    } finally {
      setIsProcessingCall(false);
      setAdditionalCallProject(null);
    }
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-background/90 shadow-lg">
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
      <Card className="backdrop-blur-sm bg-background/90 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">My Projects</h2>
              <p className="text-sm text-muted-foreground mt-1">All your purchased services in one place</p>
            </div>
          </div>
        </div>
        <CardContent className="py-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Once you purchase a service, your project will appear here. Browse our catalogue to get started!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeProjects = projects.filter(p => p.status !== 'completed');
  const completedProjects = projects.filter(p => p.status === 'completed');

  // Group per-component projects under their package so the area stays tidy.
  const groupByPackage = (list: any[]) => {
    const groups: { key: string; packageName: string | null; projects: any[] }[] = [];
    const index = new Map<string, number>();
    list.forEach((p) => {
      const name = p.package_name || null;
      const key = name ? `pkg:${name}` : `single:${p.id}`;
      if (index.has(key)) {
        groups[index.get(key)!].projects.push(p);
      } else {
        index.set(key, groups.length);
        groups.push({ key, packageName: name, projects: [p] });
      }
    });
    return groups;
  };

  const renderGroups = (list: any[], renderCard: (project: any) => JSX.Element) =>
    groupByPackage(list).map((group) =>
      group.packageName ? (
        <div key={group.key} className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold text-primary">{group.packageName}</span>
            <Badge variant="outline" className="ml-auto text-xs">
              {group.projects.length} {group.projects.length === 1 ? "service" : "services"}
            </Badge>
          </div>
          <div className="space-y-3">{group.projects.map(renderCard)}</div>
        </div>
      ) : (
        <div key={group.key}>{group.projects.map(renderCard)}</div>
      )
    );

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <Card className="backdrop-blur-sm bg-background/90 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">My Projects</h2>
              <p className="text-sm text-muted-foreground mt-1">Track every service you've booked, from kickoff to completion</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Active Projects */}
      <Card className="backdrop-blur-sm bg-background/90 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Active Projects
          </CardTitle>
          <CardDescription>Track your ongoing services and bookings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeProjects.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No active projects</p>
          ) : (
            renderGroups(activeProjects, (project) => (
              <ProjectCard
                key={project.id}
                project={project}
                clientId={clientId}
                clientName={clientName}
                onSelectSlot={handleSelectSlot}
                onAcceptCounter={handleAcceptCounter}
                onRejectCounter={handleRejectCounter}
                isExpanded={expandedProjects.has(project.id)}
                onToggle={() => toggleProject(project.id)}
                onBookAdditionalCall={(project) => setAdditionalCallProject(project)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <Card className="backdrop-blur-sm bg-background/90 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Completed Projects</CardTitle>
            <CardDescription>Your finished services with downloadable documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderGroups(completedProjects, (project) => (
              <ProjectCard
                key={project.id}
                project={project}
                clientId={clientId}
                clientName={clientName}
                onSelectSlot={handleSelectSlot}
                isExpanded={expandedProjects.has(project.id)}
                onToggle={() => toggleProject(project.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Additional Call Dialog */}
      <AdditionalCallDialog
        open={!!additionalCallProject}
        onOpenChange={(open) => !open && setAdditionalCallProject(null)}
        project={additionalCallProject || { id: '' }}
        onConfirm={handleBookAdditionalCall}
        isProcessing={isProcessingCall}
      />
    </div>
  );
};

interface ProjectCardProps {
  project: any;
  clientId: string;
  clientName: string;
  onSelectSlot: (projectId: string, slotId: string) => void;
  onAcceptCounter?: (projectId: string, slotId: string) => void;
  onRejectCounter?: (projectId: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
  onBookAdditionalCall?: (project: any) => void;
}

const ProjectCard = ({ project, clientId, clientName, onSelectSlot, onAcceptCounter, onRejectCounter, isExpanded, onToggle, onBookAdditionalCall }: ProjectCardProps) => {
  const status = statusLabels[project.status] || { label: project.status, variant: "outline" as const };

  // Determine price based on category
  const TIER_PRICES: Record<string, number> = {
    'Layover': 40,
    'Take Off': 40,
    'Summit': 50,
    'Altitude': 60,
  };
  const additionalCallPrice = TIER_PRICES[project.service?.category] || 50;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className="border-border/50 overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{project.service?.name}</CardTitle>
                  {project.status === 'completed' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-950/50 border border-green-200 dark:border-green-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">Completed</span>
                    </div>
                  ) : (
                    <Badge variant={status.variant}>{status.label}</Badge>
                  )}
                </div>
                <CardDescription className="mt-1">
                  {project.service?.category} • Purchased {format(new Date(project.created_at), 'MMM d, yyyy')}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <Separator />
            
            {/* Associate Card */}
            {project.associate && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Your Associate</h4>
                <AssociateCard associate={project.associate} />
              </div>
            )}

            {/* Reason for Call (Associate Office Hours) */}
            {project.service?.name === 'Associate Office Hours' && project.specific_request && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <h4 className="text-sm font-semibold mb-2 text-primary">Reason for Call</h4>
                <p className="text-sm italic">{project.specific_request}</p>
              </div>
            )}

            {/* Session Focus (Expert Career Session) */}
            {project.service?.name === 'Expert Career Session (1:1)' && project.specific_request && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <h4 className="text-sm font-semibold mb-2 text-primary">Session Focus</h4>
                <p className="text-sm italic">{project.specific_request}</p>
              </div>
            )}

            {/* Backup activated banner */}
            {project.scheduling_status === 'awaiting_backup' && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                <h4 className="text-sm font-semibold mb-1">Backup associate activated</h4>
                <p className="text-sm text-muted-foreground">
                  Your primary associate is unavailable. The backup associate has been notified and will confirm one of your original time slots shortly.
                </p>
              </div>
            )}

            {/* Primary proposed 2 alternative slots */}
            {project.scheduling_status === 'primary_proposed_new' && (() => {
              const counterSlots = (project.meetingSlots || []).filter(
                (s: any) => s.slot_role === 'primary_counter_proposal' && s.status === 'proposed'
              );
              return (
                <div className="space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-1">Your associate proposed alternative slots</h4>
                    <p className="text-sm text-muted-foreground">
                      None of your original times worked. Pick one of the alternatives below, or reject both to switch to the backup associate.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {counterSlots.map((slot: any) => (
                      <Button
                        key={slot.id}
                        variant="outline"
                        className="flex h-auto items-center justify-between gap-2 whitespace-normal py-3 text-left"
                        onClick={() => onAcceptCounter?.(project.id, slot.id)}
                      >
                        <span className="min-w-0 break-words">{slot.proposed_time}</span>
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => onRejectCounter?.(project.id)}
                  >
                    Reject both & switch to backup associate
                  </Button>
                </div>
              );
            })()}

            {/* Show waiting message when client proposed slots but associate hasn't selected yet */}
            {project.status === 'slots_proposed' &&
              project.scheduling_status !== 'primary_proposed_new' &&
              project.scheduling_status !== 'confirmed' &&
              project.meetingSlots.filter((s: any) =>
                (s.slot_role === 'client_for_primary' || s.slot_role === 'client_for_backup') &&
                s.associate_id === project.active_associate_id
              ).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Waiting for Associate
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Your proposed time slots have been sent to the associate. They will confirm their preferred time soon.
                </p>
                <div className="space-y-2">
                  {project.meetingSlots
                    .filter((s: any) =>
                      (s.slot_role === 'client_for_primary' || s.slot_role === 'client_for_backup') &&
                      s.associate_id === project.active_associate_id
                    )
                    .map((slot: any) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                        <span>{slot.proposed_time}</span>
                        <Badge variant="secondary">Proposed</Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Show confirmed meeting time when associate selected */}
            {project.status === 'scheduled' && project.meetingSlots.find((s: any) => s.status === 'selected') && (
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Calendar className="h-4 w-4" />
                    Meeting Confirmed!
                  </h4>
                  <p className="text-sm font-medium">
                    {project.meetingSlots.find((s: any) => s.status === 'selected')?.proposed_time}
                  </p>
                </div>
                
                {/* Refund Policy Notice */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg space-y-2">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    🛡️ <strong>Guarantee:</strong> If the Associate doesn't show up to the meeting or hasn't prepared the project, you're entitled to a full refund.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    <strong>Note:</strong> The Career Pilot team will upload the Google Meet link for this 1-hour call shortly.
                  </p>
                </div>
              </div>
            )}

            {/* Pending status - no slots yet */}
            {project.status === 'pending' && project.meetingSlots.length === 0 && !project.service?.name?.includes('Outreach Power Pack') && (
              <div className="text-sm text-muted-foreground">
                <p>Your order is being processed...</p>
              </div>
            )}

            {/* Outreach Power Pack Status */}
            {project.service?.name?.startsWith('Outreach Power Pack') && (
              <div className="space-y-3">
                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    📦 Outreach Power Pack — Pay Per Interview
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
                        {project.status === 'pending' ? 'Campaign In Progress' : 
                         project.status === 'completed' ? 'Completed' : project.status}
                      </Badge>
                    </div>
                    {project.order?.outreach_cv_url && (
                      <p className="text-amber-600 dark:text-amber-400">✅ CV Uploaded</p>
                    )}
                    {project.order?.outreach_cover_letter_url && (
                      <p className="text-amber-600 dark:text-amber-400">✅ Cover Letter Uploaded</p>
                    )}
                    <p className="text-amber-600 dark:text-amber-400">
                      {project.order?.outreach_custom_email ? '📧 Using your custom email' : '📧 Using Career Pilot default email'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  You will have access to the email account used for the outreach campaign and can verify every conversation.
                  You are billed <strong>€250 only when an outreach lead turns into a confirmed interview</strong> — no upfront fee.
                </p>
              </div>
            )}

            {/* Google Meet Link */}
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

            {/* Shared Documents */}
            <SharedDocuments 
              projectId={project.id}
              uploaderId={clientId}
              uploaderType="client"
              uploaderName={clientName}
            />

            {/* Book Additional Call Button - only for active projects with an associate */}
            {project.associate && project.status !== 'completed' && onBookAdditionalCall && (
              <div className="pt-2">
                <Separator className="mb-4" />
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookAdditionalCall(project);
                  }}
                >
                  <PhoneCall className="h-5 w-5 mr-2" />
                  Book an Additional Call (€{additionalCallPrice})
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default MyProjectsSection;

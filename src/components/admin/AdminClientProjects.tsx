import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, FileText, Download, Users, CreditCard, Calendar, Video, Link, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import SharedDocuments from "@/components/client-portal/SharedDocuments";

const sb = supabase as any;

const AdminClientProjects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [meetingLinkInput, setMeetingLinkInput] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [completingProject, setCompletingProject] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();

    // Real-time subscription
    const subscription = sb
      .channel('admin_projects_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'client_projects' },
        () => fetchProjects()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'client_orders' },
        () => fetchProjects()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [orderActionId, setOrderActionId] = useState<string | null>(null);

  const handleMarkOrderPaid = async (orderId: string) => {
    if (!confirm("Mark this order as PAID? The client and associate will be notified.")) return;
    setOrderActionId(orderId);
    try {
      const { error } = await sb.functions.invoke('admin-order-action', {
        body: { orderId, action: 'mark_paid' },
      });
      if (error) throw error;
      toast.success("Order marked as paid.");
      fetchProjects();
    } catch (e: any) {
      toast.error(e.message || "Failed to mark as paid");
    } finally {
      setOrderActionId(null);
    }
  };

  const handleCancelReservation = async (orderId: string) => {
    const reason = window.prompt(
      "Cancel this unpaid reservation? The client, associate and admin will be emailed.\n\nOptional note for the emails:",
      ""
    );
    if (reason === null) return; // user dismissed
    setOrderActionId(orderId);
    try {
      const { error } = await sb.functions.invoke('admin-order-action', {
        body: { orderId, action: 'cancel', reason: reason || undefined },
      });
      if (error) throw error;
      toast.success("Reservation cancelled and everyone notified.");
      fetchProjects();
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel reservation");
    } finally {
      setOrderActionId(null);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error } = await sb
        .from('client_projects')
        .select(`
          *,
          service:client_services(id, name, price, category),
          order:client_orders(id, created_at, payment_status, kind, order_label, total_amount, unlocked_at, payment_receipt_url, outreach_cv_url, outreach_cover_letter_url, outreach_custom_email),
          client:client_users(id, first_name, last_name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with associate details and meeting slots
      const enrichedProjects = await Promise.all(
        (projectsData || []).map(async (project: any) => {
          let associate = null;
          if (project.associate_id) {
            const { data: assocData } = await sb
              .from('profiles')
              .select('id, first_name, last_name, email')
              .eq('id', project.associate_id)
              .single();
            associate = assocData;
          }

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

  const handleMarkAsComplete = async (project: any) => {
    if (!project.associate_id || !project.associate) {
      toast.error("Cannot complete: No associate assigned to this project");
      return;
    }

    setCompletingProject(project.id);
    try {
      // 1. Update project status to completed
      const { error: updateError } = await sb
        .from('client_projects')
        .update({ status: 'completed' })
        .eq('id', project.id);

      if (updateError) throw updateError;

      // 2. Send completion emails to client and associate
      await sb.functions.invoke('send-project-completion', {
        body: {
          clientEmail: project.client?.email,
          clientName: `${project.client?.first_name} ${project.client?.last_name}`,
          associateEmail: project.associate?.email,
          associateName: `${project.associate?.first_name} ${project.associate?.last_name}`,
          serviceName: project.service?.name,
        },
      });

      // 3. Update associate KPIs (+1 clients_assisted, +1 calls_made)
      const kpiKeys = ['clients_assisted', 'interviews_completed'];
      
      for (const kpiKey of kpiKeys) {
        // Get the KPI definition
        const { data: kpiDef } = await sb
          .from('kpi_definitions')
          .select('id')
          .eq('key', kpiKey)
          .eq('applies_to', 'ASSOCIATE')
          .single();

        if (kpiDef) {
          // Check if value exists
          const { data: existingValue } = await sb
            .from('kpi_values')
            .select('id, value')
            .eq('kpi_definition_id', kpiDef.id)
            .eq('user_id', project.associate_id)
            .single();

          if (existingValue) {
            // Update existing value (+1)
            await sb
              .from('kpi_values')
              .update({ 
                value: (existingValue.value || 0) + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingValue.id);
          } else {
            // Insert new value
            await sb
              .from('kpi_values')
              .insert({
                kpi_definition_id: kpiDef.id,
                user_id: project.associate_id,
                value: 1,
              });
          }
        }
      }

      toast.success("Project marked as complete! Emails sent and KPIs updated.");
      fetchProjects();
      setSelectedProject(null);
    } catch (error: any) {
      console.error('Error completing project:', error);
      toast.error("Failed to complete project");
    } finally {
      setCompletingProject(null);
    }
  };

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    pending: { label: "Pending", variant: "outline" },
    slots_proposed: { label: "Slots Proposed", variant: "default" },
    scheduled: { label: "Scheduled", variant: "secondary" },
    in_progress: { label: "In Progress", variant: "default" },
    review: { label: "In Review", variant: "secondary" },
    completed: { label: "Completed", variant: "secondary" },
  };

  const paymentLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    pending: { label: "Pending", variant: "outline" },
    uploaded: { label: "Receipt Uploaded", variant: "secondary" },
    verified: { label: "Paid", variant: "default" },
    paid: { label: "Paid", variant: "default" },
    awaiting_confirmation: { label: "Awaiting confirmation", variant: "outline" },
    awaiting_payment: { label: "Awaiting payment", variant: "secondary" },
    cancelled: { label: "Cancelled", variant: "destructive" },
    rejected: { label: "Rejected", variant: "destructive" },
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

  // Distinct order groups whose associate confirmed the time but the client hasn't paid yet.
  const pendingPaymentOrders = Object.values(
    projects.reduce((acc: Record<string, any>, p: any) => {
      const o = p.order;
      if (o && o.payment_status === 'awaiting_payment' && !acc[o.id]) {
        acc[o.id] = {
          orderId: o.id,
          label: o.order_label || p.service?.name || 'Order',
          total: Number(o.total_amount || 0),
          unlockedAt: o.unlocked_at,
          clientName: `${p.client?.first_name ?? ''} ${p.client?.last_name ?? ''}`.trim(),
          clientEmail: p.client?.email,
          associateName: p.associate ? `${p.associate.first_name} ${p.associate.last_name}` : '—',
        };
      }
      return acc;
    }, {})
  ) as Array<any>;

  return (
    <div className="space-y-6">
      {/* Pending payments — associate confirmed, client hasn't paid */}
      {pendingPaymentOrders.length > 0 && (
        <Card className="border-2 border-amber-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-500" />
              Pending Payments ({pendingPaymentOrders.length})
            </CardTitle>
            <CardDescription>
              The associate confirmed a time and the client has been asked to pay. Cancel to free the associate (everyone is emailed), or mark as paid manually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Associate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Awaiting since</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPaymentOrders.map((o: any) => (
                  <TableRow key={o.orderId}>
                    <TableCell className="font-medium">{o.label}</TableCell>
                    <TableCell>
                      <p className="font-medium">{o.clientName}</p>
                      <p className="text-sm text-muted-foreground">{o.clientEmail}</p>
                    </TableCell>
                    <TableCell>{o.associateName}</TableCell>
                    <TableCell className="font-semibold">€{o.total.toFixed(2)}</TableCell>
                    <TableCell>{o.unlockedAt ? format(new Date(o.unlockedAt), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={orderActionId === o.orderId}
                          onClick={() => handleMarkOrderPaid(o.orderId)}
                        >
                          {orderActionId === o.orderId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark as paid'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={orderActionId === o.orderId}
                          onClick={() => handleCancelReservation(o.orderId)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{projects.length}</span>
              <FileText className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">With Associate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{projects.filter(p => p.associate_id).length}</span>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{projects.filter(p => p.order?.payment_status === 'paid' || p.order?.payment_status === 'verified').length}</span>
              <CreditCard className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{projects.filter(p => p.status === 'scheduled').length}</span>
              <Calendar className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Client Projects</CardTitle>
          <CardDescription>
            View all client requests, selected associates, and payment status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Associate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => {
                const status = statusLabels[project.status] || { label: project.status, variant: "outline" as const };
                const payment = paymentLabels[project.order?.payment_status] || { label: project.order?.payment_status || 'N/A', variant: "outline" as const };
                
                return (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{project.client?.first_name} {project.client?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{project.client?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{project.service?.name}</p>
                        <p className="text-sm text-muted-foreground">{project.service?.category}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {project.associate ? (
                        <div>
                          <p className="font-medium">{project.associate.first_name} {project.associate.last_name}</p>
                          <p className="text-sm text-muted-foreground">{project.associate.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not selected</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.variant}>{payment.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(project.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedProject(project)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {project.status !== 'completed' && project.associate_id && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleMarkAsComplete(project)}
                            disabled={completingProject === project.id}
                          >
                            {completingProject === project.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {project.status === 'completed' && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Detail</DialogTitle>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-6">
              {/* Client Info */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Client</h4>
                <div className="bg-muted p-4 rounded-lg grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2 font-medium">{selectedProject.client?.first_name} {selectedProject.client?.last_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="ml-2">{selectedProject.client?.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="ml-2">{selectedProject.client?.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Service Info */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Service</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">{selectedProject.service?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedProject.service?.category}</p>
                  <p className="text-sm mt-2">Price: €{selectedProject.service?.price}</p>
                </div>
              </div>

              {/* Additional Call Reason */}
              {selectedProject.additional_call_reason && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Additional Call Reason</h4>
                  <div className="bg-muted border border-border p-4 rounded-lg">
                    <p className="text-sm italic">{selectedProject.additional_call_reason}</p>
                  </div>
                </div>
              )}

              {/* Specific Request (Expert Career Session / Associate Office Hours) */}
              {selectedProject.specific_request && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    {selectedProject.service?.name === 'Associate Office Hours' 
                      ? 'Reason for Call' 
                      : 'Session Focus / Specific Request'}
                  </h4>
                  <div className="bg-muted border border-border p-4 rounded-lg">
                    <p className="text-sm italic">{selectedProject.specific_request}</p>
                  </div>
                </div>
              )}

              {/* Outreach Power Pack Documents */}
              {selectedProject.service?.name?.startsWith('Outreach Power Pack') && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">📦 Outreach Power Pack Documents</h4>
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg space-y-3">
                    {/* CV Download */}
                    {selectedProject.order?.outreach_cv_url ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">CV:</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const path = selectedProject.order.outreach_cv_url;
                              const { data, error } = await sb.storage
                                .from('documents')
                                .download(path);
                              if (error) throw error;
                              const blob = new Blob([data]);
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = path.split('/').pop() || 'outreach-cv';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                              toast.success("CV downloaded!");
                            } catch (e) {
                              console.error('Error downloading CV:', e);
                              toast.error("Failed to download CV");
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download CV
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">CV: Not uploaded</p>
                    )}

                    {/* Cover Letter Download */}
                    {selectedProject.order?.outreach_cover_letter_url ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Cover Letter:</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const path = selectedProject.order.outreach_cover_letter_url;
                              const { data, error } = await sb.storage
                                .from('documents')
                                .download(path);
                              if (error) throw error;
                              const blob = new Blob([data]);
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = path.split('/').pop() || 'outreach-cover-letter';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                              toast.success("Cover Letter downloaded!");
                            } catch (e) {
                              console.error('Error downloading Cover Letter:', e);
                              toast.error("Failed to download Cover Letter");
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Cover Letter
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Cover Letter: Not uploaded</p>
                    )}

                    {/* Custom Email */}
                    <div className="pt-2 border-t border-amber-200 dark:border-amber-800">
                      <p className="text-sm font-medium mb-1">
                        {selectedProject.order?.outreach_custom_email ? '📧 Custom Email (Client Provided):' : '📧 Using Career Pilot Default Email'}
                      </p>
                      {selectedProject.order?.outreach_custom_email && (
                        <div className="bg-white dark:bg-background p-3 rounded-md text-sm whitespace-pre-wrap border">
                          {selectedProject.order.outreach_custom_email}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-amber-700 dark:text-amber-400 pt-2">
                      ⏱️ Service duration: 2-3 business days maximum
                    </p>
                  </div>
                </div>
              )}

              {selectedProject.associate && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Assigned Associate</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-medium">{selectedProject.associate.first_name} {selectedProject.associate.last_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedProject.associate.email}</p>
                  </div>
                </div>
              )}

              {/* Meeting Slots */}
              {selectedProject.meetingSlots.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Proposed Times</h4>
                  <div className="space-y-2">
                    {selectedProject.meetingSlots.map((slot: any) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span>{slot.proposed_time}</span>
                        <Badge variant={slot.status === 'selected' ? 'default' : 'secondary'}>
                          {slot.status === 'selected' ? 'Confirmed' : 'Proposed'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Google Meet Link Management */}
              {selectedProject.status === 'scheduled' && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Google Meet Link
                  </h4>
                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    {selectedProject.google_meet_link ? (
                      <div className="flex items-center justify-between">
                        <a href={selectedProject.google_meet_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          <Link className="h-4 w-4" />
                          {selectedProject.google_meet_link}
                        </a>
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://meet.google.com/..."
                        value={meetingLinkInput}
                        onChange={(e) => setMeetingLinkInput(e.target.value)}
                      />
                      <Button 
                        onClick={async () => {
                          if (!meetingLinkInput) {
                            toast.error("Enter a valid link");
                            return;
                          }
                          setSavingLink(true);
                          try {
                            await sb.from('client_projects').update({ google_meet_link: meetingLinkInput }).eq('id', selectedProject.id);
                            await sb.functions.invoke('generate-google-meet-link', { body: { projectId: selectedProject.id, meetingLink: meetingLinkInput } });
                            toast.success("Link saved and notifications sent!");
                            setMeetingLinkInput("");
                            fetchProjects();
                            setSelectedProject({ ...selectedProject, google_meet_link: meetingLinkInput });
                          } catch (e: any) {
                            toast.error("Error while saving");
                          } finally {
                            setSavingLink(false);
                          }
                        }}
                        disabled={savingLink}
                      >
                        {savingLink ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Info */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Payment</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    <Badge variant={paymentLabels[selectedProject.order?.payment_status]?.variant || 'outline'}>
                      {paymentLabels[selectedProject.order?.payment_status]?.label || selectedProject.order?.payment_status}
                    </Badge>
                  </div>
                  {selectedProject.order?.payment_receipt_url && (
                    <div className="mt-2">
                      <Button
                        variant="link"
                        className="text-primary hover:underline flex items-center gap-1 p-0 h-auto"
                        onClick={async () => {
                          try {
                            const path = selectedProject.order.payment_receipt_url;
                            const { data, error } = await sb.storage
                              .from('documents')
                              .download(path);
                            if (error) throw error;
                            const blob = new Blob([data]);
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = path.split('/').pop() || 'receipt';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                            toast.success("Receipt downloaded!");
                          } catch (e) {
                            console.error('Error downloading receipt:', e);
                            toast.error("Failed to download receipt");
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                        View Receipt
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Shared Documents (Admin View) */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Shared Documents</h4>
                <SharedDocuments 
                  projectId={selectedProject.id}
                  uploaderId="admin"
                  uploaderType="admin"
                  uploaderName="Admin"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClientProjects;

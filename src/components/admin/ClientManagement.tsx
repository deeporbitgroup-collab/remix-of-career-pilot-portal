import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check, X, Eye, Download, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import AdminClientDocuments from "./AdminClientDocuments";

const sb = supabase as any;

const ClientManagement = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
    fetchOrders();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await sb
        .from('client_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await sb
        .from('client_orders')
        .select(`
          *,
          client_users!inner(first_name, last_name, email),
          client_order_items(
            id,
            client_services(name, category)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleApproveClient = async (clientId: string, approved: boolean) => {
    try {
      const client = clients.find(c => c.id === clientId);
      
      const { error } = await sb
        .from('client_users')
        .update({ 
          status: approved ? 'approved' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);

      if (error) throw error;

      // Send approval email
      await supabase.functions.invoke('send-client-approval', {
        body: {
          clientEmail: client.email,
          clientName: `${client.first_name} ${client.last_name}`,
          approved
        }
      });

      toast.success(approved ? "Client approved" : "Client rejected");
      fetchClients();
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast.error("Failed to update client status");
    }
  };

  const handleApprovePayment = async (orderId: string, approved: boolean) => {
    try {
      const order = orders.find(o => o.id === orderId);
      
      const { error } = await sb
        .from('client_orders')
        .update({ 
          payment_status: approved ? 'verified' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Send payment approval email
      await supabase.functions.invoke('send-payment-approval', {
        body: {
          clientEmail: order.client_users.email,
          clientName: `${order.client_users.first_name} ${order.client_users.last_name}`,
          approved
        }
      });

      // If approved, create projects and notify associate
      if (approved) {
        await createProjectsForOrder(order);
      }

      toast.success(approved ? "Payment approved" : "Payment rejected");
      fetchOrders();
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast.error("Failed to update payment status");
    }
  };

  const createProjectsForOrder = async (order: any) => {
    try {
      const { data: items } = await sb
        .from('client_order_items')
        .select('*, client_services(*)')
        .eq('order_id', order.id);

      for (const item of items || []) {
        const { error: projectError } = await sb
          .from('client_projects')
          .insert({
            order_id: order.id,
            client_id: order.client_id,
            associate_id: order.associate_id,
            service_id: item.service_id,
            status: 'pending'
          });

        if (projectError) throw projectError;
      }

      // Notify associate
      const { data: associate } = await sb
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', order.associate_id)
        .single();

      if (associate) {
        await supabase.functions.invoke('send-associate-project-notification', {
          body: {
            associateEmail: associate.email,
            associateName: `${associate.first_name} ${associate.last_name}`,
            clientName: `${order.client_users.first_name} ${order.client_users.last_name}`,
            serviceName: items[0]?.client_services?.name || 'Service',
            projectId: order.id
          }
        });
      }
    } catch (error) {
      console.error('Error creating projects:', error);
    }
  };

  const handleDownloadClientCV = async (client: any) => {
    if (!client.cv_url) {
      toast.error("CV not available");
      return;
    }
    
    try {
      const url = client.cv_url;
      let storagePath = '';
      
      if (url.includes('/storage/v1/object/public/')) {
        storagePath = url.split('/storage/v1/object/public/')[1];
      } else if (url.includes('/storage/v1/object/sign/')) {
        storagePath = url.split('/storage/v1/object/sign/')[1].split('?')[0];
      } else {
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
      link.download = `CV_${client.first_name}_${client.last_name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success("CV downloaded!");
    } catch (error) {
      console.error('Error downloading CV:', error);
      toast.error("Failed to download CV");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Client Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>{client.first_name} {client.last_name}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>
                    <Badge variant={
                      client.status === 'approved' ? 'default' :
                      client.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedClient(client)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {client.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveClient(client.id, true)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleApproveClient(client.id, false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.filter(o => o.payment_status === 'pending').map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    {order.client_users?.first_name} {order.client_users?.last_name}
                  </TableCell>
                  <TableCell>€{order.total_amount}</TableCell>
                  <TableCell>
                    {order.payment_receipt_url ? (
                      <Button
                        variant="link"
                        className="text-primary hover:underline p-0 h-auto"
                        onClick={async () => {
                          try {
                            const path = order.payment_receipt_url;
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
                        View Receipt
                      </Button>
                    ) : 'Not uploaded'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{order.payment_status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprovePayment(order.id, true)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleApprovePayment(order.id, false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p>{selectedClient.first_name} {selectedClient.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{selectedClient.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p>{selectedClient.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Student Status</p>
                <p>{selectedClient.student_status}</p>
              </div>
              {selectedClient.linkedin_url && (
                <div>
                  <p className="text-sm text-muted-foreground">LinkedIn</p>
                  <a href={selectedClient.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    View Profile
                  </a>
                </div>
              )}
              
              <Separator />
              
              {/* Client Documents Section */}
              <div>
                <p className="text-sm font-medium mb-3">Client Documents</p>
                <div className="flex flex-wrap gap-2">
                  {selectedClient.cv_url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadClientCV(selectedClient)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download CV
                    </Button>
                  ) : (
                    <Badge variant="secondary">No CV uploaded</Badge>
                  )}
                </div>
                
                {/* Client Uploaded Documents */}
                <AdminClientDocuments clientId={selectedClient.id} />
              </div>
              
              {/* Brief Overview Section */}
              {selectedClient.brief_overview && (
                <div>
                  <p className="text-sm font-medium mb-2">Brief Overview</p>
                  <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                    {Object.entries(selectedClient.brief_overview).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientManagement;

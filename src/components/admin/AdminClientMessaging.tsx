import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, MessageSquare } from "lucide-react";

const sb = supabase as any;

const AdminClientMessaging = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchMessages();
      
      const subscription = sb
        .channel('admin_client_messages')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'client_admin_messages', filter: `client_id=eq.${selectedClient.id}` },
          () => fetchMessages()
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    try {
      const { data, error } = await sb
        .from('client_users')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unread message counts
      const clientsWithCounts = await Promise.all(
        (data || []).map(async (client: any) => {
          const { count } = await sb
            .from('client_admin_messages')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id)
            .eq('sender_role', 'client')
            .eq('is_read', false);
          
          return { ...client, unreadCount: count || 0 };
        })
      );

      setClients(clientsWithCounts);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error("Failed to load clients");
    }
  };

  const fetchMessages = async () => {
    if (!selectedClient) return;

    try {
      const { data, error } = await sb
        .from('client_admin_messages')
        .select('*')
        .eq('client_id', selectedClient.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark admin messages as read
      await sb
        .from('client_admin_messages')
        .update({ is_read: true })
        .eq('client_id', selectedClient.id)
        .eq('sender_role', 'client')
        .eq('is_read', false);

      fetchClients(); // Refresh unread counts
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedClient) return;

    setSending(true);
    try {
      const { error } = await sb
        .from('client_admin_messages')
        .insert({
          client_id: selectedClient.id,
          sender_role: 'admin',
          message: newMessage.trim(),
        });

      if (error) throw error;

      // Send email notification to client
      await supabase.functions.invoke('send-client-message-notification', {
        body: {
          clientEmail: selectedClient.email,
          clientName: `${selectedClient.first_name} ${selectedClient.last_name}`,
          message: newMessage.trim(),
        },
      });

      setNewMessage("");
      toast.success("Message sent!");
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Clients List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`w-full p-4 text-left hover:bg-muted/50 transition-colors border-b ${
                  selectedClient?.id === client.id ? 'bg-muted' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {client.first_name[0]}{client.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {client.first_name} {client.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                  </div>
                  {client.unreadCount > 0 && (
                    <Badge variant="destructive">{client.unreadCount}</Badge>
                  )}
                </div>
              </button>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="md:col-span-2 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {selectedClient ? `Chat with ${selectedClient.first_name} ${selectedClient.last_name}` : 'Select a client'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {selectedClient ? (
            <>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.sender_role === 'admin'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="min-h-[60px]"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={sending || !newMessage.trim()}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a client to start messaging
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminClientMessaging;
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Loader2, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  id: string;
  message: string;
  sender_role: string;
  created_at: string;
  is_read: boolean;
}

interface Company {
  id: string;
  company_name: string;
  email: string;
  status: string;
}

interface AdminCompanyMessagingProps {
  language: string;
}

const AdminCompanyMessaging = ({ language }: AdminCompanyMessagingProps) => {
  const isEnglish = language === 'en';
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchMessages(selectedCompany.id);
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`admin-company-messages-${selectedCompany.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'admin_company_messages',
            filter: `company_id=eq.${selectedCompany.id}`
          },
          () => {
            fetchMessages(selectedCompany.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, company_name, email, status')
        .eq('role', 'PARTNER')
        .eq('status', 'approved')
        .order('company_name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      toast({
        variant: "destructive",
        title: isEnglish ? "Error" : "Errore",
        description: error.message
      });
    }
  };

  const fetchMessages = async (companyId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_company_messages')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark company messages as read
      const unreadIds = (data || [])
        .filter(m => m.sender_role === 'COMPANY' && !m.is_read)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from('admin_company_messages')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedCompany) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('admin_company_messages')
        .insert({
          company_id: selectedCompany.id,
          message: newMessage.trim(),
          sender_role: 'ADMIN',
          subject: 'Chat Message'
        });

      if (error) throw error;

      // Send email notification to company
      await supabase.functions.invoke('send-company-message-notification', {
        body: {
          companyEmail: selectedCompany.email,
          companyName: selectedCompany.company_name
        }
      });

      setNewMessage('');
      fetchMessages(selectedCompany.id);
      
      toast({
        title: isEnglish ? "Message sent" : "Messaggio inviato",
        description: isEnglish 
          ? "Message sent successfully"
          : "Messaggio inviato con successo"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: isEnglish ? "Error" : "Errore",
        description: error.message
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(isEnglish ? 'en-US' : 'it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return isEnglish ? 'Today' : 'Oggi';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return isEnglish ? 'Yesterday' : 'Ieri';
    } else {
      return date.toLocaleDateString(isEnglish ? 'en-US' : 'it-IT', {
        day: 'numeric',
        month: 'short'
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Companies List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {isEnglish ? 'Partners' : 'Partner'}
          </CardTitle>
          <CardDescription>
            {isEnglish 
              ? 'Select a company to view messages'
              : 'Seleziona un\'azienda per visualizzare i messaggi'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[480px]">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => setSelectedCompany(company)}
                className={`w-full p-4 text-left hover:bg-accent transition-colors border-b ${
                  selectedCompany?.id === company.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {company.company_name?.[0] || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {company.company_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {company.email}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="md:col-span-2 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {selectedCompany 
              ? selectedCompany.company_name
              : isEnglish ? 'Select a company' : 'Seleziona un\'azienda'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            {!selectedCompany ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {isEnglish 
                    ? 'Select a company to start messaging'
                    : 'Seleziona un\'azienda per iniziare a messaggiare'}
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {isEnglish 
                    ? 'No messages yet. Start a conversation!'
                    : 'Nessun messaggio. Inizia una conversazione!'}
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {messages.map((msg, index) => {
                  const showDate = index === 0 || 
                    formatDate(messages[index - 1].created_at) !== formatDate(msg.created_at);
                  
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-2">
                          <span className="text-xs bg-muted px-3 py-1 rounded-full">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${msg.sender_role === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.sender_role === 'ADMIN'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm break-words">{msg.message}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_role === 'ADMIN' 
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          
          {selectedCompany && (
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder={isEnglish ? 'Type a message...' : 'Scrivi un messaggio...'}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={isSending}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || isSending}
                  size="icon"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCompanyMessaging;

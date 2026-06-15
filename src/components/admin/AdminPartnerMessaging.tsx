import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: string;
  message: string;
  sender_role: string;
  created_at: string;
  is_read: boolean;
}

interface Partner {
  id: string;
  company_name: string;
  email: string;
  photo_url?: string;
  lastMessageAt?: string | null;
}

interface AdminPartnerMessagingProps {
  language: string;
}

const AdminPartnerMessaging = ({ language }: AdminPartnerMessagingProps) => {
  const isEnglish = language === 'en';
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    if (selectedPartner) {
      fetchMessages();
      
      const channel = supabase
        .channel(`admin-partner-messages-${selectedPartner.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'admin_partner_messages',
            filter: `partner_id=eq.${selectedPartner.id}`
          },
          () => {
            fetchMessages();
            fetchPartners(); // Refresh list to update order
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedPartner]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchPartners = async () => {
    try {
      // First get all partners
      const { data: allPartners, error: partnersError } = await supabase
        .from('profiles')
        .select('id, company_name, email, photo_url')
        .eq('role', 'PARTNER')
        .eq('status', 'approved');

      if (partnersError) throw partnersError;

      if (!allPartners || allPartners.length === 0) {
        setPartners([]);
        return;
      }

      // Get last message for each partner
      const partnersWithLastMessage = await Promise.all(
        allPartners.map(async (partner) => {
          const { data: lastMessage } = await supabase
            .from('admin_partner_messages')
            .select('created_at')
            .eq('partner_id', partner.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...partner,
            lastMessageAt: lastMessage?.created_at || null
          };
        })
      );

      // Sort by last message timestamp (most recent first)
      const sortedPartners = partnersWithLastMessage.sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0;
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });

      setPartners(sortedPartners);
    } catch (error: any) {
      console.error('Error fetching partners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedPartner) return;
    
    try {
      const { data, error } = await supabase
        .from('admin_partner_messages')
        .select('*')
        .eq('partner_id', selectedPartner.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark partner messages as read
      const unreadIds = (data || [])
        .filter(m => m.sender_role === 'PARTNER' && !m.is_read)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from('admin_partner_messages')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedPartner) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('admin_partner_messages')
        .insert({
          partner_id: selectedPartner.id,
          message: newMessage.trim(),
          sender_role: 'ADMIN',
          subject: 'Chat Message'
        });

      if (error) throw error;

      // Send email notification to partner
      await supabase.functions.invoke('send-partner-message-notification', {
        body: {
          companyEmail: selectedPartner.email,
          companyName: selectedPartner.company_name
        }
      });

      setNewMessage('');
      
      // Refresh partners list to update order
      fetchPartners();
      fetchMessages();
      
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Partners List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEnglish ? 'Partners' : 'Partner'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {partners.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">
                {isEnglish ? 'No partners found' : 'Nessun partner trovato'}
              </div>
            ) : (
              partners.map((partner) => (
                <div
                  key={partner.id}
                  onClick={() => setSelectedPartner(partner)}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedPartner?.id === partner.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={partner.photo_url} />
                      <AvatarFallback>
                        {partner.company_name?.charAt(0).toUpperCase() || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{partner.company_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{partner.email}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="md:col-span-2 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {selectedPartner 
              ? selectedPartner.company_name
              : isEnglish ? 'Select a partner' : 'Seleziona un partner'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {!selectedPartner ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {isEnglish 
                ? 'Select a partner to start chatting'
                : 'Seleziona un partner per iniziare a chattare'}
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 px-4" ref={scrollRef}>
                {messages.length === 0 ? (
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPartnerMessaging;

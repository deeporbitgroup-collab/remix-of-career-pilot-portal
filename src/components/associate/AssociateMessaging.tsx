import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  message: string;
  sender_role: string;
  created_at: string;
  is_read: boolean;
}

interface AssociateMessagingProps {
  language: string;
}

const AssociateMessaging = ({ language }: AssociateMessagingProps) => {
  const isEnglish = language === 'en';
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('associate-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_associate_messages'
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('admin_associate_messages')
        .select('*')
        .eq('associate_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark admin messages as read
      const unreadIds = (data || [])
        .filter(m => m.sender_role === 'ADMIN' && !m.is_read)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from('admin_associate_messages')
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
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('admin_associate_messages')
        .insert({
          associate_id: user.id,
          message: newMessage.trim(),
          sender_role: 'ASSOCIATE',
          subject: 'Chat Message'
        });

      if (error) throw error;

      // Send email notification to admin
      await supabase.functions.invoke('send-admin-associate-message', {
        body: {
          associateName: profile ? `${profile.first_name} ${profile.last_name}` : user.email,
          associateEmail: profile?.email || user.email,
          message: newMessage.trim()
        }
      });

      setNewMessage('');
      fetchMessages();
      
      toast({
        title: isEnglish ? "Message sent" : "Messaggio inviato",
        description: isEnglish 
          ? "Your message has been sent to the admin"
          : "Il tuo messaggio è stato inviato all'admin"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: isEnglish ? "Error" : "Errore",
        description: error.message || (isEnglish ? "Unable to send message" : "Impossibile inviare il messaggio")
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
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          {isEnglish ? 'Messages with Admin' : 'Messaggi con Admin'}
        </CardTitle>
        <CardDescription>
          {isEnglish 
            ? 'Chat with Career Pilot administrators'
            : 'Chatta con gli amministratori di Career Pilot'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          {isLoading ? (
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
                    <div className={`flex ${msg.sender_role === 'ASSOCIATE' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        msg.sender_role === 'ASSOCIATE'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm break-words">{msg.message}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_role === 'ASSOCIATE' 
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
      </CardContent>
    </Card>
  );
};

export default AssociateMessaging;

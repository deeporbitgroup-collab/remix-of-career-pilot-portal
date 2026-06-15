import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, User, Building2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Message {
  id: string;
  process_id: string;
  sender_id: string;
  sender_type: string;
  sender_name: string;
  message: string;
  created_at: string;
}

interface ActiveRecruitingChatProps {
  processId: string;
  currentUserType: 'STUDENT' | 'COMPANY' | 'ADMIN';
  currentUserId: string;
  currentUserName: string;
  studentName: string;
  studentEmail: string;
  companyName: string;
  companyEmail: string;
}

const getSenderIcon = (type: string) => {
  switch (type) {
    case 'STUDENT': return <User className="h-4 w-4" />;
    case 'COMPANY': return <Building2 className="h-4 w-4" />;
    case 'ADMIN': return <Shield className="h-4 w-4" />;
    default: return <User className="h-4 w-4" />;
  }
};

const getSenderColor = (type: string) => {
  switch (type) {
    case 'STUDENT': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'COMPANY': return 'bg-green-100 text-green-800 border-green-200';
    case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getSenderLabel = (type: string) => {
  switch (type) {
    case 'STUDENT': return 'Student';
    case 'COMPANY': return 'Company';
    case 'ADMIN': return 'Career Pilot';
    default: return type;
  }
};

export const ActiveRecruitingChat = ({
  processId,
  currentUserType,
  currentUserId,
  currentUserName,
  studentName,
  studentEmail,
  companyName,
  companyEmail
}: ActiveRecruitingChatProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`recruiting-chat-${processId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'recruiting_messages', 
          filter: `process_id=eq.${processId}` 
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('recruiting_messages')
        .select('*')
        .eq('process_id', processId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      // Insert message
      const { error: insertError } = await supabase
        .from('recruiting_messages')
        .insert({
          process_id: processId,
          sender_id: currentUserId,
          sender_type: currentUserType,
          sender_name: currentUserName,
          message: newMessage.trim()
        });

      if (insertError) throw insertError;

      // Send email notifications
      await supabase.functions.invoke('send-recruiting-chat-notification', {
        body: {
          processId,
          senderName: currentUserName,
          senderType: currentUserType,
          messagePreview: newMessage.trim(),
          studentName,
          studentEmail,
          companyName,
          companyEmail
        }
      });

      setNewMessage("");
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Active Recruiting Chat
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Shared conversation between Student, Company, and Career Pilot
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        <ScrollArea className="flex-1 pr-4 max-h-[400px]" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${isOwn ? 'order-1' : 'order-2'}`}>
                      <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <Badge variant="outline" className={`text-xs ${getSenderColor(msg.sender_type)}`}>
                          {getSenderIcon(msg.sender_type)}
                          <span className="ml-1">{getSenderLabel(msg.sender_type)}</span>
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {msg.sender_name}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isOwn 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <span className={`text-xs text-muted-foreground mt-1 block ${isOwn ? 'text-right' : 'text-left'}`}>
                        {format(new Date(msg.created_at), 'dd MMM yyyy, HH:mm')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="mt-4 flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[60px] resize-none"
            disabled={sending}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!newMessage.trim() || sending}
            className="self-end"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveRecruitingChat;

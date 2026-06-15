import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

interface GroupChat {
  id: string;
  name: string;
  created_at: string;
}

interface GroupMessage {
  id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  created_at: string;
  sender_name?: string;
  sender_photo?: string;
}

interface AssociateGroupChatProps {
  language: string;
}

export const AssociateGroupChat = ({ language }: AssociateGroupChatProps) => {
  const isEnglish = language === 'en';
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchGroupChats();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat);
      subscribeToMessages(selectedChat);
    }
  }, [selectedChat]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchGroupChats = async () => {
    if (!currentUserId) return;

    const { data: memberships } = await supabase
      .from("group_chat_members")
      .select("group_chat_id")
      .eq("user_id", currentUserId);

    if (!memberships || memberships.length === 0) {
      return;
    }

    const chatIds = memberships.map(m => m.group_chat_id);

    const { data, error } = await supabase
      .from("group_chats")
      .select("*")
      .in("id", chatIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching group chats:", error);
      return;
    }

    setGroupChats(data || []);
  };

  const fetchMessages = async (groupChatId: string) => {
    const { data, error } = await supabase
      .from("group_chat_messages")
      .select("*")
      .eq("group_chat_id", groupChatId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    // Fetch sender profile for each message
    const messagesWithProfiles = await Promise.all(
      (data || []).map(async (msg) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, photo_url")
          .eq("id", msg.sender_id)
          .single();

        return {
          ...msg,
          sender_name: profile
            ? `${profile.first_name} ${profile.last_name}`
            : "Unknown",
          sender_photo: profile?.photo_url,
        };
      })
    );

    setMessages(messagesWithProfiles);
  };

  const subscribeToMessages = (groupChatId: string) => {
    const channel = supabase
      .channel(`group_chat_${groupChatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_chat_messages",
          filter: `group_chat_id=eq.${groupChatId}`,
        },
        () => {
          fetchMessages(groupChatId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !currentUserId) return;

    setLoading(true);

    try {
      // Get current user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", currentUserId)
        .single();

      // Insert message
      const { error: messageError } = await supabase
        .from("group_chat_messages")
        .insert({
          group_chat_id: selectedChat,
          sender_id: currentUserId,
          sender_role: "ASSOCIATE",
          message: newMessage,
        });

      if (messageError) throw messageError;

      // Get all other members to notify (excluding current user)
      const { data: members } = await supabase
        .from("group_chat_members")
        .select("user_id")
        .eq("group_chat_id", selectedChat)
        .neq("user_id", currentUserId);

      // Fetch profiles for other members
      const otherMemberProfiles = await Promise.all(
        (members || []).map(async (m) => {
          const { data: memberProfile } = await supabase
            .from("profiles")
            .select("email, first_name, last_name")
            .eq("id", m.user_id)
            .single();
          return memberProfile;
        })
      );

      const memberEmails = otherMemberProfiles
        .map((p) => p?.email)
        .filter(Boolean) as string[];
      const memberNames = otherMemberProfiles
        .map((p) => (p ? `${p.first_name} ${p.last_name}` : ""))
        .filter(Boolean);

      const selectedChatData = groupChats.find(c => c.id === selectedChat);

      // Send notification
      await supabase.functions.invoke("send-group-message-notification", {
        body: {
          senderRole: "ASSOCIATE",
          senderName: profile ? `${profile.first_name} ${profile.last_name}` : "Associate",
          groupChatName: selectedChatData?.name || "Chat di gruppo",
          memberEmails,
          memberNames,
        },
      });

      setNewMessage("");
      toast.success(isEnglish ? "Message sent" : "Messaggio inviato");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(isEnglish ? "Error sending message" : "Errore nell'invio del messaggio");
    } finally {
      setLoading(false);
    }
  };

  const getColorForUser = (senderId: string, role: string) => {
    if (role === "ADMIN") return "bg-primary text-primary-foreground";
    // Hash user ID to get consistent color
    const colors = [
      "bg-green-500 text-white",
      "bg-orange-500 text-white",
      "bg-purple-500 text-white",
      "bg-pink-500 text-white",
      "bg-indigo-500 text-white",
      "bg-teal-500 text-white"
    ];
    const hash = senderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (groupChats.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Group Chats List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {isEnglish ? 'Group Chats' : 'Chat di Gruppo'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[480px]">
            {groupChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={`p-3 cursor-pointer rounded mb-2 transition-colors ${
                  selectedChat === chat.id
                    ? "bg-primary/10"
                    : "hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{chat.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>
            {selectedChat
              ? groupChats.find(c => c.id === selectedChat)?.name
              : isEnglish ? "Select a chat" : "Seleziona una chat"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-[520px]">
          <ScrollArea className="flex-1 pr-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-4 flex gap-2 ${
                  msg.sender_id === currentUserId ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender_id !== currentUserId && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.sender_photo} />
                    <AvatarFallback>
                      {msg.sender_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${getColorForUser(msg.sender_id, msg.sender_role)}`}
                >
                  {msg.sender_id !== currentUserId && (
                    <p className="text-xs font-medium mb-1">{msg.sender_name}</p>
                  )}
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString(isEnglish ? "en-US" : "it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </ScrollArea>

          {selectedChat && (
            <div className="flex gap-2 mt-4">
              <Input
                placeholder={isEnglish ? "Write a message..." : "Scrivi un messaggio..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

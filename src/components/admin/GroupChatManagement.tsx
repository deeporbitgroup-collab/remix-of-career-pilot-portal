import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Users, Send, Plus, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Associate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  photo_url?: string;
}

interface GroupChat {
  id: string;
  name: string;
  created_at: string;
  memberCount?: number;
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

export const GroupChatManagement = () => {
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Create group dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedAssociates, setSelectedAssociates] = useState<string[]>([]);
  const [searchAssociates, setSearchAssociates] = useState("");

  useEffect(() => {
    fetchAssociates();
    fetchGroupChats();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat);
      subscribeToMessages(selectedChat);
    }
  }, [selectedChat]);

  const fetchAssociates = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, photo_url")
      .eq("role", "ASSOCIATE")
      .eq("status", "approved");

    if (error) {
      console.error("Error fetching associates:", error);
      return;
    }

    setAssociates(data || []);
  };

  const fetchGroupChats = async () => {
    const { data, error } = await supabase
      .from("group_chats")
      .select(`
        id,
        name,
        created_at,
        group_chat_members(count)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching group chats:", error);
      return;
    }

    const chatsWithCount = data?.map(chat => ({
      ...chat,
      memberCount: chat.group_chat_members?.[0]?.count || 0
    }));

    setGroupChats(chatsWithCount || []);
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

  const createGroupChat = async () => {
    if (!newGroupName.trim() || selectedAssociates.length === 0) {
      toast.error("Inserisci un nome e seleziona almeno un associate");
      return;
    }

    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Create group chat
      const { data: groupChat, error: chatError } = await supabase
        .from("group_chats")
        .insert({
          name: newGroupName,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add members
      const members = selectedAssociates.map(associateId => ({
        group_chat_id: groupChat.id,
        user_id: associateId,
      }));

      const { error: membersError } = await supabase
        .from("group_chat_members")
        .insert(members);

      if (membersError) throw membersError;

      toast.success("Chat di gruppo creata");
      setCreateDialogOpen(false);
      setNewGroupName("");
      setSelectedAssociates([]);
      setSearchAssociates("");
      fetchGroupChats();
    } catch (error: any) {
      console.error("Error creating group chat:", error);
      toast.error("Errore nella creazione della chat");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Insert message
      const { error: messageError } = await supabase
        .from("group_chat_messages")
        .insert({
          group_chat_id: selectedChat,
          sender_id: user.user.id,
          sender_role: "ADMIN",
          message: newMessage,
        });

      if (messageError) throw messageError;

      // Get current user's profile
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.user.id)
        .single();

      // Get members to notify
      const { data: members } = await supabase
        .from("group_chat_members")
        .select("user_id")
        .eq("group_chat_id", selectedChat);

      if (!members) {
        toast.success("Messaggio inviato");
        setNewMessage("");
        return;
      }

      // Fetch profile for each member
      const memberProfiles = await Promise.all(
        members.map(async (m) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, first_name, last_name")
            .eq("id", m.user_id)
            .single();
          return profile;
        })
      );

      const memberEmails = memberProfiles
        .map((p) => p?.email)
        .filter(Boolean) as string[];
      const memberNames = memberProfiles
        .map((p) => (p ? `${p.first_name} ${p.last_name}` : ""))
        .filter(Boolean);

      const selectedChatData = groupChats.find(c => c.id === selectedChat);

      // Send notification
      await supabase.functions.invoke("send-group-message-notification", {
        body: {
          senderRole: "ADMIN",
          senderName: currentProfile ? `${currentProfile.first_name} ${currentProfile.last_name}` : "Career Pilot",
          groupChatName: selectedChatData?.name || "Chat di gruppo",
          memberEmails,
          memberNames,
        },
      });

      setNewMessage("");
      toast.success("Messaggio inviato");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Errore nell'invio del messaggio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Group Chats List */}
      <Card className="md:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Chat di Gruppo
          </CardTitle>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea Chat di Gruppo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Nome del gruppo"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Seleziona Associates:</p>
                  <Input
                    placeholder="Cerca per nome o cognome..."
                    value={searchAssociates}
                    onChange={(e) => setSearchAssociates(e.target.value)}
                    className="mb-2"
                  />
                  <ScrollArea className="h-[300px] border rounded p-2">
                    {associates
                      .filter(associate => {
                        const searchLower = searchAssociates.toLowerCase();
                        const fullName = `${associate.first_name} ${associate.last_name}`.toLowerCase();
                        return fullName.includes(searchLower);
                      })
                      .map((associate) => (
                      <div key={associate.id} className="flex items-center space-x-2 py-2">
                        <Checkbox
                          id={associate.id}
                          checked={selectedAssociates.includes(associate.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAssociates([...selectedAssociates, associate.id]);
                            } else {
                              setSelectedAssociates(selectedAssociates.filter(id => id !== associate.id));
                            }
                          }}
                        />
                        <label htmlFor={associate.id} className="flex items-center gap-2 cursor-pointer">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={associate.photo_url} />
                            <AvatarFallback>
                              {associate.first_name[0]}{associate.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {associate.first_name} {associate.last_name}
                          </span>
                        </label>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
                <Button onClick={createGroupChat} disabled={loading} className="w-full">
                  Crea Gruppo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                    <p className="text-xs text-muted-foreground">
                      {chat.memberCount} membri
                    </p>
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
              : "Seleziona una chat"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-[520px]">
          <ScrollArea className="flex-1 pr-4">
            {messages.map((msg) => {
              // Generate color based on sender_id
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

              return (
                <div
                  key={msg.id}
                  className={`mb-4 flex gap-2 ${
                    msg.sender_role === "ADMIN" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.sender_role !== "ADMIN" && (
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
                    {msg.sender_role !== "ADMIN" && (
                      <p className="text-xs font-medium mb-1">{msg.sender_name}</p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString("it-IT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </ScrollArea>

          {selectedChat && (
            <div className="flex gap-2 mt-4">
              <Input
                placeholder="Scrivi un messaggio..."
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

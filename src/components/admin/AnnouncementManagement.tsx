import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Send, FileText, Trash2, Edit, Eye, EyeOff, 
  Plus, Upload, X, Download, Users, Building 
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ASSOCIATE' | 'PARTNER';
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: 'ASSOCIATE' | 'PARTNER' | 'BOTH';
  priority: boolean;
  active: boolean;
  created_at: string;
  announcement_attachments?: AnnouncementAttachment[];
}

interface AnnouncementAttachment {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
}

interface AnnouncementManagementProps {
  targetAudience?: 'associates' | 'partners';
}

const AnnouncementManagement = ({ targetAudience }: AnnouncementManagementProps = {}) => {
  const { language } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  
  // Set default target audience based on prop
  const defaultAudience = targetAudience === 'associates' ? 'ASSOCIATE' : targetAudience === 'partners' ? 'PARTNER' : 'BOTH';
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_audience: defaultAudience as 'ASSOCIATE' | 'PARTNER' | 'BOTH',
    priority: false
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Recipient selection state
  const [recipientMode, setRecipientMode] = useState<'all' | 'specific'>('all');
  const [associates, setAssociates] = useState<Profile[]>([]);
  const [partners, setPartners] = useState<Profile[]>([]);
  const [selectedAssociates, setSelectedAssociates] = useState<string[]>([]);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);

  useEffect(() => {
    fetchAnnouncements();
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role')
        .in('role', ['ASSOCIATE', 'PARTNER'])
        .eq('status', 'approved');

      if (error) throw error;

      const profileData = data as Profile[];
      setAssociates(profileData.filter(p => p.role === 'ASSOCIATE'));
      setPartners(profileData.filter(p => p.role === 'PARTNER'));
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      let query = supabase
        .from('announcements')
        .select('*, announcement_attachments(*)');
      
      // Filter by target audience if specified
      if (targetAudience === 'associates') {
        query = query.in('target_audience', ['ASSOCIATE', 'BOTH']);
      } else if (targetAudience === 'partners') {
        query = query.in('target_audience', ['PARTNER', 'BOTH']);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements((data || []) as Announcement[]);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: language === 'it' 
          ? "Impossibile caricare le comunicazioni" 
          : "Failed to load announcements",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: language === 'it' 
          ? "Titolo e contenuto sono obbligatori" 
          : "Title and content are required",
        variant: "destructive"
      });
      return;
    }

    // Validate recipient selection
    if (recipientMode === 'specific') {
      const hasAssociates = formData.target_audience === 'ASSOCIATE' || formData.target_audience === 'BOTH';
      const hasPartners = formData.target_audience === 'PARTNER' || formData.target_audience === 'BOTH';
      
      if (hasAssociates && selectedAssociates.length === 0) {
        toast({
          title: language === 'it' ? "Errore" : "Error",
          description: language === 'it' 
            ? "Seleziona almeno un Associate" 
            : "Select at least one Associate",
          variant: "destructive"
        });
        return;
      }
      
      if (hasPartners && selectedPartners.length === 0) {
        toast({
          title: language === 'it' ? "Errore" : "Error",
          description: language === 'it' 
            ? "Seleziona almeno un Partner" 
            : "Select at least one Partner",
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create or update announcement
      let announcementId: string;
      
      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: formData.title,
            content: formData.content,
            target_audience: formData.target_audience,
            priority: formData.priority,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
        announcementId = editingAnnouncement.id;

        // Delete existing recipients if updating
        await supabase
          .from('announcement_recipients')
          .delete()
          .eq('announcement_id', announcementId);
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .insert({
            title: formData.title,
            content: formData.content,
            target_audience: formData.target_audience,
            priority: formData.priority,
            created_by: user.id
          })
          .select()
          .single();

        if (error) throw error;
        announcementId = data.id;
      }

      // Add specific recipients if mode is 'specific'
      if (recipientMode === 'specific') {
        const recipientIds = [...selectedAssociates, ...selectedPartners];
        if (recipientIds.length > 0) {
          const { error: recipientsError } = await supabase
            .from('announcement_recipients')
            .insert(
              recipientIds.map(userId => ({
                announcement_id: announcementId,
                user_id: userId
              }))
            );

          if (recipientsError) throw recipientsError;
        }
      }

      // Upload attachments if any
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${announcementId}/${Date.now()}_${file.name}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('announcements')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save attachment record
        const { error: attachmentError } = await supabase
          .from('announcement_attachments')
          .insert({
            announcement_id: announcementId,
            filename: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: filePath
          });

        if (attachmentError) throw attachmentError;
      }

      // Send email notifications
      try {
        const emailRecipients = recipientMode === 'specific' 
          ? [...selectedAssociates, ...selectedPartners]
          : undefined;

        const { data: emailData } = await supabase.functions.invoke('send-announcement-email', {
          body: {
            announcementId,
            title: formData.title,
            content: formData.content,
            recipientIds: emailRecipients
          }
        });

        if (emailData?.testMode) {
          toast({
            title: language === 'it' ? 'Email inviata in modalità test' : 'Email sent in test mode',
            description: language === 'it'
              ? `Inviata a ${emailData.allowedTestRecipient}. Alcuni destinatari potrebbero essere stati ignorati finché il dominio non è verificato.`
              : `Sent to ${emailData.allowedTestRecipient}. Some recipients may have been skipped until a domain is verified.`,
          });
        }
      } catch (emailError) {
        console.error('Error sending emails:', emailError);
        // Don't fail the whole operation if emails fail
      }

      toast({
        title: language === 'it' ? "Successo" : "Success",
        description: language === 'it' 
          ? "Comunicazione inviata con successo" 
          : "Announcement sent successfully"
      });

      setIsDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: language === 'it' 
          ? "Errore durante il salvataggio" 
          : "Error saving announcement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAnnouncementStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ active })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: language === 'it' ? "Successo" : "Success",
        description: language === 'it' 
          ? `Comunicazione ${active ? 'attivata' : 'disattivata'}` 
          : `Announcement ${active ? 'activated' : 'deactivated'}`
      });

      fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement:', error);
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: language === 'it' 
          ? "Errore nell'aggiornamento dello stato" 
          : "Error updating status",
        variant: "destructive"
      });
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm(language === 'it' 
      ? 'Sei sicuro di voler eliminare questa comunicazione?' 
      : 'Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: language === 'it' ? "Successo" : "Success",
        description: language === 'it' 
          ? "Comunicazione eliminata" 
          : "Announcement deleted"
      });

      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: language === 'it' 
          ? "Errore durante l'eliminazione" 
          : "Error deleting announcement",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      target_audience: defaultAudience,
      priority: false
    });
    setAttachments([]);
    setEditingAnnouncement(null);
    setRecipientMode('all');
    setSelectedAssociates([]);
    setSelectedPartners([]);
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'ASSOCIATE':
        return <Users className="h-4 w-4" />;
      case 'PARTNER':
        return <Building className="h-4 w-4" />;
      default:
        return <></>;
    }
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'ASSOCIATE':
        return 'Associates';
      case 'PARTNER':
        return 'Partners';
      case 'BOTH':
        return language === 'it' ? 'Entrambi' : 'Both';
      default:
        return audience;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            {language === 'it' ? 'Gestione Comunicazioni' : 'Announcement Management'}
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                {language === 'it' ? 'Nuova Comunicazione' : 'New Announcement'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAnnouncement 
                    ? (language === 'it' ? 'Modifica Comunicazione' : 'Edit Announcement')
                    : (language === 'it' ? 'Nuova Comunicazione' : 'New Announcement')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{language === 'it' ? 'Titolo' : 'Title'}</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={language === 'it' ? 'Inserisci titolo...' : 'Enter title...'}
                  />
                </div>
                
                <div>
                  <Label>{language === 'it' ? 'Contenuto' : 'Content'}</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder={language === 'it' ? 'Inserisci contenuto...' : 'Enter content...'}
                    rows={6}
                  />
                </div>

                <div>
                  <Label>{language === 'it' ? 'Destinatari' : 'Target Audience'}</Label>
                  <Select 
                    value={formData.target_audience}
                    onValueChange={(value: 'ASSOCIATE' | 'PARTNER' | 'BOTH') => 
                      setFormData({ ...formData, target_audience: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSOCIATE">Associates</SelectItem>
                      <SelectItem value="PARTNER">Partners</SelectItem>
                      <SelectItem value="BOTH">
                        {language === 'it' ? 'Entrambi' : 'Both'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>{language === 'it' ? 'Modalità di Invio' : 'Send Mode'}</Label>
                  <RadioGroup value={recipientMode} onValueChange={(value: 'all' | 'specific') => setRecipientMode(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all" />
                      <Label htmlFor="all" className="cursor-pointer font-normal">
                        {language === 'it' ? 'Invia a tutti' : 'Send to all'}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="specific" id="specific" />
                      <Label htmlFor="specific" className="cursor-pointer font-normal">
                        {language === 'it' ? 'Seleziona destinatari specifici' : 'Select specific recipients'}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {recipientMode === 'specific' && (
                  <div className="space-y-4">
                    {(formData.target_audience === 'ASSOCIATE' || formData.target_audience === 'BOTH') && (
                      <div>
                        <Label className="mb-2 block">
                          {language === 'it' ? 'Seleziona Associates' : 'Select Associates'}
                        </Label>
                        <ScrollArea className="h-[150px] border rounded-md p-4">
                          <div className="space-y-2">
                            {associates.map((associate) => (
                              <div key={associate.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`associate-${associate.id}`}
                                  checked={selectedAssociates.includes(associate.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedAssociates([...selectedAssociates, associate.id]);
                                    } else {
                                      setSelectedAssociates(selectedAssociates.filter(id => id !== associate.id));
                                    }
                                  }}
                                />
                                <Label htmlFor={`associate-${associate.id}`} className="cursor-pointer font-normal">
                                  {associate.first_name} {associate.last_name} ({associate.email})
                                </Label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {(formData.target_audience === 'PARTNER' || formData.target_audience === 'BOTH') && (
                      <div>
                        <Label className="mb-2 block">
                          {language === 'it' ? 'Seleziona Partners' : 'Select Partners'}
                        </Label>
                        <ScrollArea className="h-[150px] border rounded-md p-4">
                          <div className="space-y-2">
                            {partners.map((partner) => (
                              <div key={partner.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`partner-${partner.id}`}
                                  checked={selectedPartners.includes(partner.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedPartners([...selectedPartners, partner.id]);
                                    } else {
                                      setSelectedPartners(selectedPartners.filter(id => id !== partner.id));
                                    }
                                  }}
                                />
                                <Label htmlFor={`partner-${partner.id}`} className="cursor-pointer font-normal">
                                  {partner.first_name} {partner.last_name} ({partner.email})
                                </Label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.priority}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, priority: checked })
                    }
                  />
                  <Label>
                    {language === 'it' ? 'Alta Priorità' : 'High Priority'}
                  </Label>
                </div>

                <div>
                  <Label>{language === 'it' ? 'Allegati PDF' : 'PDF Attachments'}</Label>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setAttachments([...attachments, ...files]);
                      }}
                    />
                    {attachments.length > 0 && (
                      <div className="space-y-1">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                            <span className="text-sm">{file.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const newAttachments = [...attachments];
                                newAttachments.splice(index, 1);
                                setAttachments(newAttachments);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {language === 'it' ? 'Annulla' : 'Cancel'}
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading}>
                    <Send className="mr-2 h-4 w-4" />
                    {loading 
                      ? (language === 'it' ? 'Invio...' : 'Sending...') 
                      : (language === 'it' ? 'Invia' : 'Send')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{announcement.title}</h3>
                    {announcement.priority && (
                      <Badge variant="destructive">
                        {language === 'it' ? 'Alta Priorità' : 'High Priority'}
                      </Badge>
                    )}
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getAudienceIcon(announcement.target_audience)}
                      {getAudienceLabel(announcement.target_audience)}
                    </Badge>
                    <Badge variant={announcement.active ? "default" : "secondary"}>
                      {announcement.active 
                        ? (language === 'it' ? 'Attiva' : 'Active')
                        : (language === 'it' ? 'Inattiva' : 'Inactive')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {announcement.content}
                  </p>
                  {announcement.announcement_attachments && announcement.announcement_attachments.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {announcement.announcement_attachments.length} {language === 'it' ? 'allegati' : 'attachments'}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(announcement.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleAnnouncementStatus(announcement.id, !announcement.active)}
                  >
                    {announcement.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingAnnouncement(announcement);
                      setFormData({
                        title: announcement.title,
                        content: announcement.content,
                        target_audience: announcement.target_audience,
                        priority: announcement.priority
                      });
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteAnnouncement(announcement.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnnouncementManagement;
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Download, AlertTriangle, Info, FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string;
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

interface AnnouncementDisplayProps {
  userRole: 'ASSOCIATE' | 'PARTNER';
}

const AnnouncementDisplay = ({ userRole }: AnnouncementDisplayProps) => {
  const { language } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);

  useEffect(() => {
    fetchAnnouncements();
    
    // Load dismissed announcements from localStorage
    const dismissed = localStorage.getItem('dismissedAnnouncements');
    if (dismissed) {
      setDismissedAnnouncements(JSON.parse(dismissed));
    }
  }, [userRole]);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*, announcement_attachments(*)')
        .eq('active', true)
        .in('target_audience', userRole === 'ASSOCIATE' ? ['ASSOCIATE', 'BOTH'] : ['PARTNER', 'BOTH'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const dismissAnnouncement = (id: string) => {
    const newDismissed = [...dismissedAnnouncements, id];
    setDismissedAnnouncements(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
  };

  const downloadAttachment = async (attachment: AnnouncementAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('announcements')
        .download(attachment.storage_path);

      if (error) throw error;

      // Create a download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    else return Math.round(bytes / 1048576) + ' MB';
  };

  const visibleAnnouncements = announcements.filter(a => !dismissedAnnouncements.includes(a.id));

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      {visibleAnnouncements.map((announcement) => (
        <Alert 
          key={announcement.id} 
          className={announcement.priority ? "border-destructive" : ""}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {announcement.priority ? (
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              ) : (
                <Info className="h-5 w-5 text-primary mt-0.5" />
              )}
              <div className="flex-1">
                <AlertTitle className="mb-2">
                  {announcement.title}
                  {announcement.priority && (
                    <Badge variant="destructive" className="ml-2">
                      {language === 'it' ? 'Importante' : 'Important'}
                    </Badge>
                  )}
                </AlertTitle>
                <AlertDescription className="mb-3">
                  {announcement.content}
                </AlertDescription>
                
                {announcement.announcement_attachments && announcement.announcement_attachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-sm font-medium">
                      {language === 'it' ? 'Allegati:' : 'Attachments:'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {announcement.announcement_attachments.map((attachment) => (
                        <Button
                          key={attachment.id}
                          variant="outline"
                          size="sm"
                          onClick={() => downloadAttachment(attachment)}
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="max-w-[200px] truncate">
                            {attachment.filename}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({formatFileSize(attachment.file_size)})
                          </span>
                          <Download className="h-3 w-3" />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-3">
                  {new Date(announcement.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissAnnouncement(announcement.id)}
              className="ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
};

export default AnnouncementDisplay;
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Download, Linkedin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Associate {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  university?: string;
  master_program?: string;
  sector?: string;
  company_name?: string;
  linkedin_url?: string;
  overview_url?: string;
  cv_storage_path?: string;
}

interface AssociateCardProps {
  associate: Associate;
  compact?: boolean;
}

const AssociateCard = ({ associate, compact = false }: AssociateCardProps) => {
  const downloadUrlAsFile = async (url: string) => {
    const fileNameFromUrl = (() => {
      try {
        const u = new URL(url);
        const last = u.pathname.split('/').filter(Boolean).pop();
        return decodeURIComponent(last || 'document.pdf');
      } catch {
        return 'document.pdf';
      }
    })();

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileNameFromUrl;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(objectUrl);
  };

  const handleDownloadDocument = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const hasOverview = !!associate.overview_url;
    const hasCvStoragePath = !!associate.cv_storage_path;
    
    if (!hasOverview && !hasCvStoragePath) return;

    try {
      if (hasOverview) {
        if (associate.overview_url!.includes('/associate-overviews/')) {
          await downloadUrlAsFile(associate.overview_url!);
          return;
        }

        const { data, error } = await supabase.functions.invoke('get-associate-overview-url', {
          body: { associateId: associate.id, type: 'overview' },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('Missing document URL');

        await downloadUrlAsFile(data.url);
        return;
      }

      if (hasCvStoragePath) {
        const { data, error } = await supabase.functions.invoke('get-associate-overview-url', {
          body: { associateId: associate.id, type: 'cv' },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('Failed to get CV download URL');

        await downloadUrlAsFile(data.url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Avatar className="h-12 w-12">
          <AvatarImage src={associate.photo_url} alt={`${associate.first_name} ${associate.last_name}`} />
          <AvatarFallback>{associate.first_name?.[0]}{associate.last_name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{associate.first_name} {associate.last_name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {associate.company_name && (
              <Badge variant="default" className="text-xs flex items-center gap-1">
                <Building2 className="h-2 w-2" />
                {associate.company_name}
              </Badge>
            )}
            {associate.university && (
              <Badge variant="secondary" className="text-xs">{associate.university}</Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={associate.photo_url} alt={`${associate.first_name} ${associate.last_name}`} />
            <AvatarFallback className="text-lg">{associate.first_name?.[0]}{associate.last_name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{associate.first_name} {associate.last_name}</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {associate.company_name && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {associate.company_name}
                </Badge>
              )}
              {associate.university && (
                <Badge variant="secondary">{associate.university}</Badge>
              )}
              {associate.master_program && (
                <Badge variant="secondary">{associate.master_program}</Badge>
              )}
              {associate.sector && (
                <Badge variant="outline">{associate.sector}</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          {(associate.overview_url || associate.cv_storage_path) && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleDownloadDocument}
            >
              {associate.overview_url ? (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Download Overview
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download CV
                </>
              )}
            </Button>
          )}
          {associate.linkedin_url && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={associate.linkedin_url.startsWith('http') ? associate.linkedin_url : `https://${associate.linkedin_url}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AssociateCard;

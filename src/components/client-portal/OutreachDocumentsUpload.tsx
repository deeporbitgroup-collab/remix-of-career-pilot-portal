import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, X, RefreshCw, Mail } from "lucide-react";
import { toast } from "sonner";

interface OutreachDocumentsUploadProps {
  cvFile: File | null;
  coverLetterFile: File | null;
  customEmail: string;
  useCustomEmail: boolean;
  onCvChange: (file: File | null) => void;
  onCoverLetterChange: (file: File | null) => void;
  onCustomEmailChange: (email: string) => void;
  onUseCustomEmailChange: (use: boolean) => void;
}

const OutreachDocumentsUpload = ({
  cvFile,
  coverLetterFile,
  customEmail,
  useCustomEmail,
  onCvChange,
  onCoverLetterChange,
  onCustomEmailChange,
  onUseCustomEmailChange,
}: OutreachDocumentsUploadProps) => {
  const handleFileDownload = (file: File) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Download started!");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="backdrop-blur-sm bg-background/95 shadow-lg border-primary/20">
      <CardHeader className="py-4 px-5">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Outreach Power Pack Documents
        </CardTitle>
        <CardDescription className="text-sm">
          Upload your CV and Cover Letter for the outreach campaign. These documents will be sent with each application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5">
        {/* CV Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            CV <span className="text-destructive">*</span>
          </Label>
          {cvFile ? (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{cvFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(cvFile.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFileDownload(cvFile)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCvChange(null)}
                  title="Replace"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => onCvChange(e.target.files?.[0] || null)}
            />
          )}
        </div>

        {/* Cover Letter Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            Cover Letter <span className="text-destructive">*</span>
          </Label>
          {coverLetterFile ? (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{coverLetterFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(coverLetterFile.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFileDownload(coverLetterFile)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCoverLetterChange(null)}
                  title="Replace"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => onCoverLetterChange(e.target.files?.[0] || null)}
            />
          )}
        </div>

        {/* Custom Email Section */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Custom Email Template
            </Label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={useCustomEmail ? "default" : "outline"}
                onClick={() => onUseCustomEmailChange(!useCustomEmail)}
              >
                {useCustomEmail ? "Using Custom Email" : "Use Default Email"}
              </Button>
            </div>
          </div>
          
          {useCustomEmail ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Write your custom email message here. This email will be sent along with your CV and Cover Letter to each company.

Example:
Dear Hiring Team,

I am writing to express my interest in internship opportunities at your company. Please find attached my CV and Cover Letter for your consideration.

Best regards,
[Your Name]"
                value={customEmail}
                onChange={(e) => onCustomEmailChange(e.target.value)}
                className="min-h-[180px] text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This email will be sent to 100+ companies along with your CV and Cover Letter.
              </p>
            </div>
          ) : (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Career Pilot will use a professional, effective email template</strong> that has been optimized for response rates. 
                Your CV and Cover Letter will be attached automatically.
              </p>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 pt-2">
          {cvFile && coverLetterFile ? (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
              ✓ Documents Ready
            </Badge>
          ) : (
            <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
              Upload both CV and Cover Letter to proceed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OutreachDocumentsUpload;

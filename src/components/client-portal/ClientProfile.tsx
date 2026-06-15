import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import bcrypt from "bcryptjs";
import { Download, Edit2, Save, X, User, Mail, Phone, Linkedin, Lock } from "lucide-react";
const sb = supabase as any;

interface ClientProfileProps {
  clientUser: any;
  setClientUser: (user: any) => void;
}

const ClientProfile = ({ clientUser, setClientUser }: ClientProfileProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [formData, setFormData] = useState({
    firstName: clientUser.first_name,
    lastName: clientUser.last_name,
    phone: clientUser.phone,
    linkedinUrl: clientUser.linkedin_url || "",
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      let photoUrl = clientUser.photo_url;
      let cvUrl = clientUser.cv_url;

      // Upload photo if changed
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${clientUser.id}-${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await sb.storage
          .from('documents')
          .upload(`client-photos/${fileName}`, photoFile);

        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = sb.storage
          .from('documents')
          .getPublicUrl(uploadData.path);
        photoUrl = publicUrl;
      }

      // Upload CV if changed
      if (cvFile) {
        const fileExt = cvFile.name.split('.').pop();
        const fileName = `${clientUser.id}-${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await sb.storage
          .from('documents')
          .upload(`client-cvs/${fileName}`, cvFile);

        if (uploadError) throw uploadError;
        cvUrl = uploadData.path;
      }

      const updateData: any = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        linkedin_url: formData.linkedinUrl || null,
        photo_url: photoUrl,
        cv_url: cvUrl,
        updated_at: new Date().toISOString(),
      };

      // Update password if provided
      if (newPassword) {
        updateData.password_hash = await bcrypt.hash(newPassword, 10);
      }

      const { error } = await sb
        .from('client_users')
        .update(updateData)
        .eq('id', clientUser.id);

      if (error) throw error;

      const updatedUser = { ...clientUser, ...updateData };
      setClientUser(updatedUser);
      localStorage.setItem('client_user', JSON.stringify(updatedUser));

      toast.success("Profile updated successfully!");
      setIsEditing(false);
      setPhotoFile(null);
      setCvFile(null);
      setNewPassword("");
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCV = async () => {
    if (!clientUser.cv_url) return;

    try {
      const { data, error } = await sb.storage
        .from('documents')
        .download(clientUser.cv_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CV-${clientUser.first_name}-${clientUser.last_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error("Failed to download CV");
    }
  };

  return (
    <Card className="backdrop-blur-sm bg-background/95 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl">My Profile</CardTitle>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isLoading} size="sm">
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saving..." : "Save"}
            </Button>
            <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          <Avatar className="h-32 w-32 border-4 border-primary/20">
            <AvatarImage src={photoFile ? URL.createObjectURL(photoFile) : clientUser.photo_url} />
            <AvatarFallback className="text-3xl">
              {clientUser.first_name[0]}{clientUser.last_name[0]}
            </AvatarFallback>
          </Avatar>
          {isEditing && (
            <div className="flex-1">
              <Label htmlFor="photo" className="text-sm font-medium">Profile Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF (max 5MB)</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                First Name
              </Label>
              {isEditing ? (
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              ) : (
                <p className="py-2 px-3 bg-muted rounded-md">{clientUser.first_name}</p>
              )}
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                Last Name
              </Label>
              {isEditing ? (
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              ) : (
                <p className="py-2 px-3 bg-muted rounded-md">{clientUser.last_name}</p>
              )}
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <p className="py-2 px-3 bg-muted rounded-md text-muted-foreground">
              {clientUser.email}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4" />
              Phone
            </Label>
            {isEditing ? (
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            ) : (
              <p className="py-2 px-3 bg-muted rounded-md">{clientUser.phone}</p>
            )}
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Linkedin className="h-4 w-4" />
              LinkedIn Profile
            </Label>
            {isEditing ? (
              <Input
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            ) : clientUser.linkedin_url ? (
              <a 
                href={clientUser.linkedin_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="py-2 px-3 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors inline-flex items-center gap-2"
              >
                View Profile
                <Linkedin className="h-4 w-4" />
              </a>
            ) : (
              <p className="py-2 px-3 bg-muted rounded-md text-muted-foreground">Not provided</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Documents */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Download className="h-5 w-5" />
            Documents
          </h3>

          {isEditing && (
            <div>
              <Label htmlFor="cv">Update CV (PDF)</Label>
              <Input
                id="cv"
                type="file"
                accept=".pdf"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
            </div>
          )}

          {clientUser.cv_url && !isEditing && (
            <Button onClick={handleDownloadCV} variant="outline" className="w-full md:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Download Current CV
            </Button>
          )}
        </div>

        {/* Security */}
        {isEditing && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </h3>
              <div>
                <Label htmlFor="new-password">New Password (optional)</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  minLength={6}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 6 characters
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientProfile;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowLeft, Mail, Phone, Lock, Save, Upload, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useI18n } from "@/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const PartnerProfile = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    first_name: '',
    last_name: '',
    company_name: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            setFormData({
              email: profile.email || '',
              phone: profile.phone || '',
              first_name: profile.first_name || '',
              last_name: profile.last_name || '',
              company_name: profile.company_name || ''
            });
            setPhotoUrl(profile.photo_url || "");
            setPhotoPreview(profile.photo_url || "");
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCompanyLogo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase.storage
          .from('partner-documents')
          .list(`${user.id}/`, {
            search: 'logo'
          });

        if (data && data.length > 0) {
          const { data: { publicUrl } } = supabase.storage
            .from('partner-documents')
            .getPublicUrl(`${user.id}/${data[0].name}`);
          
          setLogoUrl(publicUrl);
        }
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    };

    fetchProfile();
    fetchCompanyLogo();
  }, []);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: language === 'it' ? 'Errore' : 'Error',
        description: language === 'it' ? 'Carica un file immagine' : 'Please upload an image file'
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: existingFiles } = await supabase.storage
        .from('partner-documents')
        .list(`${user.id}/`, {
          search: 'logo'
        });

      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('partner-documents')
          .remove(existingFiles.map(f => `${user.id}/${f.name}`));
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('partner-documents')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('partner-documents')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);

      toast({
        title: language === 'it' ? 'Successo' : 'Success',
        description: language === 'it' ? 'Logo aziendale aggiornato con successo' : 'Company logo updated successfully'
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: language === 'it' ? 'Errore' : 'Error',
        description: error.message
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: language === 'it' ? "Errore" : "Error",
          description: language === 'it' 
            ? "La foto deve essere inferiore a 5MB" 
            : "Photo must be less than 5MB"
        });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      let updatedPhotoUrl = photoUrl;

      // Upload photo if changed
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const filePath = `${user.id}/profile.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(filePath, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(filePath);

        updatedPhotoUrl = publicUrl;
      }

      // Update profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email: formData.email,
          phone: formData.phone,
          first_name: formData.first_name,
          last_name: formData.last_name,
          company_name: formData.company_name,
          photo_url: updatedPhotoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update email in auth if changed
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });
        
        if (emailError) throw emailError;
        
        toast({
          title: language === 'it' ? "Email aggiornata" : "Email updated",
          description: language === 'it' 
            ? "Riceverai un'email di conferma se hai cambiato indirizzo" 
            : "You'll receive a verification email if you changed address"
        });
      }

      toast({
        title: language === 'it' ? "Profilo aggiornato" : "Profile updated",
        description: language === 'it' 
          ? "Le modifiche sono state salvate con successo" 
          : "Changes have been saved successfully"
      });
    } catch (error: any) {
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: language === 'it' 
          ? "Le password non corrispondono" 
          : "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: language === 'it' 
          ? "La password deve essere di almeno 8 caratteri" 
          : "Password must be at least 8 characters",
        variant: "destructive"
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: language === 'it' ? "Password aggiornata" : "Password updated",
        description: language === 'it' 
          ? "La password è stata modificata con successo" 
          : "Password has been changed successfully"
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/app/partner")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {language === 'it' ? 'Torna alla Dashboard' : 'Back to Dashboard'}
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            {language === 'it' ? 'Profilo Aziendale' : 'Company Profile'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {language === 'it' 
              ? 'Gestisci le informazioni della tua azienda' 
              : 'Manage your company information'}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'it' ? 'Dati di Contatto' : 'Contact Information'}
              </CardTitle>
              <CardDescription>
                {language === 'it' 
                  ? 'Aggiorna le tue informazioni di contatto' 
                  : 'Update your contact information'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4 pb-6 border-b">
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">
                    {language === 'it' ? 'Logo Aziendale' : 'Company Logo'}
                  </p>
                  <Avatar className="h-32 w-32 mx-auto">
                    <AvatarImage src={logoUrl || undefined} />
                    <AvatarFallback className="text-3xl">
                      {formData.company_name?.[0] || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingLogo}
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {language === 'it' ? 'Carica Logo' : 'Upload Logo'}
                    </Button>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      {language === 'it' 
                        ? 'Formati accettati: JPG, PNG. Max 5MB'
                        : 'Accepted formats: JPG, PNG. Max 5MB'}
                    </p>
                  </div>
                </div>
                
                <div className="text-center space-y-2 pt-4">
                  <p className="text-sm font-medium">
                    {language === 'it' ? 'Foto Profilo Personale' : 'Personal Profile Photo'}
                  </p>
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage src={photoPreview} />
                    <AvatarFallback className="text-2xl">
                      {formData.first_name?.[0]}{formData.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {language === 'it' ? 'Carica Foto' : 'Upload Photo'}
                    </Button>
                    <Input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      {language === 'it' 
                        ? 'Max 5MB - JPG, PNG'
                        : 'Max 5MB - JPG, PNG'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="company">
                    {language === 'it' ? 'Nome Azienda' : 'Company Name'}
                  </Label>
                  <Input
                    id="company"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder={language === 'it' ? 'Nome della tua azienda' : 'Your company name'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">
                      {language === 'it' ? 'Nome' : 'First Name'}
                    </Label>
                    <Input
                      id="firstName"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">
                      {language === 'it' ? 'Cognome' : 'Last Name'}
                    </Label>
                    <Input
                      id="lastName"
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">
                    <Mail className="inline-block h-4 w-4 mr-1" />
                    {language === 'it' ? 'Email' : 'Email'}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@azienda.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'it' 
                      ? "Riceverai un'email di verifica se cambi indirizzo" 
                      : "You'll receive a verification email if you change address"}
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone">
                    <Phone className="inline-block h-4 w-4 mr-1" />
                    {language === 'it' ? 'Telefono' : 'Phone'}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+39 123 456 7890"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'it' 
                      ? 'Formato internazionale con prefisso' 
                      : 'International format with prefix'}
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleSaveProfile} 
                disabled={isSaving}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving 
                  ? (language === 'it' ? 'Salvataggio...' : 'Saving...') 
                  : (language === 'it' ? 'Salva Modifiche' : 'Save Changes')}
              </Button>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'it' ? 'Sicurezza' : 'Security'}
              </CardTitle>
              <CardDescription>
                {language === 'it' 
                  ? 'Cambia la tua password' 
                  : 'Change your password'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="currentPassword">
                    <Lock className="inline-block h-4 w-4 mr-1" />
                    {language === 'it' ? 'Password Attuale' : 'Current Password'}
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="newPassword">
                    {language === 'it' ? 'Nuova Password' : 'New Password'}
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">
                    {language === 'it' ? 'Conferma Nuova Password' : 'Confirm New Password'}
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  />
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>{language === 'it' ? 'La password deve avere:' : 'Password must have:'}</p>
                  <ul className="list-disc list-inside ml-2">
                    <li>{language === 'it' ? 'Almeno 8 caratteri' : 'At least 8 characters'}</li>
                    <li>{language === 'it' ? 'Una lettera maiuscola' : 'One uppercase letter'}</li>
                    <li>{language === 'it' ? 'Un numero' : 'One number'}</li>
                  </ul>
                </div>
              </div>

              <Button 
                onClick={handleChangePassword} 
                disabled={isChangingPassword}
                className="w-full"
                variant="outline"
              >
                <Lock className="mr-2 h-4 w-4" />
                {isChangingPassword 
                  ? (language === 'it' ? 'Cambio password...' : 'Changing password...') 
                  : (language === 'it' ? 'Cambia Password' : 'Change Password')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PartnerProfile;
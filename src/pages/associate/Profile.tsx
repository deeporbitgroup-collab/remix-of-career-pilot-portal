import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, ArrowLeft, Save, Mail, Phone, Lock, CheckCircle, Upload, Linkedin, Building, Briefcase, GraduationCap, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface Experience {
  id: string;
  company: string;
  role: string;
  sector: string;
  period?: string;
}

const AssociateProfile = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  
  const [profile, setProfile] = useState({
    email: '',
    phone: '',
    first_name: '',
    last_name: '',
    linkedin_url: '',
    status: {
      university_student: false,
      master_student: false,
      professional: false
    },
    university: '',
    master_program: '',
    sector: '',
    experiences: [] as Experience[]
  });
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      const metadata = user.user_metadata || {};
      
      setProfile({
        email: user.email || '',
        phone: data?.phone || '',
        first_name: data?.first_name || '',
        last_name: data?.last_name || '',
        linkedin_url: metadata.linkedin_url || '',
        status: (data?.profile_status as any) || {
          university_student: false,
          master_student: false,
          professional: false
        },
        university: data?.university || '',
        master_program: data?.master_program || '',
        sector: data?.sector || '',
        experiences: (data?.professional_experiences as unknown as Experience[]) || []
      });

      // Use the public photo_url stored on the profile so it stays in sync
      // with the public site (Experts carousel) and the client associate selectors.
      if ((data as any)?.photo_url) {
        setPhotoPreview((data as any).photo_url as string);
      }
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Errore",
        description: error.message || (isEnglish ? "Unable to load profile" : "Impossibile caricare il profilo"),
        variant: "destructive"
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: isEnglish ? "File too large" : "File troppo grande",
          description: isEnglish ? "Photo cannot exceed 5MB" : "La foto non può superare i 5MB",
        });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({
          variant: "destructive",
          title: isEnglish ? "Invalid format" : "Formato non valido",
          description: isEnglish ? "Only JPG, PNG, or WEBP accepted" : "Sono accettati solo JPG, PNG o WEBP",
        });
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setHasChanges(true);
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload photo to public bucket and store the public URL on profiles.photo_url
      // so the public Experts carousel and the client associate selectors always
      // see the latest photo.
      let publicPhotoUrl: string | null = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.id}/profile_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(fileName, photoFile, { upsert: true, contentType: photoFile.type });

        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(fileName);
        publicPhotoUrl = pub.publicUrl;
      }

      // Update profile with professional metadata (and the new photo_url if any)
      const profileUpdate: any = {
        phone: profile.phone,
        first_name: profile.first_name,
        last_name: profile.last_name,
        profile_status: profile.status as any,
        university: profile.university,
        master_program: profile.master_program,
        sector: profile.sector,
        professional_experiences: profile.experiences as any,
      };
      if (publicPhotoUrl) {
        profileUpdate.photo_url = publicPhotoUrl;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      if (profileError) throw profileError;

      if (publicPhotoUrl) {
        setPhotoPreview(publicPhotoUrl);
      }

      // Update user metadata (email, LinkedIn, status, university, experiences)
      const updates: any = {};
      if (profile.email !== user.email) {
        updates.email = profile.email;
      }

      const metadataUpdates: any = {
        ...(user.user_metadata || {}),
        linkedin_url: profile.linkedin_url,
        status: profile.status,
        university: profile.university,
        master_program: profile.master_program,
        sector: profile.sector,
        experiences: profile.experiences,
      };

      if (publicPhotoUrl) {
        metadataUpdates.photo_url = publicPhotoUrl;
      }

      updates.data = metadataUpdates;

      const { error: authError } = await supabase.auth.updateUser(updates);
      
      if (authError) throw authError;
      
      if (updates.email) {
        toast({
          title: isEnglish ? "Email updated" : "Email aggiornata",
          description: isEnglish ? "We've sent you a verification email to the new address" : "Ti abbiamo inviato un'email di verifica al nuovo indirizzo"
        });
      }

      setHasChanges(false);
      setPhotoFile(null);
      toast({
        title: isEnglish ? "Success" : "Successo",
        description: isEnglish ? "Profile updated successfully" : "Profilo aggiornato con successo"
      });
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Errore",
        description: error.message || (isEnglish ? "Unable to save profile" : "Impossibile salvare il profilo"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      company: '',
      role: '',
      sector: '',
      period: ''
    };
    setProfile({ ...profile, experiences: [...profile.experiences, newExp] });
    setHasChanges(true);
  };

  const removeExperience = (id: string) => {
    setProfile({ ...profile, experiences: profile.experiences.filter(exp => exp.id !== id) });
    setHasChanges(true);
  };

  const updateExperience = (id: string, field: keyof Experience, value: string) => {
    setProfile({
      ...profile,
      experiences: profile.experiences.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    });
    setHasChanges(true);
  };

  const handleChangePassword = async () => {
    // Validazione password
    if (passwords.new.length < 8) {
      toast({
        title: isEnglish ? "Error" : "Errore",
        description: isEnglish ? "Password must be at least 8 characters" : "La password deve essere di almeno 8 caratteri",
        variant: "destructive"
      });
      return;
    }

    if (!/[A-Z]/.test(passwords.new)) {
      toast({
        title: isEnglish ? "Error" : "Errore",
        description: isEnglish ? "Password must contain at least one uppercase letter" : "La password deve contenere almeno una maiuscola",
        variant: "destructive"
      });
      return;
    }

    if (!/[0-9]/.test(passwords.new)) {
      toast({
        title: isEnglish ? "Error" : "Errore",
        description: isEnglish ? "Password must contain at least one number" : "La password deve contenere almeno un numero",
        variant: "destructive"
      });
      return;
    }

    if (passwords.new !== passwords.confirm) {
      toast({
        title: isEnglish ? "Error" : "Errore",
        description: isEnglish ? "Passwords do not match" : "Le password non coincidono",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) throw error;

      setPasswords({ current: '', new: '', confirm: '' });
      toast({
        title: isEnglish ? "Success" : "Successo",
        description: isEnglish ? "Password updated successfully" : "Password aggiornata con successo"
      });
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Errore",
        description: error.message || (isEnglish ? "Unable to change password" : "Impossibile cambiare la password"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/app/associate")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isEnglish ? 'Back to Dashboard' : 'Torna alla Dashboard'}
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            {isEnglish ? 'Personal Profile' : 'Profilo Personale'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isEnglish ? 'Manage your personal information and security' : 'Gestisci le tue informazioni personali e sicurezza'}
          </p>
        </div>

        <div className="grid gap-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>{isEnglish ? 'Contact Information' : 'Dati di contatto'}</CardTitle>
              <CardDescription>
                {isEnglish ? 'Update your contact information' : 'Aggiorna le tue informazioni di contatto'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={photoPreview || undefined} />
                    <AvatarFallback className="text-3xl">
                      {profile.first_name?.[0]}{profile.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Label 
                    htmlFor="photo-upload" 
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                  </Label>
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">{isEnglish ? 'Name' : 'Nome'}</Label>
                  <Input
                    id="first_name"
                    value={profile.first_name}
                    onChange={(e) => {
                      setProfile({...profile, first_name: e.target.value});
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">{isEnglish ? 'Surname' : 'Cognome'}</Label>
                  <Input
                    id="last_name"
                    value={profile.last_name}
                    onChange={(e) => {
                      setProfile({...profile, last_name: e.target.value});
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">
                  <Phone className="inline h-4 w-4 mr-1" />
                  {isEnglish ? 'Phone' : 'Telefono'}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+39 333 1234567"
                  value={profile.phone}
                  onChange={(e) => {
                    setProfile({...profile, phone: e.target.value});
                    setHasChanges(true);
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {isEnglish ? 'International format with prefix' : 'Formato internazionale con prefisso'}
                </p>
              </div>

              <div>
                <Label htmlFor="email">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => {
                    setProfile({...profile, email: e.target.value});
                    setHasChanges(true);
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {isEnglish ? "You'll receive a verification email if you change address" : "Riceverai un'email di verifica se cambi indirizzo"}
                </p>
              </div>

              <div>
                <Label htmlFor="linkedin">
                  <Linkedin className="inline h-4 w-4 mr-1" />
                  LinkedIn URL
                </Label>
                <Input
                  id="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/your-profile"
                  value={profile.linkedin_url}
                  onChange={(e) => {
                    setProfile({...profile, linkedin_url: e.target.value});
                    setHasChanges(true);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Profile */}
          <Card>
            <CardHeader>
              <CardTitle>{isEnglish ? 'Professional Profile' : 'Profilo Professionale'}</CardTitle>
              <CardDescription>
                {isEnglish ? 'Tell us about your academic and professional background' : 'Raccontaci il tuo percorso accademico e professionale'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Selection */}
              <div className="space-y-3">
                <Label>{isEnglish ? 'Your Status (select all that apply)' : 'Il tuo Status (seleziona tutte le opzioni che si applicano)'}</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="university_student"
                      checked={profile.status.university_student}
                      onCheckedChange={(checked) => {
                        setProfile({...profile, status: {...profile.status, university_student: checked as boolean}});
                        setHasChanges(true);
                      }}
                    />
                    <Label htmlFor="university_student" className="font-normal cursor-pointer">
                      {isEnglish ? 'University Student' : 'Studente Universitario'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="master_student"
                      checked={profile.status.master_student}
                      onCheckedChange={(checked) => {
                        setProfile({...profile, status: {...profile.status, master_student: checked as boolean}});
                        setHasChanges(true);
                      }}
                    />
                    <Label htmlFor="master_student" className="font-normal cursor-pointer">
                      {isEnglish ? 'Master Student' : 'Studente Master'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="professional"
                      checked={profile.status.professional}
                      onCheckedChange={(checked) => {
                        setProfile({...profile, status: {...profile.status, professional: checked as boolean}});
                        setHasChanges(true);
                      }}
                    />
                    <Label htmlFor="professional" className="font-normal cursor-pointer">
                      Professional
                    </Label>
                  </div>
                </div>
              </div>

              {/* University/Master (if student) */}
              {(profile.status.university_student || profile.status.master_student) && (
                <>
                  {profile.status.university_student && (
                    <div>
                      <Label htmlFor="university">
                        <GraduationCap className="inline h-4 w-4 mr-1" />
                        {isEnglish ? 'University' : 'Università'}
                      </Label>
                      <Input
                        id="university"
                        placeholder={isEnglish ? 'e.g., Bocconi University' : 'es., Università Bocconi'}
                        value={profile.university}
                        onChange={(e) => {
                          setProfile({...profile, university: e.target.value});
                          setHasChanges(true);
                        }}
                      />
                    </div>
                  )}
                  
                  {profile.status.master_student && (
                    <div>
                      <Label htmlFor="master_program">
                        <GraduationCap className="inline h-4 w-4 mr-1" />
                        {isEnglish ? 'Master Program' : 'Programma Master'}
                      </Label>
                      <Input
                        id="master_program"
                        placeholder={isEnglish ? 'e.g., MBA, MSc Finance' : 'es., MBA, MSc Finanza'}
                        value={profile.master_program}
                        onChange={(e) => {
                          setProfile({...profile, master_program: e.target.value});
                          setHasChanges(true);
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Sector (if professional) */}
              {profile.status.professional && (
                <div>
                  <Label htmlFor="sector">
                    <Building className="inline h-4 w-4 mr-1" />
                    {isEnglish ? 'Professional Sector' : 'Settore Professionale'}
                  </Label>
                  <Input
                    id="sector"
                    placeholder={isEnglish ? 'e.g., Finance, Tech, Consulting' : 'es., Finanza, Tech, Consulenza'}
                    value={profile.sector}
                    onChange={(e) => {
                      setProfile({...profile, sector: e.target.value});
                      setHasChanges(true);
                    }}
                  />
                </div>
              )}

              {/* Experiences */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    <Briefcase className="inline h-4 w-4 mr-1" />
                    {isEnglish ? 'Professional Experiences / Internships' : 'Esperienze Professionali / Stage'}
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={addExperience}>
                    <Plus className="h-4 w-4 mr-1" />
                    {isEnglish ? 'Add' : 'Aggiungi'}
                  </Button>
                </div>

                {profile.experiences.map((exp) => (
                  <Card key={exp.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">{isEnglish ? 'Experience' : 'Esperienza'}</h4>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => removeExperience(exp.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{isEnglish ? 'Company' : 'Azienda'}</Label>
                          <Input
                            placeholder={isEnglish ? 'Company name' : 'Nome azienda'}
                            value={exp.company}
                            onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{isEnglish ? 'Role' : 'Ruolo'}</Label>
                          <Input
                            placeholder={isEnglish ? 'Position' : 'Posizione'}
                            value={exp.role}
                            onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{isEnglish ? 'Sector/Area' : 'Settore/Area'}</Label>
                          <Input
                            placeholder={isEnglish ? 'e.g., Finance, Marketing' : 'es., Finanza, Marketing'}
                            value={exp.sector}
                            onChange={(e) => updateExperience(exp.id, 'sector', e.target.value)}
                          />
                        </div>
                        {profile.status.professional && (
                          <div>
                            <Label className="text-xs">{isEnglish ? 'Period' : 'Periodo'}</Label>
                            <Input
                              placeholder={isEnglish ? 'e.g., 2020-2023' : 'es., 2020-2023'}
                              value={exp.period || ''}
                              onChange={(e) => updateExperience(exp.id, 'period', e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

                {profile.experiences.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {isEnglish ? 'No experiences added yet' : 'Nessuna esperienza aggiunta'}
                  </p>
                )}
              </div>

              <Button 
                onClick={handleSaveProfile} 
                disabled={!hasChanges || isLoading}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                {isEnglish ? 'Save Changes' : 'Salva modifiche'}
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle>{isEnglish ? 'Security' : 'Sicurezza'}</CardTitle>
              <CardDescription>
                {isEnglish ? 'Change your password' : 'Cambia la tua password'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current-password">
                  <Lock className="inline h-4 w-4 mr-1" />
                  {isEnglish ? 'Current Password' : 'Password attuale'}
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="new-password">
                  {isEnglish ? 'New Password' : 'Nuova password'}
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                />
                <div className="mt-2 space-y-1 text-xs">
                  <p className={passwords.new.length >= 8 ? "text-green-600" : "text-muted-foreground"}>
                    <CheckCircle className="inline h-3 w-3 mr-1" />
                    {isEnglish ? 'At least 8 characters' : 'Almeno 8 caratteri'}
                  </p>
                  <p className={/[A-Z]/.test(passwords.new) ? "text-green-600" : "text-muted-foreground"}>
                    <CheckCircle className="inline h-3 w-3 mr-1" />
                    {isEnglish ? 'One uppercase letter' : 'Una lettera maiuscola'}
                  </p>
                  <p className={/[0-9]/.test(passwords.new) ? "text-green-600" : "text-muted-foreground"}>
                    <CheckCircle className="inline h-3 w-3 mr-1" />
                    {isEnglish ? 'One number' : 'Un numero'}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password">
                  {isEnglish ? 'Confirm New Password' : 'Conferma nuova password'}
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                />
              </div>

              <Button 
                onClick={handleChangePassword}
                disabled={!passwords.current || !passwords.new || !passwords.confirm || isLoading}
                className="w-full"
              >
                <Lock className="mr-2 h-4 w-4" />
                {isEnglish ? 'Change Password' : 'Cambia password'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AssociateProfile;
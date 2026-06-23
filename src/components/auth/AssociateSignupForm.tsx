import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Linkedin, FileText, User, Camera, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { translations } from "./associate-signup/translations";
import { AboutFormData, Language, Certification } from "./associate-signup/types";
import AboutFormSection from "./associate-signup/AboutFormSection";

const AssociateSignupForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguage();
  
  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  // Profile presentation options
  const [useLinkedIn, setUseLinkedIn] = useState(false);
  const [useCv, setUseCv] = useState(false);
  const [useAbout, setUseAbout] = useState(false);
  
  // About form data
  const [aboutData, setAboutData] = useState<AboutFormData>({
    status: "university_student",
  });
  
  // Languages and certifications (only used when useAbout is true)
  const [languages, setLanguages] = useState<Language[]>([
    { language: "", level: "intermediate" },
  ]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  
  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const t = translations[language];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: t.fileTooLarge,
          description: t.fileTooLargeDesc,
        });
        return;
      }
      if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
        toast({
          variant: "destructive",
          title: t.invalidFormat,
          description: t.invalidFormatDesc,
        });
        return;
      }
      setCvFile(file);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: t.photoTooLarge,
          description: t.photoTooLargeDesc,
        });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({
          variant: "destructive",
          title: t.invalidPhotoFormat,
          description: t.invalidPhotoFormatDesc,
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

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!firstName.trim()) newErrors.firstName = t.firstNameRequired;
    if (!lastName.trim()) newErrors.lastName = t.lastNameRequired;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t.emailInvalid;
    }
    if (!phone.trim() || !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      newErrors.phone = t.phoneInvalid;
    }
    if (password.length < 8) newErrors.password = t.passwordMin;
    else if (!/[A-Z]/.test(password)) newErrors.password = t.passwordUppercase;
    else if (!/[0-9]/.test(password)) newErrors.password = t.passwordNumber;
    if (password !== confirmPassword) newErrors.confirmPassword = t.passwordMismatch;
    
    // At least one presentation option required
    if (!useLinkedIn && !useCv && !useAbout) {
      newErrors.profilePresentation = t.atLeastOneRequired;
    }
    
    // LinkedIn URL required if option selected
    if (useLinkedIn && (!linkedinUrl.trim() || !/^https?:\/\/.+/.test(linkedinUrl))) {
      newErrors.linkedinUrl = t.linkedinUrlInvalid;
    }
    
    // CV required if option selected
    if (useCv && !cvFile) {
      newErrors.cv = t.invalidFormat;
    }
    
    // Languages required only if About is selected
    if (useAbout) {
      const validLanguages = languages.filter(l => l.language.trim() !== "");
      if (validLanguages.length === 0) {
        newErrors.languages = t.atLeastOneLanguage;
      }
    }
    
    if (!acceptTerms) newErrors.acceptTerms = t.termsRequired;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      // Prepare metadata for user
      const validLanguages = languages.filter(l => l.language.trim() !== "");
      const validCertifications = certifications.filter(c => c.name.trim() !== "");
      
      const metadata: Record<string, any> = {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        linkedin_url: useLinkedIn ? linkedinUrl : null,
        role: 'ASSOCIATE',
        profile_presentation: {
          useLinkedIn,
          useCv,
          useAbout,
        },
      };
      
      if (useAbout) {
        metadata.about_data = aboutData;
        metadata.languages = validLanguages;
        metadata.certifications = validCertifications;
      }
      
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: metadata,
        },
      });

      if (authError) throw authError;

      let cvFileName: string | undefined;
      let photoUrl: string | undefined;

      // Upload profile photo if provided
      if (photoFile && authData.user) {
        const photoExt = photoFile.name.split('.').pop();
        const photoFileName = `${authData.user.id}/profile-${Date.now()}.${photoExt}`;
        
        const { error: photoUploadError } = await supabase.storage
          .from('profile-photos')
          .upload(photoFileName, photoFile);

        if (photoUploadError) {
          console.error('Error uploading photo:', photoUploadError);
        } else {
          const { data: photoData } = supabase.storage
            .from('profile-photos')
            .getPublicUrl(photoFileName);
          photoUrl = photoData.publicUrl;

          // Update profile with photo URL
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ photo_url: photoUrl })
            .eq('id', authData.user.id);
          
          if (profileError) console.error('Error updating profile with photo:', profileError);
        }
      }

      // Mirror the professional experiences into the dedicated column the client
      // associate selectors read (handle_new_user only stores the full about_data
      // blob), so the associate appears complete to clients right after signup.
      if (authData.user && useAbout) {
        const profExp = ((aboutData as any)?.professionalExperiences || [])
          .filter((e: any) => e && (e.company || e.role))
          .map((e: any) => ({
            company: e.company || '',
            role: e.role || '',
            sector: e.sector || '',
            period: e.duration || '',
          }));
        if (profExp.length > 0) {
          const { error: expError } = await supabase
            .from('profiles')
            .update({ professional_experiences: profExp })
            .eq('id', authData.user.id);
          if (expError) console.error('Error saving professional experiences:', expError);
        }
      }

      // Upload CV if provided
      if (cvFile && authData.user && useCv) {
        const fileExt = cvFile.name.split('.').pop();
        const fileName = `${authData.user.id}/cv-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('cv')
          .upload(fileName, cvFile);

        if (uploadError) {
          console.error('Error uploading CV:', uploadError);
        } else {
          cvFileName = cvFile.name;
          // Save document reference
          const { error: docError } = await supabase
            .from('documents')
            .insert({
              user_id: authData.user.id,
              type: 'CV',
              filename: cvFile.name,
              storage_path: fileName,
              size_bytes: cvFile.size,
              mime: cvFile.type,
            });
          
          if (docError) console.error('Error saving document:', docError);
        }
      }

      // Send registration emails
      try {
        await supabase.functions.invoke('send-associate-registration', {
          body: {
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone,
            linkedinUrl: useLinkedIn ? linkedinUrl : undefined,
            cvFileName: cvFileName,
            profilePresentation: { useLinkedIn, useCv, useAbout },
            languages: useAbout ? validLanguages : undefined,
            certifications: useAbout ? validCertifications : undefined,
            aboutData: useAbout ? aboutData : undefined,
          }
        });
      } catch (emailError) {
        console.error('Error sending registration emails:', emailError);
      }

      setIsRegistered(true);
      toast({
        title: t.registrationSuccess,
        description: t.registrationSuccessDesc,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.registrationError,
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show success message after registration
  if (isRegistered) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">{t.registrationSuccess}</h3>
          <p className="text-muted-foreground mt-2">{t.registrationSuccessDesc}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Profile Photo - Optional */}
      <div className="space-y-2">
        <Label>{t.profilePhoto}</Label>
        <p className="text-sm text-muted-foreground">{t.profilePhotoDesc}</p>
        <div className="flex items-center gap-4">
          <div className="relative">
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Profile preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-border"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/80 transition-colors"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
              id="photo-upload"
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => photoInputRef.current?.click()}
              disabled={isLoading}
            >
              <Camera className="mr-2 h-4 w-4" />
              {photoPreview ? t.changePhoto : t.selectPhoto}
            </Button>
            {photoPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemovePhoto}
                disabled={isLoading}
                className="text-destructive hover:text-destructive"
              >
                <X className="mr-2 h-4 w-4" />
                {t.removePhoto}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t.firstName}</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isLoading}
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">{t.lastName}</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isLoading}
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t.email}</Label>
        <Input
          id="email"
          type="email"
          placeholder={language === 'it' ? 'nome@esempio.com' : 'name@example.com'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">{t.phone}</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+39 123 456 7890"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isLoading}
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t.password}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Profile Presentation Options */}
      <div className="space-y-4 border border-border rounded-lg p-4">
        <div>
          <h3 className="font-semibold">{t.profilePresentation}</h3>
          <p className="text-sm text-muted-foreground">{t.profilePresentationDesc}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              useLinkedIn ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <Checkbox
              checked={useLinkedIn}
              onCheckedChange={(checked) => setUseLinkedIn(checked === true)}
              disabled={isLoading}
            />
            <Linkedin className="h-5 w-5 text-[#0A66C2]" />
            <span className="font-medium">{t.useLinkedIn}</span>
          </label>
          
          <label
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              useCv ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <Checkbox
              checked={useCv}
              onCheckedChange={(checked) => setUseCv(checked === true)}
              disabled={isLoading}
            />
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-medium">{t.useCv}</span>
          </label>
          
          <label
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              useAbout ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <Checkbox
              checked={useAbout}
              onCheckedChange={(checked) => setUseAbout(checked === true)}
              disabled={isLoading}
            />
            <User className="h-5 w-5 text-primary" />
            <span className="font-medium">{t.useAbout}</span>
          </label>
        </div>
        
        {errors.profilePresentation && (
          <p className="text-sm text-destructive">{errors.profilePresentation}</p>
        )}
      </div>

      {/* LinkedIn URL - shown when useLinkedIn is checked */}
      {useLinkedIn && (
        <div className="space-y-2">
          <Label htmlFor="linkedinUrl">{t.linkedinUrl}</Label>
          <Input
            id="linkedinUrl"
            type="url"
            placeholder="https://linkedin.com/in/your-profile"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            disabled={isLoading}
          />
          {errors.linkedinUrl && (
            <p className="text-sm text-destructive">{errors.linkedinUrl}</p>
          )}
        </div>
      )}

      {/* CV Upload - shown when useCv is checked */}
      {useCv && (
        <div className="space-y-2">
          <Label htmlFor="cv">{t.cvUpload}</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="cv"
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                disabled={isLoading}
                className="sr-only"
              />
              <Label 
                htmlFor="cv" 
                className="flex items-center justify-center px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <Upload className="mr-2 h-4 w-4" />
                {cvFile ? cvFile.name : `${t.selectFile} - ${t.noFileSelected}`}
              </Label>
            </div>
          </div>
          {errors.cv && (
            <p className="text-sm text-destructive">{errors.cv}</p>
          )}
        </div>
      )}

      {/* About Form - shown when useAbout is checked (includes Languages and Certifications) */}
      {useAbout && (
        <AboutFormSection
          language={language}
          aboutData={aboutData}
          onAboutDataChange={setAboutData}
          languages={languages}
          onLanguagesChange={setLanguages}
          certifications={certifications}
          onCertificationsChange={setCertifications}
          isLoading={isLoading}
          languagesError={errors.languages}
        />
      )}

      {/* Terms and Conditions */}
      <div className="space-y-3">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="acceptTerms"
            checked={acceptTerms}
            onCheckedChange={(checked) => setAcceptTerms(checked === true)}
            disabled={isLoading}
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="acceptTerms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t.acceptTerms}
            </label>
            <p className="text-sm text-muted-foreground">
              {language === 'it' ? (
                <>
                  {t.readTerms}
                  <Link to="/associate-terms" target="_blank" className="text-primary hover:underline">
                    {t.associateAgreement}
                  </Link>
                  {' '}{t.beforeRegistering}
                </>
              ) : (
                <>
                  {t.readTerms}{' '}
                  <Link to="/associate-terms" target="_blank" className="text-primary hover:underline">
                    {t.associateAgreement}
                  </Link>
                  {' '}{t.beforeRegistering}
                </>
              )}
            </p>
          </div>
        </div>
        {errors.acceptTerms && (
          <p className="text-sm text-destructive">{errors.acceptTerms}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t.registering}
          </>
        ) : (
          t.register
        )}
      </Button>
    </form>
  );
};

export default AssociateSignupForm;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  LogOut, Upload, Building2, Briefcase, 
  FileText, Euro, Calendar as CalendarIcon, Search, Filter, Download, MapPin 
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";

interface StudentProfile {
  first_name: string;
  last_name: string;
  photo_url: string | null;
  cv_url: string | null;
  cover_letter_url: string | null;
  preferred_sectors: string[] | null;
  preferred_company_types: string[] | null;
  preferred_locations: string[] | null;
  internship_period: string | null;
  internship_start_date: string | null;
  internship_end_date: string | null;
  compensation_preference: string | null;
  profile_visible_to_companies: boolean | null;
}

interface Company {
  id: string;
  company_name: string;
  sector: string;
  size: string;
  logo_url: string | null;
  linkedin_url: string | null;
  reference_email: string;
}

const COMPANY_TYPES = ["Startup", "Medium", "Large"];
const SECTORS = [
  "Technology", "Finance", "Healthcare", "Education", 
  "Marketing", "Consulting", "Retail", "Manufacturing"
];
const LOCATIONS = ["London", "Milan"];
export default function StudentTalentPool() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useTalentPoolLanguage();
  
  const COMPENSATION_OPTIONS = [
    { value: "PAID", label: t('studentTalentPool.compensation.paid') },
    { value: "UNPAID", label: t('studentTalentPool.compensation.unpaid') },
    { value: "BOTH", label: t('studentTalentPool.compensation.both') }
  ];
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [selectedCompanyTypes, setSelectedCompanyTypes] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkAccessAndLoadData();
  }, []);

  useEffect(() => {
    filterCompanies();
  }, [companies, selectedCompanyTypes, selectedSectors, searchQuery]);

  const checkAccessAndLoadData = async () => {
    try {
      // Check both localStorage locations for compatibility
      let userId = localStorage.getItem('talent_pool_user_id');
      if (!userId) {
        const user = localStorage.getItem('talentPoolUser');
        if (user) {
          const userData = JSON.parse(user);
          userId = userData.id;
        }
      }
      
      if (!userId) {
        navigate('/talent-pool/student');
        return;
      }

      const { data: studentData } = await supabase
        .rpc('talent_pool_get_student_profile', { _user_id: userId });

      if (!studentData || studentData.access_status !== 'UNLOCKED') {
        navigate('/talent-pool/student/dashboard');
        return;
      }

      setProfile(studentData);
      await loadCompanies(userId as string);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: t('studentTalentPool.errors.loadError'),
        description: t('studentTalentPool.errors.loadErrorDesc'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async (userId: string) => {
    const { data, error } = await supabase
      .rpc('talent_pool_get_companies_for_student', { _user_id: userId });

    if (error) {
      console.error('Error loading companies:', error);
      return;
    }

    setCompanies(data || []);
  };

  const filterCompanies = () => {
    let filtered = companies;

    if (selectedCompanyTypes.length > 0) {
      filtered = filtered.filter(c => selectedCompanyTypes.includes(c.size));
    }

    if (selectedSectors.length > 0) {
      filtered = filtered.filter(c => selectedSectors.includes(c.sector));
    }

    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.sector.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCompanies(filtered);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('studentTalentPool.errors.photoError'),
        description: t('studentTalentPool.errors.photoTypeError'),
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: t('studentTalentPool.errors.photoError'),
        description: t('studentTalentPool.errors.photoSizeError'),
        variant: "destructive"
      });
      return;
    }

    try {
      let userId = localStorage.getItem('talent_pool_user_id');
      if (!userId) {
        const user = localStorage.getItem('talentPoolUser');
        if (user) {
          const userData = JSON.parse(user);
          userId = userData.id;
        }
      }
      
      if (!userId) {
        throw new Error('User ID non trovato');
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/photo.${fileExt}`;

      // Delete old file if exists
      try {
        await supabase.storage
          .from('talent-pool-photos')
          .remove([fileName]);
      } catch (e) {
        // Ignore errors if file doesn't exist
      }

      const { data, error: uploadError } = await supabase.storage
        .from('talent-pool-photos')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('talent-pool-photos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .rpc('talent_pool_update_student_photo', {
          _user_id: userId,
          _photo_url: publicUrl
        });

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      setProfile(prev => prev ? { ...prev, photo_url: publicUrl } : null);
      toast({ 
        title: t('studentTalentPool.success.photoUploaded'),
        description: t('studentTalentPool.success.photoUploadedDesc')
      });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: t('studentTalentPool.errors.photoError'),
        description: error.message || t('studentTalentPool.errors.photoUploadError'),
        variant: "destructive"
      });
    }
  };

  const handleDocumentUpload = async (type: 'cv' | 'cover', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: t('studentTalentPool.errors.documentError'),
        description: t('studentTalentPool.errors.documentTypeError'),
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: t('studentTalentPool.errors.documentError'),
        description: t('studentTalentPool.errors.documentSizeError'),
        variant: "destructive"
      });
      return;
    }

    try {
      let userId = localStorage.getItem('talent_pool_user_id');
      if (!userId) {
        const user = localStorage.getItem('talentPoolUser');
        if (user) {
          const userData = JSON.parse(user);
          userId = userData.id;
        }
      }
      
      if (!userId) {
        throw new Error('User ID non trovato');
      }
      
      const fileExt = file.name.split('.').pop();
      const bucket = type === 'cv' ? 'talent-pool-cv' : 'talent-pool-covers';
      const fileName = `${userId}/${type}.${fileExt}`;

      // Delete old file if exists
      try {
        await supabase.storage
          .from(bucket)
          .remove([fileName]);
      } catch (e) {
        // Ignore errors if file doesn't exist
      }

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .rpc('talent_pool_update_student_documents', {
          _user_id: userId,
          _cv_url: type === 'cv' ? publicUrl : null,
          _cover_url: type === 'cover' ? publicUrl : null
        });

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      setProfile(prev => prev ? { ...prev, [type === 'cv' ? 'cv_url' : 'cover_letter_url']: publicUrl } : null);
      toast({ 
        title: t('studentTalentPool.success.documentUploaded'),
        description: type === 'cv' ? t('studentTalentPool.success.cvUploaded') : t('studentTalentPool.success.coverUploaded')
      });
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: t('studentTalentPool.errors.documentError'),
        description: error.message || t('studentTalentPool.errors.documentUploadError'),
        variant: "destructive"
      });
    }
  };

  const handleDownloadDocument = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: t('studentTalentPool.errors.downloadError'),
        description: t('studentTalentPool.errors.downloadErrorDesc'),
        variant: "destructive"
      });
    }
  };

  const handleUpdatePreferences = async () => {
    try {
      let userId = localStorage.getItem('talent_pool_user_id');
      if (!userId) {
        const user = localStorage.getItem('talentPoolUser');
        if (user) {
          const userData = JSON.parse(user);
          userId = userData.id;
        }
      }
      
      const { error } = await supabase
        .rpc('talent_pool_update_student_preferences', {
          _user_id: userId,
          _preferred_company_types: profile?.preferred_company_types || [],
          _preferred_sectors: profile?.preferred_sectors || [],
          _internship_period: profile?.internship_period || null,
          _compensation_preference: profile?.compensation_preference || 'BOTH',
          _internship_start_date: profile?.internship_start_date || null,
          _internship_end_date: profile?.internship_end_date || null,
          _preferred_locations: profile?.preferred_locations || []
        });

      if (error) throw error;

      toast({ 
        title: t('studentTalentPool.success.preferencesSaved'),
        description: t('studentTalentPool.success.preferencesSavedDesc')
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: t('studentTalentPool.errors.preferencesError'),
        description: t('studentTalentPool.errors.preferencesErrorDesc'),
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('talent_pool_user_id');
    navigate('/talent-pool');
  };

  const toggleCompanyType = (type: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      const types = prev.preferred_company_types || [];
      const newTypes = types.includes(type)
        ? types.filter(t => t !== type)
        : [...types, type];
      return { ...prev, preferred_company_types: newTypes };
    });
  };

  const toggleSector = (sector: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      const sectors = prev.preferred_sectors || [];
      const newSectors = sectors.includes(sector)
        ? sectors.filter(s => s !== sector)
        : [...sectors, sector];
      return { ...prev, preferred_sectors: newSectors };
    });
  };

  const toggleLocation = (location: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      const locations = prev.preferred_locations || [];
      const newLocations = locations.includes(location)
        ? locations.filter(l => l !== location)
        : [...locations, location];
      return { ...prev, preferred_locations: newLocations };
    });
  };

  const toggleFilterCompanyType = (type: string) => {
    setSelectedCompanyTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleFilterSector = (sector: string) => {
    setSelectedSectors(prev =>
      prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('studentTalentPool.header.title')}</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t('studentTalentPool.header.logout')}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonna Profilo */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('studentTalentPool.profile.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.photo_url || undefined} />
                  <AvatarFallback>
                    {profile.first_name?.[0]}{profile.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="h-4 w-4" />
                    {t('studentTalentPool.profile.uploadPhoto')}
                  </div>
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </Label>
              </div>

              <div>
                <p className="font-semibold text-lg text-center">
                  {profile.first_name} {profile.last_name}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('studentTalentPool.profile.preferences')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4" />
                  {t('studentTalentPool.profile.companyTypes')}
                </Label>
                <div className="space-y-2">
                  {COMPANY_TYPES.map(type => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        checked={profile.preferred_company_types?.includes(type)}
                        onCheckedChange={() => toggleCompanyType(type)}
                      />
                      <Label className="cursor-pointer">{type}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4" />
                  {t('studentTalentPool.profile.sectors')}
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {SECTORS.map(sector => (
                    <div key={sector} className="flex items-center gap-2">
                      <Checkbox
                        checked={profile.preferred_sectors?.includes(sector)}
                        onCheckedChange={() => toggleSector(sector)}
                      />
                      <Label className="cursor-pointer">{sector}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4" />
                  {t('studentTalentPool.profile.locations')}
                </Label>
                <div className="space-y-2">
                  {LOCATIONS.map(location => (
                    <div key={location} className="flex items-center gap-2">
                      <Checkbox
                        checked={profile.preferred_locations?.includes(location)}
                        onCheckedChange={() => toggleLocation(location)}
                      />
                      <Label className="cursor-pointer">{location}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4" />
                  {t('studentTalentPool.profile.period')}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !profile.internship_start_date && !profile.internship_end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {profile.internship_start_date && profile.internship_end_date ? (
                        <>
                          {format(new Date(profile.internship_start_date), "dd MMM yyyy", { locale: language === 'en' ? enUS : it })} -{" "}
                          {format(new Date(profile.internship_end_date), "dd MMM yyyy", { locale: language === 'en' ? enUS : it })}
                        </>
                      ) : (
                        <span>{t('studentTalentPool.profile.selectPeriod')}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{
                        from: profile.internship_start_date ? new Date(profile.internship_start_date) : undefined,
                        to: profile.internship_end_date ? new Date(profile.internship_end_date) : undefined,
                      }}
                      onSelect={(range) => {
                        setProfile(prev => prev ? {
                          ...prev,
                          internship_start_date: range?.from ? range.from.toISOString().split('T')[0] : null,
                          internship_end_date: range?.to ? range.to.toISOString().split('T')[0] : null
                        } : null);
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      numberOfMonths={2}
                      locale={language === 'en' ? enUS : it}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Euro className="h-4 w-4" />
                  {t('studentTalentPool.profile.compensation')}
                </Label>
                <Select
                  value={profile.compensation_preference || 'BOTH'}
                  onValueChange={(value) => setProfile(prev => prev ? { ...prev, compensation_preference: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPENSATION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleUpdatePreferences} className="w-full">
                {t('studentTalentPool.profile.saveButton')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('studentTalentPool.profile.documents')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cv-upload" className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  {t('studentTalentPool.profile.cv')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cv-upload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleDocumentUpload('cv', e)}
                  />
                  {profile.cv_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDocument(profile.cv_url!, 'CV.pdf')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {t('studentTalentPool.profile.download')}
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="cover-upload" className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  {t('studentTalentPool.profile.coverLetter')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cover-upload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleDocumentUpload('cover', e)}
                  />
                  {profile.cover_letter_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDocument(profile.cover_letter_url!, 'Cover_Letter.pdf')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {t('studentTalentPool.profile.download')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Visibility</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="profile-visible"
                  checked={profile.profile_visible_to_companies || false}
                  onCheckedChange={async (checked) => {
                    try {
                      const userId = localStorage.getItem('talent_pool_user_id') || JSON.parse(localStorage.getItem('talentPoolUser') || '{}').id;
                      
                      const { error } = await supabase
                        .from('student_profiles')
                        .update({ profile_visible_to_companies: checked as boolean })
                        .eq('user_id', userId);

                      if (error) throw error;

                      setProfile(prev => prev ? { ...prev, profile_visible_to_companies: checked as boolean } : null);
                      
                      toast({
                        title: checked ? "Profile Now Visible" : "Profile Hidden",
                        description: checked 
                          ? "Your profile is now visible to companies" 
                          : "Your profile has been hidden from companies"
                      });
                    } catch (error) {
                      console.error('Error updating visibility:', error);
                      toast({
                        title: "Error",
                        description: "Failed to update profile visibility",
                        variant: "destructive"
                      });
                    }
                  }}
                />
                <Label htmlFor="profile-visible" className="cursor-pointer">
                  Make my profile visible to companies
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                When enabled, companies will be able to see your name, photo, CV, and cover letter
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Colonna Aziende */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('studentTalentPool.companies.filters')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('studentTalentPool.companies.search')}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4" />
                  {t('studentTalentPool.companies.companySize')}
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {COMPANY_TYPES.map(type => (
                    <Badge
                      key={type}
                      variant={selectedCompanyTypes.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFilterCompanyType(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4" />
                  {t('studentTalentPool.companies.sector')}
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {SECTORS.map(sector => (
                    <Badge
                      key={sector}
                      variant={selectedSectors.includes(sector) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFilterSector(sector)}
                    >
                      {sector}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {t('studentTalentPool.companies.title')} ({filteredCompanies.length})
            </h2>
            {filteredCompanies.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t('studentTalentPool.companies.noCompanies')}
                </CardContent>
              </Card>
            ) : (
              filteredCompanies.map(company => (
                <Card key={company.id}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={company.logo_url || undefined} />
                        <AvatarFallback>{company.company_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{company.company_name}</h3>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{company.size}</Badge>
                          <Badge variant="outline">{company.sector}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {company.reference_email}
                        </p>
                        {company.linkedin_url && (
                          <Button
                            variant="link"
                            size="sm"
                            className="px-0"
                            onClick={() => window.open(company.linkedin_url!, '_blank')}
                          >
                            {t('studentTalentPool.companies.linkedinProfile')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePathwaysAuth } from '@/contexts/PathwaysAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Upload, User, Send, MapPin, Globe, FileText } from 'lucide-react';
import carloPhoto from '@/assets/carlo-marigliano.jpeg';
import careerPilotLogo from '@/assets/career-pilot-logo-support.png';

const PathwaysCatalog = () => {
  const navigate = useNavigate();
  const { user, logout } = usePathwaysAuth();
  const { language, t } = useI18n();
  const { toast } = useToast();
  
  const [providers, setProviders] = useState<any[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Profile editing
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    school: user?.school || '',
  });
  
  // Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  const interestCategories = [
    { id: 'volunteer_social', label: language === 'it' ? 'Sociale' : 'Social', parent: 'volunteering' },
    { id: 'volunteer_educational', label: language === 'it' ? 'Educativo' : 'Educational', parent: 'volunteering' },
    { id: 'volunteer_environmental', label: language === 'it' ? 'Ambientale' : 'Environmental', parent: 'volunteering' },
    { id: 'volunteer_health', label: language === 'it' ? 'Sanitario' : 'Health', parent: 'volunteering' },
    { id: 'volunteer_animals', label: language === 'it' ? 'Animali' : 'Animals', parent: 'volunteering' },
    { id: 'volunteer_cultural', label: language === 'it' ? 'Culturale' : 'Cultural', parent: 'volunteering' },
    { id: 'italian', label: language === 'it' ? 'Italiano' : 'Italian', parent: 'languages' },
    { id: 'english', label: language === 'it' ? 'Inglese' : 'English', parent: 'languages' },
    { id: 'french', label: language === 'it' ? 'Francese' : 'French', parent: 'languages' },
    { id: 'spanish', label: language === 'it' ? 'Spagnolo' : 'Spanish', parent: 'languages' },
    { id: 'german', label: language === 'it' ? 'Tedesco' : 'German', parent: 'languages' },
    { id: 'chinese', label: language === 'it' ? 'Cinese' : 'Chinese', parent: 'languages' },
    { id: 'russian', label: language === 'it' ? 'Russo' : 'Russian', parent: 'languages' },
    { id: 'public_speaking', label: 'Public Speaking' },
    { id: 'exchange', label: 'Exchange' },
  ];

  useEffect(() => {
    if (!user) {
      navigate('/platforms/pathways');
      return;
    }
    if (user.status !== 'active') {
      navigate('/platforms/pathways/account');
      return;
    }
    loadProviders();
    loadProfilePhoto();
  }, [user, navigate]);
  
  const loadProfilePhoto = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pathways_users')
      .select('photo_url')
      .eq('id', user.id)
      .single();
    
    if (data?.photo_url) {
      setPhotoUrl(data.photo_url);
    }
  };

  const loadProviders = async () => {
    const { data, error } = await supabase
      .from('pathways_providers')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: error.message,
      });
      return;
    }

    setProviders(data || []);
    setFilteredProviders(data || []);
  };

  useEffect(() => {
    let filtered = providers;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search) ||
        p.subcategory?.toLowerCase().includes(search) ||
        p.city?.toLowerCase().includes(search) ||
        p.country?.toLowerCase().includes(search) ||
        p.requirements?.toLowerCase().includes(search)
      );
    }
    
    // Filter by interests
    if (selectedInterests.length > 0) {
      filtered = filtered.filter(p => {
        const subcatLower = p.subcategory?.toLowerCase() || '';
        const descLower = p.description?.toLowerCase() || '';
        return selectedInterests.some(interest => {
          const interestLabel = interestCategories.find(cat => cat.id === interest)?.label.toLowerCase() || '';
          return subcatLower.includes(interestLabel) || descLower.includes(interestLabel);
        });
      });
    }

    setFilteredProviders(filtered);
  }, [providers, selectedCategory, searchTerm, selectedInterests]);
  
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploadingPhoto(true);
    
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/profile.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('talent-pool-photos')
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: uploadError.message,
      });
      setUploadingPhoto(false);
      return;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('talent-pool-photos')
      .getPublicUrl(filePath);
    
    await supabase
      .from('pathways_users')
      .update({ photo_url: publicUrl })
      .eq('id', user.id);
    
    setPhotoUrl(publicUrl);
    setUploadingPhoto(false);
    toast({
      title: language === 'it' ? 'Foto caricata' : 'Photo uploaded',
    });
  };
  
  const handleUpdateProfile = async () => {
    if (!user) return;
    
    const { error } = await supabase
      .from('pathways_users')
      .update({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
        email: profileData.email,
        school: profileData.school,
      })
      .eq('id', user.id);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: error.message,
      });
      return;
    }
    
    toast({
      title: language === 'it' ? 'Profilo aggiornato' : 'Profile updated',
    });
    setIsEditingProfile(false);
    window.location.reload();
  };
  
  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const school = formData.get('school') as string;
    const phone = formData.get('phone') as string;
    const motivation = formData.get('motivation') as string;
    const period_from = formData.get('period_from') as string;
    const period_to = formData.get('period_to') as string;

    if (motivation.length < 200) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: language === 'it' ? 'La motivazione deve contenere almeno 200 caratteri' : 'Motivation must be at least 200 characters',
      });
      setLoading(false);
      return;
    }

    const { error: appError } = await supabase.from('pathways_applications').insert({
      user_id: user!.id,
      provider_id: selectedProvider.id,
      organization_name: selectedProvider.name, // Store organization name
      category: selectedProvider.category,
      subcategory: selectedProvider.subcategory,
      school,
      phone,
      motivation,
      period_from,
      period_to,
      status: 'submitted',
      language: language,
      created_via: 'opportunities_catalog_apply_button',
    });

    if (appError) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: appError.message,
      });
      setLoading(false);
      return;
    }

    // Send email to student
    await supabase.functions.invoke('send-pathways-application', {
      body: {
        studentName: `${user!.first_name} ${user!.last_name}`,
        studentEmail: user!.email,
        providerName: selectedProvider.name,
        category: selectedProvider.category,
        subcategory: selectedProvider.subcategory,
        school,
        phone,
        motivation,
        periodFrom: period_from,
        periodTo: period_to,
      },
    });

    // Send email to admin
    await supabase.functions.invoke('send-pathways-message', {
      body: {
        to: 'careerpilot2025@gmail.com',
        studentName: `${user!.first_name} ${user!.last_name}`,
        studentEmail: user!.email,
        message: `New application from ${user!.first_name} ${user!.last_name} to ${selectedProvider.name}\n\nPeriod: ${period_from} → ${period_to}\nCategory: ${selectedProvider.category}\nSchool: ${school}\n\nMotivation:\n${motivation}`,
        type: 'student_to_admin',
      },
    });

    setLoading(false);
    setSelectedProvider(null);
    toast({
      title: language === 'it' ? 'Candidatura inviata' : 'Application submitted',
      description: language === 'it' ? 'Riceverai una conferma via email' : 'You will receive confirmation via email',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      {/* Header with Logout */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/platforms/pathways/account')}
            >
              ← {language === 'it' ? 'Account' : 'Account'}
            </Button>
            <div className="h-6 w-px bg-border" />
            <Button 
              variant="default" 
              size="sm"
              className="bg-primary hover:bg-primary/90 font-semibold shadow-md"
              onClick={() => navigate('/platforms/pathways/student/dashboard')}
            >
              <FileText className="mr-2 h-4 w-4" />
              {language === 'it' ? 'La Mia Dashboard' : 'My Dashboard'}
            </Button>
            <div className="h-6 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              {user?.first_name} {user?.last_name}
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              logout();
              navigate('/platforms/pathways');
            }}
          >
            {language === 'it' ? 'Esci' : 'Logout'}
          </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Profile & Interests */}
          <div className="lg:col-span-1 space-y-4">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{language === 'it' ? 'Profilo Personale' : 'Personal Profile'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={photoUrl || undefined} />
                    <AvatarFallback>
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                    <Button variant="outline" size="sm" disabled={uploadingPhoto} asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        {uploadingPhoto ? (language === 'it' ? 'Caricamento...' : 'Uploading...') : (language === 'it' ? 'Carica foto' : 'Upload photo')}
                      </span>
                    </Button>
                  </label>
                </div>
                
                {!isEditingProfile ? (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold">{language === 'it' ? 'Nome:' : 'Name:'}</span>
                      <p>{user?.first_name} {user?.last_name}</p>
                    </div>
                    <div>
                      <span className="font-semibold">{language === 'it' ? 'Email:' : 'Email:'}</span>
                      <p>{user?.email}</p>
                    </div>
                    <div>
                      <span className="font-semibold">{language === 'it' ? 'Telefono:' : 'Phone:'}</span>
                      <p>{user?.phone}</p>
                    </div>
                    <div>
                      <span className="font-semibold">{language === 'it' ? 'Scuola:' : 'School:'}</span>
                      <p>{user?.school}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      {language === 'it' ? 'Modifica' : 'Edit'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="first_name">{language === 'it' ? 'Nome' : 'First Name'}</Label>
                      <Input
                        id="first_name"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">{language === 'it' ? 'Cognome' : 'Last Name'}</Label>
                      <Input
                        id="last_name"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">{language === 'it' ? 'Telefono' : 'Phone'}</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="school">{language === 'it' ? 'Scuola' : 'School'}</Label>
                      <Input
                        id="school"
                        value={profileData.school}
                        onChange={(e) => setProfileData({ ...profileData, school: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateProfile} className="flex-1">
                        {language === 'it' ? 'Salva' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditingProfile(false)} className="flex-1">
                        {language === 'it' ? 'Annulla' : 'Cancel'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interests Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{language === 'it' ? 'Interessi ed Esperienze' : 'Interests & Experiences'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{language === 'it' ? 'Volontariato' : 'Volunteering'}</h4>
                    <div className="flex flex-wrap gap-2">
                      {interestCategories.filter(cat => cat.parent === 'volunteering').map(cat => (
                        <Badge
                          key={cat.id}
                          variant={selectedInterests.includes(cat.id) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleInterest(cat.id)}
                        >
                          {cat.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{language === 'it' ? 'Lingue' : 'Languages'}</h4>
                    <div className="flex flex-wrap gap-2">
                      {interestCategories.filter(cat => cat.parent === 'languages').map(cat => (
                        <Badge
                          key={cat.id}
                          variant={selectedInterests.includes(cat.id) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleInterest(cat.id)}
                        >
                          {cat.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{language === 'it' ? 'Altro' : 'Other'}</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={selectedInterests.includes('public_speaking') ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleInterest('public_speaking')}
                      >
                        Public Speaking
                      </Badge>
                      <Badge
                        variant={selectedInterests.includes('exchange') ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleInterest('exchange')}
                      >
                        Exchange
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support Section */}
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {language === 'it' ? 'Hai bisogno di aiuto?' : 'Need Assistance?'}
                </h3>
                
                <div className="flex items-center gap-3">
                  <img 
                    src={careerPilotLogo} 
                    alt="CareerPilot Logo" 
                    className="w-[38px] h-[38px] rounded-lg object-cover flex-shrink-0 max-[480px]:w-[34px] max-[480px]:h-[34px]"
                  />
                  <a 
                    href="https://wa.me/447826932893" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    +44 7826932893
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <img 
                    src={carloPhoto} 
                    alt="Carlo Marigliano" 
                    className="w-[38px] h-[38px] rounded-lg object-cover flex-shrink-0 max-[480px]:w-[34px] max-[480px]:h-[34px]"
                  />
                  <a 
                    href="mailto:carlomariglianoo5@gmail.com"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    carlomariglianoo5@gmail.com
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Search & Providers */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('pathways.catalog')}</h1>
              <p className="text-muted-foreground mb-6">{language === 'it' ? 'Esplora le opportunità disponibili' : 'Explore available opportunities'}</p>
              
              {/* Smart Search Bar */}
              <div className="mb-6">
                <Input
                  placeholder={language === 'it' ? 'Cerca esperienze... (es. "corso intensivo di inglese")' : 'Search experiences... (e.g. "intensive English course")'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-lg py-6"
                />
                {searchTerm && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {filteredProviders.length} {language === 'it' ? 'risultati trovati' : 'results found'}
                  </p>
                )}
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex gap-2 flex-wrap mb-6">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                {language === 'it' ? 'Tutti' : 'All'}
              </Button>
              <Button
                variant={selectedCategory === 'VOLUNTEERING' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('VOLUNTEERING')}
              >
                {language === 'it' ? 'Volontariato' : 'Volunteering'}
              </Button>
              <Button
                variant={selectedCategory === 'LANGUAGE_COURSE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('LANGUAGE_COURSE')}
              >
                {language === 'it' ? 'Corsi di Lingua' : 'Language Courses'}
              </Button>
              <Button
                variant={selectedCategory === 'public_speaking' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('public_speaking')}
              >
                Public Speaking
              </Button>
              <Button
                variant={selectedCategory === 'exchange' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('exchange')}
              >
                {language === 'it' ? 'Exchange' : 'Exchanges'}
              </Button>
            </div>

            {/* Providers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProviders.map((provider) => (
                <Card 
                  key={provider.id} 
                  className="hover:shadow-lg transition-shadow overflow-hidden cursor-pointer flex flex-col h-[280px]"
                  onClick={() => setSelectedProvider(provider)}
                  data-name={provider.name}
                  data-description={provider.description}
                  data-website={provider.website_url}
                  data-city={provider.city}
                  data-country={provider.country}
                >
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl mb-1 break-words line-clamp-2">{provider.name}</CardTitle>
                        <div className="flex gap-2 flex-wrap text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{provider.city}, {provider.country}</span>
                          </span>
                          {provider.is_online && (
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <Globe className="h-3 w-3" />
                              Online
                            </span>
                          )}
                        </div>
                        <Badge variant="secondary" className="truncate max-w-full">{provider.subcategory}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden">
                    <p className="text-sm text-muted-foreground line-clamp-4 mb-4 break-words flex-1 overflow-hidden">
                      {provider.description}
                    </p>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProvider(provider);
                      }}
                      size="sm"
                      className="w-full mt-auto"
                    >
                      {language === 'it' ? 'Candidati' : 'Apply'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Application Dialog */}
      <Dialog open={!!selectedProvider} onOpenChange={(open) => !open && setSelectedProvider(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProvider?.name}</DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <div className="text-base text-foreground whitespace-pre-wrap">
                {selectedProvider?.description}
              </div>
              {selectedProvider?.website_url && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4" />
                  <strong>{language === 'it' ? 'Sito web:' : 'Website:'}</strong>
                  <a 
                    href={selectedProvider.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {selectedProvider.website_url}
                  </a>
                </div>
              )}
              {(selectedProvider?.city || selectedProvider?.country) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  <strong>{language === 'it' ? 'Località:' : 'Location:'}</strong>
                  <span>{selectedProvider.city}{selectedProvider.city && selectedProvider.country ? ', ' : ''}{selectedProvider.country}</span>
                </div>
              )}
              {selectedProvider?.requirements && (
                <div className="text-sm">
                  <strong>{language === 'it' ? 'Requisiti:' : 'Requirements:'}</strong>
                  <p className="mt-1 text-muted-foreground">{selectedProvider.requirements}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <Label htmlFor="school">{language === 'it' ? 'Scuola/Università' : 'School/University'}</Label>
              <Input id="school" name="school" defaultValue={user?.school} required />
            </div>
            <div>
              <Label htmlFor="phone">{language === 'it' ? 'Telefono' : 'Phone'}</Label>
              <Input id="phone" name="phone" defaultValue={user?.phone} required />
            </div>
            <div>
              <Label htmlFor="period_from">{language === 'it' ? 'Data inizio' : 'Start date'}</Label>
              <Input id="period_from" name="period_from" type="date" required />
            </div>
            <div>
              <Label htmlFor="period_to">{language === 'it' ? 'Data fine' : 'End date'}</Label>
              <Input id="period_to" name="period_to" type="date" required />
            </div>
            <div>
              <Label htmlFor="motivation">{language === 'it' ? 'Motivazione (min 200 caratteri)' : 'Motivation (min 200 characters)'}</Label>
              <Textarea 
                id="motivation" 
                name="motivation" 
                rows={6} 
                required 
                placeholder={language === 'it' ? 'Spiega perché vuoi partecipare a questa esperienza...' : 'Explain why you want to participate in this experience...'}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              {loading ? (language === 'it' ? 'Invio...' : 'Sending...') : (language === 'it' ? 'Invia candidatura' : 'Submit application')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PathwaysCatalog;

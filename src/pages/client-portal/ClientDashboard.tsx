import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, ShoppingCart, ArrowLeft, Plane, ShoppingBag, Star, User, FolderOpen, BookOpen } from "lucide-react";
import bgImage from "@/assets/client-portal-bg.jpeg";
import ClientProfile from "@/components/client-portal/ClientProfile";
import ClientCart from "@/components/client-portal/ClientCart";
import ClientFeedback from "@/components/client-portal/ClientFeedback";
import ClientDocumentsSection from "@/components/client-portal/ClientDocumentsSection";
import MyProjectsSection from "@/components/client-portal/MyProjectsSection";
import BookMoreServices from "@/components/client-portal/BookMoreServices";
import UsefulContacts from "@/components/client-portal/UsefulContacts";
import KnowledgeBaseSection from "@/components/client-portal/KnowledgeBaseSection";

const sb = supabase as any;

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [clientUser, setClientUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('client_user');
    if (!user) {
      navigate('/client-portal/auth');
      return;
    }
    setClientUser(JSON.parse(user));
  }, [navigate]);

  useEffect(() => {
    if (clientUser) {
      fetchCartCount();
    }
  }, [clientUser]);

  const fetchCartCount = async () => {
    try {
      const { count } = await sb
        .from('client_cart')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientUser.id);
      setCartCount(count || 0);
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('client_user');
    navigate('/client-portal/auth');
  };

  if (!clientUser) {
    return null;
  }

  return (
    <div 
      className="min-h-screen p-4 md:p-8 relative"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />
      
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 backdrop-blur-sm bg-background/80 p-4 rounded-lg shadow-lg">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Plane className="h-6 w-6 text-primary" />
              My Flight Plan
            </h1>
            <p className="text-muted-foreground">Welcome back, {clientUser.first_name}!</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Cart Icon */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Your Cart</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <ClientCart 
                    clientId={clientUser.id} 
                    clientName={`${clientUser.first_name} ${clientUser.last_name}`}
                    onCartUpdate={fetchCartCount} 
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Back to Main Website */}
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Main Website
            </Button>

            {/* Logout */}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Useful Contacts - Always visible */}
        <UsefulContacts />

        {/* Main Content */}
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 backdrop-blur-sm bg-background/90">
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <Plane className="h-4 w-4" />
              <span className="hidden sm:inline">My Projects</span>
              <span className="sm:hidden">Projects</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Book More</span>
              <span className="sm:hidden">Book</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="knowledgebase" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Knowledge Base</span>
              <span className="sm:hidden">KB</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>Feedback</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <MyProjectsSection 
              clientId={clientUser.id} 
              clientName={`${clientUser.first_name} ${clientUser.last_name}`}
            />
          </TabsContent>

          <TabsContent value="services">
            <BookMoreServices 
              clientId={clientUser.id}
              clientName={`${clientUser.first_name} ${clientUser.last_name}`}
              onCartUpdate={fetchCartCount}
            />
          </TabsContent>

          <TabsContent value="documents">
            <ClientDocumentsSection 
              clientId={clientUser.id}
              clientName={`${clientUser.first_name} ${clientUser.last_name}`}
            />
          </TabsContent>

          <TabsContent value="knowledgebase">
            <KnowledgeBaseSection clientId={clientUser.id} />
          </TabsContent>

          <TabsContent value="feedback">
            <ClientFeedback clientId={clientUser.id} />
          </TabsContent>

          <TabsContent value="profile">
            <ClientProfile clientUser={clientUser} setClientUser={setClientUser} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientDashboard;

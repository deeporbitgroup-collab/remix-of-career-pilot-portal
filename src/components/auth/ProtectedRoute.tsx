import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  role: 'ASSOCIATE' | 'PARTNER' | 'ADMIN';
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
        const associateCanEnter = role === 'ASSOCIATE' && profile.role === 'ASSOCIATE' && profile.status !== 'rejected';
        const approvedUserCanEnter = profile.role === role && profile.status === 'approved';

        if (associateCanEnter || approvedUserCanEnter) {
          setIsAuthorized(true);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthorized(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    // If user has a role but trying to access wrong dashboard, redirect to their dashboard
    if (userRole) {
      switch(userRole) {
        case 'ASSOCIATE':
          return <Navigate to="/app/associate" replace />;
        case 'PARTNER':
          return <Navigate to="/app/partner" replace />;
        case 'ADMIN':
          return <Navigate to="/app/admin" replace />;
      }
    }
    // Otherwise redirect to auth
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
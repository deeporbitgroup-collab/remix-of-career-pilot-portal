import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { ForgotPasswordDialog } from "./ForgotPasswordDialog";

const getLoginSchema = (language: 'it' | 'en') => z.object({
  email: z.string().email(language === 'it' ? "Email non valida" : "Invalid email"),
  password: z.string().min(1, language === 'it' ? "Password richiesta" : "Password required"),
});

type LoginFormData = z.infer<ReturnType<typeof getLoginSchema>>;

interface LoginFormProps {
  role: 'ASSOCIATE' | 'PARTNER' | 'ADMIN';
}

const LoginForm = ({ role }: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  const loginSchema = getLoginSchema(language);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password.trim(),
      });

      if (authError) throw authError;

      // Check user role and status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      // Admin can log in from any tab — redirect to admin dashboard
      if (profile.role === 'ADMIN') {
        toast({
          title: language === 'it' ? "Accesso effettuato" : "Login successful",
          description: language === 'it' ? "Benvenuto nel Crew Portal" : "Welcome to Crew Portal",
        });
        navigate('/app/admin');
        return;
      }

      // Verify role matches for non-admin users
      if (profile.role !== role) {
        await supabase.auth.signOut();
        throw new Error(language === 'it' ? 'Accesso non autorizzato per questo ruolo' : 'Unauthorized access for this role');
      }

      // Associates can log in immediately after registration (no admin approval required)
      // Other roles still require approval
      if (role !== 'ASSOCIATE' && profile.status !== 'approved') {
        await supabase.auth.signOut();

        if (profile.status === 'pending') {
          throw new Error(language === 'it' ? 'Il tuo account è in attesa di approvazione' : 'Your account is pending approval');
        } else if (profile.status === 'rejected') {
          throw new Error(language === 'it' ? 'Il tuo account non è stato approvato' : 'Your account was not approved');
        }
      }

      // Block rejected associates from logging in
      if (role === 'ASSOCIATE' && profile.status === 'rejected') {
        await supabase.auth.signOut();
        throw new Error(language === 'it' ? 'Il tuo account non è stato approvato' : 'Your account was not approved');
      }

      toast({
        title: language === 'it' ? "Accesso effettuato" : "Login successful",
        description: language === 'it' ? "Benvenuto nel Crew Portal" : "Welcome to Crew Portal",
      });

      // Navigate to appropriate dashboard
      switch (role) {
        case 'ASSOCIATE':
          navigate('/app/associate');
          break;
        case 'PARTNER':
          navigate('/app/partner');
          break;
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: language === 'it' ? "Errore di accesso" : "Login error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder={language === 'it' ? "nome@esempio.com" : "name@example.com"}
          {...register("email")}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <ForgotPasswordDialog />
        </div>
        <Input
          id="password"
          type="password"
          {...register("password")}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {language === 'it' ? 'Accesso in corso...' : 'Logging in...'}
          </>
        ) : (
          language === 'it' ? 'Accedi' : 'Login'
        )}
      </Button>
    </form>
  );
};

export default LoginForm;
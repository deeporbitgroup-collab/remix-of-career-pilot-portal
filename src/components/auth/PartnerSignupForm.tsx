import { useState } from "react";
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

const signupSchema = z.object({
  companyName: z.string().min(1, "Company name required"),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
  password: z.string()
    .min(8, "Password must contain at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

const PartnerSignupForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { language } = useLanguage();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            company_name: data.companyName,
            phone: data.phone,
            role: 'PARTNER',
          },
        },
      });

      if (authError) throw authError;

      // Welcome the partner + notify admin (non-blocking: never fail the signup).
      try {
        await supabase.functions.invoke('send-partner-registration', {
          body: {
            companyName: data.companyName,
            email: data.email,
            phone: data.phone,
          },
        });
      } catch (emailError) {
        console.error('Partner registration email failed (non-fatal):', emailError);
      }

      toast({
        title: language === 'it' ? "Registrazione completata!" : "Registration successful!",
        description: language === 'it'
          ? "Controlla la tua email per verificare l'account. Il nostro team provvederà ad abilitare il tuo accesso entro le successive 12 ore."
          : "Please check your email to verify your account. Our team will enable your access within the next 12 hours.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="companyName">{language === 'it' ? 'Ragione Sociale / Nome Azienda' : 'Company Name'}</Label>
        <Input
          id="companyName"
          {...register("companyName")}
          disabled={isLoading}
        />
        {errors.companyName && (
          <p className="text-sm text-destructive">{errors.companyName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{language === 'it' ? 'Email Aziendale' : 'Company Email'}</Label>
        <Input
          id="email"
          type="email"
          placeholder={language === 'it' ? 'info@azienda.com' : 'info@company.com'}
          {...register("email")}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">{language === 'it' ? 'Telefono WhatsApp' : 'WhatsApp Phone Number'}</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+39 123 456 7890"
          {...register("phone")}
          disabled={isLoading}
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
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

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{language === 'it' ? 'Conferma Password' : 'Confirm Password'}</Label>
        <Input
          id="confirmPassword"
          type="password"
          {...register("confirmPassword")}
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {language === 'it' ? 'Registrazione in corso...' : 'Registering...'}
          </>
        ) : (
          language === 'it' ? 'Registra Azienda' : 'Register Company'
        )}
      </Button>
    </form>
  );
};

export default PartnerSignupForm;